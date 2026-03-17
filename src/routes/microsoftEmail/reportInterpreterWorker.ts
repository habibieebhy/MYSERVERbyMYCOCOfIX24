import { and, eq } from "drizzle-orm";
import { db } from "../../db/db";
import {
  emailReports,
  verifiedDealers,
  collectionReports,
  outstandingReports,
  projectionReports,
} from "../../db/schema";

type RawPayload = any;

export class ReportInterpreterWorker {
  // Configurable chunk size for large payload inserts to avoid blowing up memory
  private readonly CHUNK_SIZE = 1000;

  /* =========================================================
     PUBLIC ENTRY
  ========================================================= */
  async runOnce() {
    console.log("[Interpreter] Starting interpretation cycle...");

    // 1. Preload Dealer Map for instant identity resolution
    const dealerRows = await db
      .select({
        id: verifiedDealers.id,
        partyName: verifiedDealers.dealerPartyName,
        dealerCode: verifiedDealers.dealerCode,
      })
      .from(verifiedDealers);

    const dealerMap = new Map<string, number>();

    for (const d of dealerRows) {
      if (d.partyName) dealerMap.set(this.normalizeName(d.partyName), d.id);
      if (d.dealerCode) dealerMap.set(this.normalizeName(d.dealerCode), d.id);
    }

    // 2. Fetch Unprocessed, Latest Reports
    const reports = await db
      .select()
      .from(emailReports)
      .where(
        and(
          eq(emailReports.processingStage, "INGESTED"),
          eq(emailReports.isLatestVersion, true)
        )
      );

    if (!reports.length) {
      console.log("[Interpreter] No new reports to process.");
      return;
    }

    for (const report of reports) {
      try {
        const payload = report.payload as RawPayload;
        const fileName = report.fileName?.toLowerCase() ?? "";

        // 3. Determine Report Type based on filename conventions
        let reportType: "OUTSTANDING" | "COLLECTION" | "PROJECTION";
        if (fileName.includes("outstanding")) reportType = "OUTSTANDING";
        else if (fileName.includes("collection")) reportType = "COLLECTION";
        else if (fileName.includes("projection")) reportType = "PROJECTION";
        else throw new Error("Unknown report type format");

        // 4. Idempotency Protection: Ensure we haven't already extracted this specific report ID
        const alreadyProcessed = await this.checkIdempotency(report.id, reportType);
        if (alreadyProcessed) {
          await db.update(emailReports)
            .set({ processingStage: "INTERPRETED" })
            .where(eq(emailReports.id, report.id));
          console.log(`[Interpreter] Skipped duplicate report ${report.id}`);
          continue;
        }

        // 5. Wrap in a DB Transaction (All rows insert, or none do)
        await db.transaction(async (tx) => {
          if (reportType === "OUTSTANDING") {
            await this.parseOutstanding(report, payload, dealerMap, tx);
          } else if (reportType === "COLLECTION") {
            await this.parseCollection(report, payload, dealerMap, tx);
          } else if (reportType === "PROJECTION") {
            await this.parseProjection(report, payload, dealerMap, tx);
          }

          // Mark Success inside transaction so state changes only if data successfully saves
          await tx.update(emailReports)
            .set({ processingStage: "INTERPRETED" })
            .where(eq(emailReports.id, report.id));
        });

        console.log(`[Interpreter] Successfully processed ${reportType} report ${report.id}`);
      } catch (err) {
        console.error(`[Interpreter] Failed report ${report.id}`, err);
        // Mark Failure outside the rolled-back transaction so we don't infinitely retry broken files
        await db.update(emailReports)
          .set({ processingStage: "FAILED" })
          .where(eq(emailReports.id, report.id));
      }
    }
  }

  /* =========================================================
     HELPERS: IDENTITY & VALIDATION
  ========================================================= */
  private normalizeName(name: string): string {
    if (!name) return "";
    return name.toUpperCase().replace(/^M\/S\.?\s*/, "").replace(/[^A-Z0-9]/g, "");
  }

  private resolveDealerId(name: string, dealerMap: Map<string, number>): number | null {
    if (!name) return null;
    return dealerMap.get(this.normalizeName(name)) ?? null;
  }

  // 🚨 FIX: PHANTOM DATES & EXCEL SERIAL NUMBER TRAP 🚨
  private safeDate(value: any): string | null {
    if (!value) return null;

    let parsed: Date;

    if (value instanceof Date) {
      parsed = value;
    } else if (typeof value === "number") {
      // Excel stores dates as days since Jan 1, 1900.
      // 25569 is the offset to Unix Epoch (Jan 1, 1970).
      parsed = new Date(Math.round((value - 25569) * 86400 * 1000));
    } else {
      parsed = new Date(value);
    }

    if (isNaN(parsed.getTime())) return null;

    // Return strict YYYY-MM-DD to ensure PostgreSQL accepts it safely regardless of timezone
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private async checkIdempotency(reportId: string, type: string): Promise<boolean> {
    let result;
    if (type === "COLLECTION") {
      result = await db.select({ id: collectionReports.id }).from(collectionReports).where(eq(collectionReports.emailReportId, reportId)).limit(1);
    } else if (type === "OUTSTANDING") {
      result = await db.select({ id: outstandingReports.id }).from(outstandingReports).where(eq(outstandingReports.emailReportId, reportId)).limit(1);
    } else {
      result = await db.select({ id: projectionReports.id }).from(projectionReports).where(eq(projectionReports.emailReportId, reportId)).limit(1);
    }
    return result.length > 0;
  }

  private validateSheet(payload: RawPayload) {
    if (!payload?.workbook?.sheets?.length) throw new Error("No sheets found");
    const sheet = payload.workbook.sheets[0];
    if (!sheet?.rows?.length) throw new Error("Sheet has no rows");
    return sheet.rows;
  }

  /* =========================================================
     PARSERS: FACT EXTRACTION
  ========================================================= */
  private async parseOutstanding(report: any, payload: RawPayload, dealerMap: Map<string, number>, tx: any) {
    const rows = this.validateSheet(payload);
    
    // Scan dynamically for header row to avoid hardcoded row indexes
    const headerRowIndex = rows.findIndex((r: any) =>
      String(r.values?.join(" ")).toLowerCase().includes("pending")
    );
    if (headerRowIndex === -1) throw new Error("Header row not found in Outstanding report");

    const inserts: any[] = [];
    // The cycleDate for outstanding is usually parsed globally from the file/subject by Worker 1
    const reportDate = report.cycleDate ? this.safeDate(report.cycleDate) : null;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i].values;
      if (!row || row.length < 5) continue;

      const dealerName = String(row[1] ?? "").trim();
      if (!dealerName) continue;

      const verifiedDealerId = this.resolveDealerId(dealerName, dealerMap);

      inserts.push({
        emailReportId: report.id,
        institution: report.institution ?? "UNKNOWN",
        reportDate,
        tempDealerName: dealerName,
        // Drizzle numeric types safely ingest strings, preventing float precision loss
        securityDepositAmt: row[2] ? String(row[2]) : null,
        pendingAmt: row[3] ? String(row[3]) : null,
        lessThan10Days: row[4] ? String(row[4]) : null,
        days10To15: row[5] ? String(row[5]) : null,
        days15To21: row[6] ? String(row[6]) : null,
        days21To30: row[7] ? String(row[7]) : null,
        days30To45: row[8] ? String(row[8]) : null,
        days45To60: row[9] ? String(row[9]) : null,
        days60To75: row[10] ? String(row[10]) : null,
        days75To90: row[11] ? String(row[11]) : null,
        greaterThan90Days: row[12] ? String(row[12]) : null,
        isOverdue: Number(row[12] ?? 0) > 0, // Quick flag. Full strict logic is in IntelligenceWorker
        isAccountJsbJud: report.institution === "JSB" || report.institution === "JUD",
        verifiedDealerId,
      });
    }

    // Chunk Inserts to prevent exhausting Postgres parameter limits
    for (let i = 0; i < inserts.length; i += this.CHUNK_SIZE) {
      await tx.insert(outstandingReports).values(inserts.slice(i, i + this.CHUNK_SIZE)).onConflictDoNothing();
    }
  }

  private async parseCollection(report: any, payload: RawPayload, dealerMap: Map<string, number>, tx: any) {
    const rows = this.validateSheet(payload);
    
    const headerRowIndex = rows.findIndex((r: any) =>
      String(r.values?.join(" ")).toLowerCase().includes("voucher")
    );
    if (headerRowIndex === -1) throw new Error("Header row not found in Collection report");

    const inserts: any[] = [];

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i].values;
      if (!row || row.length < 4) continue;

      const voucherNo = String(row[0] ?? "").trim();
      const dealerName = String(row[1] ?? "").trim();
      const voucherDate = this.safeDate(row[2]);

      // 🚨 FIX: If date is unparseable or missing, schema will crash (notNull constraint). Skip cleanly.
      if (!dealerName || !voucherNo || !voucherDate) continue;

      const verifiedDealerId = this.resolveDealerId(dealerName, dealerMap);

      inserts.push({
        emailReportId: report.id,
        institution: report.institution ?? "UNKNOWN",
        voucherNo,
        voucherDate,
        amount: String(row[3] ?? 0),
        partyName: dealerName,
        sourceMessageId: report.messageId,
        sourceFileName: report.fileName,
        verifiedDealerId,
      });
    }

    for (let i = 0; i < inserts.length; i += this.CHUNK_SIZE) {
      await tx.insert(collectionReports).values(inserts.slice(i, i + this.CHUNK_SIZE)).onConflictDoNothing();
    }
  }

  private async parseProjection(report: any, payload: RawPayload, dealerMap: Map<string, number>, tx: any) {
    const rows = this.validateSheet(payload);
    
    const headerRowIndex = rows.findIndex((r: any) =>
      String(r.values?.join(" ")).toLowerCase().includes("zone") || 
      String(r.values?.join(" ")).toLowerCase().includes("qty")
    );
    if (headerRowIndex === -1) throw new Error("Header row not found in Projection report");

    const inserts: any[] = [];
    const reportDate = report.cycleDate ? this.safeDate(report.cycleDate) : null;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i].values;
      if (!row || row.length < 4) continue;

      const dealerName = String(row[0] ?? "").trim();
      if (!dealerName || !reportDate) continue; // Requires reportDate

      const verifiedDealerId = this.resolveDealerId(dealerName, dealerMap);

      inserts.push({
        emailReportId: report.id,
        institution: report.institution ?? "UNKNOWN",
        reportDate,
        zone: row[1] ?? "UNKNOWN",
        orderDealerName: dealerName,
        orderQtyMt: row[2] ? String(row[2]) : null,
        collectionDealerName: dealerName,
        collectionAmount: row[3] ? String(row[3]) : null,
        sourceMessageId: report.messageId,
        sourceFileName: report.fileName,
        verifiedDealerId,
      });
    }

    for (let i = 0; i < inserts.length; i += this.CHUNK_SIZE) {
      await tx.insert(projectionReports).values(inserts.slice(i, i + this.CHUNK_SIZE)).onConflictDoNothing();
    }
  }
}