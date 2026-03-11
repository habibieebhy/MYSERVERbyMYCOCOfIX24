// server/src/routes/updateRoutes/dvr.ts

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { dailyVisitReports } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// ---- helpers ----
const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
const toStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') { const s = v.trim(); if (!s) return []; return s.includes(',') ? s.split(',').map(t => t.trim()).filter(Boolean) : [s]; }
  return [];
};
const strOrNull = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return String(val).trim();
}, z.string().nullable().optional());
const numOrNull = z.preprocess((val) => (val === '' || val === null || val === undefined) ? null : val, z.coerce.number().nullable().optional());


// ---- patch schema UPDATED ----
const dvrPatchSchema = z
  .object({
    dealerId: strOrNull,
    subDealerId: strOrNull,
    userId: z.coerce.number().int().positive().optional(),
    reportDate: z.coerce.date().optional(),
    dealerType: z.string().max(50).optional(),
    
    customerType: strOrNull,
    partyType: strOrNull,
    nameOfParty: strOrNull,
    contactNoOfParty: strOrNull,
    expectedActivationDate: z.coerce.date().nullable().optional(),

    location: z.string().max(500).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    visitType: z.string().max(50).optional(),
    dealerTotalPotential: z.coerce.number().optional(),
    dealerBestPotential: z.coerce.number().optional(),
    brandSelling: z.preprocess(toStringArray, z.array(z.string()).min(1)).optional(),
    contactPerson: strOrNull,
    contactPersonPhoneNo: strOrNull,
    todayOrderMt: z.coerce.number().optional(),
    todayCollectionRupees: z.coerce.number().optional(),
    overdueAmount: numOrNull,
    feedbacks: z.string().max(500).min(1).optional(),
    solutionBySalesperson: strOrNull,
    anyRemarks: strOrNull,
    checkInTime: z.coerce.date().optional(),
    checkOutTime: z.coerce.date().nullable().optional(),
    timeSpentinLoc: strOrNull,
    inTimeImageUrl: strOrNull,
    outTimeImageUrl: strOrNull,
    pjpId: z.string().max(255).nullable().optional(),
    dailyTaskId: strOrNull,
  });

export default function setupDailyVisitReportsPatchRoutes(app: Express) {
  
  app.patch('/api/daily-visit-reports/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const input = dvrPatchSchema.parse(req.body);

      if (Object.keys(input).length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      const [existing] = await db
        .select({ id: dailyVisitReports.id })
        .from(dailyVisitReports)
        .where(eq(dailyVisitReports.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: `DVR with ID '${id}' not found.`,
        });
      }
      
      const patch: any = { updatedAt: new Date() };
      
      if (input.dealerId !== undefined) patch.dealerId = input.dealerId;
      if (input.subDealerId !== undefined) patch.subDealerId = input.subDealerId;
      if (input.userId !== undefined) patch.userId = input.userId;
      if (input.reportDate !== undefined) patch.reportDate = toDateOnly(input.reportDate);
      if (input.dealerType !== undefined) patch.dealerType = input.dealerType;

      if (input.customerType !== undefined) patch.customerType = input.customerType;
      if (input.partyType !== undefined) patch.partyType = input.partyType;
      if (input.nameOfParty !== undefined) patch.nameOfParty = input.nameOfParty;
      if (input.contactNoOfParty !== undefined) patch.contactNoOfParty = input.contactNoOfParty;
      if (input.expectedActivationDate !== undefined) {
        patch.expectedActivationDate = input.expectedActivationDate ? toDateOnly(input.expectedActivationDate) : null;
      }

      if (input.location !== undefined) patch.location = input.location;
      if (input.visitType !== undefined) patch.visitType = input.visitType;
      if (input.latitude !== undefined) patch.latitude = String(input.latitude);
      if (input.longitude !== undefined) patch.longitude = String(input.longitude);
      if (input.dealerTotalPotential !== undefined) patch.dealerTotalPotential = String(input.dealerTotalPotential);
      if (input.dealerBestPotential !== undefined) patch.dealerBestPotential = String(input.dealerBestPotential);
      if (input.todayOrderMt !== undefined) patch.todayOrderMt = String(input.todayOrderMt);
      if (input.todayCollectionRupees !== undefined) patch.todayCollectionRupees = String(input.todayCollectionRupees);
      if (input.overdueAmount !== undefined) patch.overdueAmount = input.overdueAmount ? String(input.overdueAmount) : null;
      if (input.brandSelling !== undefined) patch.brandSelling = input.brandSelling;
      if (input.contactPerson !== undefined) patch.contactPerson = input.contactPerson;
      if (input.contactPersonPhoneNo !== undefined) patch.contactPersonPhoneNo = input.contactPersonPhoneNo;
      if (input.feedbacks !== undefined) patch.feedbacks = input.feedbacks;
      if (input.solutionBySalesperson !== undefined) patch.solutionBySalesperson = input.solutionBySalesperson;
      if (input.anyRemarks !== undefined) patch.anyRemarks = input.anyRemarks;
      if (input.checkInTime !== undefined) patch.checkInTime = input.checkInTime;
      if (input.checkOutTime !== undefined) patch.checkOutTime = input.checkOutTime;
      if (input.timeSpentinLoc !== undefined) patch.timeSpentinLoc = input.timeSpentinLoc;
      if (input.inTimeImageUrl !== undefined) patch.inTimeImageUrl = input.inTimeImageUrl;
      if (input.outTimeImageUrl !== undefined) patch.outTimeImageUrl = input.outTimeImageUrl;
      if (input.pjpId !== undefined) patch.pjpId = input.pjpId;
      if (input.dailyTaskId !== undefined) patch.dailyTaskId = input.dailyTaskId;

      const [updated] = await db
        .update(dailyVisitReports)
        .set(patch)
        .where(eq(dailyVisitReports.id, id))
        .returning();

      return res.json({
        success: true,
        message: 'Daily Visit Report updated successfully',
        data: updated,
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.issues });
      }
      console.error('Update DVR error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update DVR',
      });
    }
  });

  console.log('✅ DVR PATCH endpoints setup complete');
}