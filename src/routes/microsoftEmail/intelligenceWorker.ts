import { db } from "../../db/db";
import {
    outstandingReports,
    collectionReports,
    projectionReports,
    dealerFinancialSnapshot,
    dealerTrendMetrics,
    dealerIntelligenceSnapshot,
    emailReports,
} from "../../db/schema";
import { and, eq, desc, sql } from "drizzle-orm";

export class IntelligenceWorker {
    // Process 20 dealer-cycles concurrently to prevent DB connection exhaustion
    private readonly CONCURRENCY_LIMIT = 20;

    /* =========================================================
       PUBLIC ENTRY
    ========================================================= */
    async runOnce() {
        console.log("[Intelligence] Starting intelligence computation...");

        // 1️⃣ FIX: THE COLLECTION BLINDSPOT
        // We must fetch distinct dealer+cycle combinations from ALL THREE fact tables.
        // Otherwise, dealers who only had a collection this cycle get skipped.
        const [out, col, proj] = await Promise.all([
            db.select({ dealerId: outstandingReports.verifiedDealerId, cycleDate: outstandingReports.reportDate })
              .from(outstandingReports).where(sql`${outstandingReports.verifiedDealerId} IS NOT NULL`)
              .groupBy(outstandingReports.verifiedDealerId, outstandingReports.reportDate),
              
            // Collections are usually tied to a voucher date, we group them to ensure the dealer is captured
            db.select({ dealerId: collectionReports.verifiedDealerId, cycleDate: collectionReports.voucherDate })
              .from(collectionReports).where(sql`${collectionReports.verifiedDealerId} IS NOT NULL`)
              .groupBy(collectionReports.verifiedDealerId, collectionReports.voucherDate),
              
            db.select({ dealerId: projectionReports.verifiedDealerId, cycleDate: projectionReports.reportDate })
              .from(projectionReports).where(sql`${projectionReports.verifiedDealerId} IS NOT NULL`)
              .groupBy(projectionReports.verifiedDealerId, projectionReports.reportDate),
        ]);

        // Merge and deduplicate the dealer-cycles using a Map
        const uniqueDealerCycles = new Map<string, { dealerId: number, cycleDate: string }>();
        
        const addToMap = (rows: any[]) => {
            for (const row of rows) {
                if (!row.dealerId || !row.cycleDate) continue;
                // Force string conversion so '2026-02-21' stays clean
                const cycleString = typeof row.cycleDate === 'string' ? row.cycleDate : row.cycleDate.toISOString().split("T")[0];
                const key = `${row.dealerId}_${cycleString}`;
                uniqueDealerCycles.set(key, { dealerId: row.dealerId, cycleDate: cycleString });
            }
        };

        addToMap(out);
        addToMap(col);
        addToMap(proj);

        const dealerCycles = Array.from(uniqueDealerCycles.values());

        // 2️⃣ Chunked Execution (Prevents memory/connection crashing)
        for (let i = 0; i < dealerCycles.length; i += this.CONCURRENCY_LIMIT) {
            const chunk = dealerCycles.slice(i, i + this.CONCURRENCY_LIMIT);

            await Promise.all(
                chunk.map((row) => this.processDealerCycle(row.dealerId, row.cycleDate))
            );
        }

        console.log(`[Intelligence] Successfully updated ${dealerCycles.length} dealer-cycle snapshots.`);
    }

    /* =========================================================
       CORE AGGREGATION & TRANSACTION WRAPPER
    ========================================================= */
    private async processDealerCycle(dealerId: number, cycleDate: string) {
        
        // 3️⃣ FIX: TRANSACTION VULNERABILITY
        // Wrapping everything in `tx` ensures the Snapshot, Trend, and Intelligence tables update atomically.
        await db.transaction(async (tx) => {
            
            // 🚨 FIX: THE DOUBLE-COUNT BOMB (innerJoin emailReports) 🚨
            const outstanding = await tx
                .select({
                    totalOutstanding: sql<number>`COALESCE(SUM(${outstandingReports.pendingAmt}),0)`,
                    totalOverdue: sql<number>`
                        COALESCE(SUM(
                            CASE 
                            WHEN ${outstandingReports.institution} = 'JUD' THEN 
                                ${outstandingReports.days15To21} + ${outstandingReports.days21To30} + ${outstandingReports.days30To45} + 
                                ${outstandingReports.days45To60} + ${outstandingReports.days60To75} + ${outstandingReports.days75To90} + ${outstandingReports.greaterThan90Days}
                            WHEN ${outstandingReports.institution} = 'JSB' THEN 
                                ${outstandingReports.days21To30} + ${outstandingReports.days30To45} + ${outstandingReports.days45To60} + 
                                ${outstandingReports.days60To75} + ${outstandingReports.days75To90} + ${outstandingReports.greaterThan90Days}
                            ELSE 0
                            END
                        ),0)
                    `,
                })
                .from(outstandingReports)
                .innerJoin(emailReports, eq(outstandingReports.emailReportId, emailReports.id)) // <--- PROTECTS AGAINST VERSIONS
                .where(
                    and(
                        eq(outstandingReports.verifiedDealerId, dealerId),
                        eq(outstandingReports.reportDate, cycleDate),
                        eq(emailReports.isLatestVersion, true) // <--- ONLY CALCULATE THE LATEST VERSION
                    )
                );

            const totalOutstanding = Number(outstanding[0]?.totalOutstanding ?? 0);
            const totalOverdue = Number(outstanding[0]?.totalOverdue ?? 0);
            
            let overdueRatio = totalOutstanding > 0 ? totalOverdue / totalOutstanding : 0;
            // PREVENT DATABASE OVERFLOW: Cap at max allowed by NUMERIC(5,4)
            overdueRatio = Math.min(overdueRatio, 9.9999);

            // COLLECTION AGGREGATION
            const collection = await tx
                .select({
                    totalCollection: sql<number>`COALESCE(SUM(${collectionReports.amount}),0)`,
                })
                .from(collectionReports)
                .innerJoin(emailReports, eq(collectionReports.emailReportId, emailReports.id))
                .where(
                    and(
                        eq(collectionReports.verifiedDealerId, dealerId),
                        // Match collections by the same month/year as the cycle date
                        sql`TO_CHAR(${collectionReports.voucherDate}, 'YYYY-MM') = TO_CHAR(${cycleDate}::date, 'YYYY-MM')`,
                        eq(emailReports.isLatestVersion, true)
                    )
                );

            const totalCollection = Number(collection[0]?.totalCollection ?? 0);

            // PROJECTION AGGREGATION
            const projection = await tx
                .select({
                    projectedOrderQty: sql<number>`COALESCE(SUM(${projectionReports.orderQtyMt}),0)`,
                })
                .from(projectionReports)
                .innerJoin(emailReports, eq(projectionReports.emailReportId, emailReports.id))
                .where(
                    and(
                        eq(projectionReports.verifiedDealerId, dealerId),
                        eq(projectionReports.reportDate, cycleDate),
                        eq(emailReports.isLatestVersion, true)
                    )
                );

            const projectedOrderQty = Number(projection[0]?.projectedOrderQty ?? 0);

            // UPSERT FINANCIAL SNAPSHOT
            await tx
                .insert(dealerFinancialSnapshot)
                .values({
                    dealerId, cycleDate,
                    totalOutstanding: String(totalOutstanding),
                    totalOverdue: String(totalOverdue),
                    overdueRatio: String(overdueRatio),
                    totalCollection: String(totalCollection),
                    projectedOrderQty: String(projectedOrderQty),
                })
                .onConflictDoUpdate({
                    target: [dealerFinancialSnapshot.dealerId, dealerFinancialSnapshot.cycleDate],
                    set: {
                        totalOutstanding: String(totalOutstanding), totalOverdue: String(totalOverdue),
                        overdueRatio: String(overdueRatio), totalCollection: String(totalCollection),
                        projectedOrderQty: String(projectedOrderQty),
                    },
                });

            // 4️⃣ PASS TX DOWNWARD
            // Pass the transaction context so these update in the exact same atomic blast
            await this.computeTrend(dealerId, cycleDate, tx);
            await this.computeIntelligence(dealerId, tx);
        });
    }

    /* =========================================================
       TREND & RISK CALCULATION (Runs inside Transaction)
    ========================================================= */
    private async computeTrend(dealerId: number, cycleDate: string, tx: any) {
        const snapshots = await tx
            .select()
            .from(dealerFinancialSnapshot)
            .where(eq(dealerFinancialSnapshot.dealerId, dealerId))
            .orderBy(desc(dealerFinancialSnapshot.cycleDate))
            .limit(2);

        if (snapshots.length < 2) return;

        const current = snapshots[0];
        const previous = snapshots[1];

        const outstandingDelta = Number(current.totalOutstanding) - Number(previous.totalOutstanding);
        const collectionDelta = Number(current.totalCollection) - Number(previous.totalCollection);

        const prevOutstanding = Number(previous.totalOutstanding);
        let volatility = prevOutstanding > 0 ? Math.abs(outstandingDelta) / prevOutstanding : 0;
        
        // PREVENT DATABASE OVERFLOW: Cap at max allowed by NUMERIC(8,4)
        volatility = Math.min(volatility, 9999.9999);

        await tx
            .insert(dealerTrendMetrics)
            .values({
                dealerId, cycleDate,
                outstandingDelta: String(outstandingDelta), collectionDelta: String(collectionDelta),
                movingAvgOutstanding: String(current.totalOutstanding), volatilityIndex: String(volatility),
            })
            .onConflictDoUpdate({
                target: [dealerTrendMetrics.dealerId, dealerTrendMetrics.cycleDate],
                set: {
                    outstandingDelta: String(outstandingDelta), collectionDelta: String(collectionDelta),
                    movingAvgOutstanding: String(current.totalOutstanding), volatilityIndex: String(volatility),
                },
            });
    }

    private async computeIntelligence(dealerId: number, tx: any) {
        const latest = await tx
            .select()
            .from(dealerFinancialSnapshot)
            .where(eq(dealerFinancialSnapshot.dealerId, dealerId))
            .orderBy(desc(dealerFinancialSnapshot.cycleDate))
            .limit(1);

        if (!latest.length) return;
        const snap = latest[0];
        
        const overdueRatio = Number(snap.overdueRatio ?? 0);

        let riskScore = overdueRatio * 100;
        let riskCategory = "LOW";
        let healthIndicator = "GREEN";

        // Simple Tiered Risk Logic
        if (overdueRatio > 0.5) { 
            riskCategory = "HIGH"; 
            healthIndicator = "RED"; 
        } else if (overdueRatio > 0.25) { 
            riskCategory = "MEDIUM"; 
            healthIndicator = "YELLOW"; 
        }

        await tx
            .insert(dealerIntelligenceSnapshot)
            .values({
                dealerId,
                currentOutstanding: String(snap.totalOutstanding), currentOverdue: String(snap.totalOverdue),
                currentCollection: String(snap.totalCollection), riskScore: String(riskScore),
                riskCategory, healthIndicator, lastCycleDate: snap.cycleDate,
            })
            .onConflictDoUpdate({
                target: dealerIntelligenceSnapshot.dealerId,
                set: {
                    currentOutstanding: String(snap.totalOutstanding), currentOverdue: String(snap.totalOverdue),
                    currentCollection: String(snap.totalCollection), riskScore: String(riskScore),
                    riskCategory, healthIndicator, lastCycleDate: snap.cycleDate,
                },
            });
    }
}