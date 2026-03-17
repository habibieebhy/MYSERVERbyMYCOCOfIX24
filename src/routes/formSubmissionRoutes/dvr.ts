// server/src/routes/formSubmissionRoutes/dvr.ts

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { dailyVisitReports } from '../../db/schema';
import { z } from 'zod';
import { randomUUID } from 'crypto';

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


// ---- input schema UPDATED ----
const dvrInputSchema = z
  .object({
    userId: z.coerce.number().int().positive(),
    dealerId: strOrNull,
    subDealerId: strOrNull,
    reportDate: z.coerce.date(),
    dealerType: z.string().max(50),

    customerType: strOrNull,
    partyType: strOrNull,
    nameOfParty: strOrNull,
    contactNoOfParty: strOrNull,
    expectedActivationDate: z.coerce.date().nullable().optional(),

    location: z.string().max(500),
    latitude: z.coerce.number(),
    longitude: z.coerce.number(),
    visitType: z.string().max(50),
    dealerTotalPotential: z.coerce.number(),
    dealerBestPotential: z.coerce.number(),
    brandSelling: z.preprocess(
      toStringArray,
      z.array(z.string()).optional().nullable().default([])
    ),
    contactPerson: strOrNull,
    contactPersonPhoneNo: strOrNull,
    todayOrderMt: z.coerce.number(),
    todayCollectionRupees: z.coerce.number(),
    overdueAmount: numOrNull,
    feedbacks: z.string().max(500).min(1),
    solutionBySalesperson: strOrNull,
    anyRemarks: strOrNull,
    checkInTime: z.coerce.date(),
    checkOutTime: z.coerce.date().nullable().optional(),
    timeSpentinLoc: strOrNull,
    inTimeImageUrl: strOrNull,
    outTimeImageUrl: strOrNull,
    pjpId: strOrNull,
    dailyTaskId: strOrNull,
    idempotencyKey: strOrNull,
  });

export default function setupDailyVisitReportsPostRoutes(app: Express) {
  app.post('/api/daily-visit-reports', async (req: Request, res: Response) => {

    // console.log('Incoming req.body keys:', Object.keys(req.body));
    // console.log('Raw req.body:', JSON.stringify(req.body, null, 2));

    try {

      const input = dvrInputSchema.parse(req.body);

      const insertData = {
        id: randomUUID(),
        userId: input.userId,
        dealerId: input.dealerId ?? null,
        subDealerId: input.subDealerId ?? null,
        reportDate: toDateOnly(input.reportDate),
        dealerType: input.dealerType,

        customerType: input.customerType ?? null,
        partyType: input.partyType ?? null,
        nameOfParty: input.nameOfParty ?? null,
        contactNoOfParty: input.contactNoOfParty ?? null,
        expectedActivationDate: input.expectedActivationDate ? toDateOnly(input.expectedActivationDate) : null,

        location: input.location,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        visitType: input.visitType,
        dealerTotalPotential: String(input.dealerTotalPotential),
        dealerBestPotential: String(input.dealerBestPotential),
        brandSelling: input.brandSelling,
        contactPerson: input.contactPerson ?? null,
        contactPersonPhoneNo: input.contactPersonPhoneNo ?? null,
        todayOrderMt: String(input.todayOrderMt),
        todayCollectionRupees: String(input.todayCollectionRupees),
        overdueAmount: input.overdueAmount ? String(input.overdueAmount) : null,
        feedbacks: input.feedbacks,
        solutionBySalesperson: input.solutionBySalesperson ?? null,
        anyRemarks: input.anyRemarks ?? null,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime ?? null,
        timeSpentinLoc: input.timeSpentinLoc ?? null,
        inTimeImageUrl: input.inTimeImageUrl ?? null,
        outTimeImageUrl: input.outTimeImageUrl ?? null,
        pjpId: input.pjpId ?? null,
        dailyTaskId: input.dailyTaskId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
      };

      const [record] = await db.insert(dailyVisitReports).values(insertData).returning();

      return res.status(201).json({
        success: true,
        message: 'Daily Visit Report created successfully',
        data: record,
      });
    } catch (error) {
      console.error(`Create DVR error:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create DVR',
        details: (error as Error)?.message ?? 'Unknown error',
      });
    }
  });

  console.log('✅ DVR POST endpoints setup complete');
}