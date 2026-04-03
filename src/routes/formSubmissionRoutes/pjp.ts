// server/src/routes/formSubmissionRoutes/pjp.ts
import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { permanentJourneyPlans } from '../../db/schema';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm'; // 👈 ADD THIS AT THE TOP

// helpers
const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

const strOrNull = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return String(val).trim();
}, z.string().nullable().optional());

const numOrZero = z.preprocess((val) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}, z.number().int().default(0));
// ---------- input schemas ----------
const pjpInputSchema = z.object({
  id: z.string().optional(),
  userId: z.coerce.number().int().positive(),
  createdById: z.coerce.number().int().positive(),
  dealerId: strOrNull,
  siteId: strOrNull,
  planDate: z.coerce.date(),
  areaToBeVisited: z.string().max(500).min(1),
  route: strOrNull,
  description: strOrNull,
  status: z.string().max(50).min(1).default('PENDING'),

  // Numerical Plans
  plannedNewSiteVisits: numOrZero,
  plannedFollowUpSiteVisits: numOrZero,
  plannedNewDealerVisits: numOrZero,
  plannedInfluencerVisits: numOrZero,

  // Influencer Details
  influencerName: strOrNull,
  influencerPhone: strOrNull,
  activityType: strOrNull,

  // Conversion & Schemes
  noOfConvertedBags: numOrZero,
  noOfMasonPcSchemes: numOrZero,

  verificationStatus: strOrNull.default('PENDING'),
  additionalVisitRemarks: strOrNull,
  idempotencyKey: z.string().max(120).optional(),
});

const bulkSchema = z.object({
  userId: z.coerce.number().int().positive(),
  createdById: z.coerce.number().int().positive(),
  dealerIds: z.array(z.string().min(1)).nullable().optional().default(null), // Explicitly allow null
  siteIds: z.array(z.string().min(1)).nullable().optional().default(null),   // Explicitly allow null
  baseDate: z.coerce.date(),
  batchSizePerDay: z.coerce.number().int().min(1).max(500).default(8),
  areaToBeVisited: z.string().max(500).min(1),
  route: strOrNull,
  description: strOrNull,
  status: z.string().max(50).default('PENDING'),

  // Default metrics for bulk creation
  plannedNewSiteVisits: numOrZero,
  plannedFollowUpSiteVisits: numOrZero,
  plannedNewDealerVisits: numOrZero,
  plannedInfluencerVisits: numOrZero,

  noOfConvertedBags: numOrZero,
  noOfMasonPcSchemes: numOrZero,

  influencerName: strOrNull,
  influencerPhone: strOrNull,
  activityType: strOrNull,

  bulkOpId: z.string().max(50).optional(),
  idempotencyKey: z.string().max(120).optional(),
}).passthrough();

export default function setupPermanentJourneyPlansPostRoutes(app: Express) {
  // SINGLE CREATE
  // SINGLE CREATE
  app.post('/api/pjp', async (req: Request, res: Response) => {
    try {
      const input = pjpInputSchema.parse(req.body);

      // 🛡️ 1. THE IDEMPOTENCY SHIELD (The Fix!)
      // If Flutter sent us an ID, check if we already have it.
      if (input.id) {
        const existing = await db
          .select()
          .from(permanentJourneyPlans)
          .where(eq(permanentJourneyPlans.id, input.id))
          .limit(1);

        if (existing.length > 0) {
          console.log(`🛡️ Idempotency hit! PJP ${input.id} already exists. Returning existing record.`);
          // Return a 200 OK with the existing data. DO NOT insert again!
          return res.status(200).json({
            success: true,
            message: 'Already exists (Idempotency check passed)',
            data: existing[0],
          });
        }
      }

      // 🚀 2. IF NOT EXISTS, PROCEED WITH NORMAL INSERT
      const [record] = await db
        .insert(permanentJourneyPlans)
        .values({
          id: input.id || randomUUID(), // Uses Flutter's ID if provided
          userId: input.userId,
          createdById: input.createdById,
          dealerId: input.dealerId ?? null,
          siteId: input.siteId ?? null,
          planDate: toDateOnly(input.planDate),
          areaToBeVisited: input.areaToBeVisited,
          route: input.route,
          description: input.description ?? null,
          status: input.status,

          plannedNewSiteVisits: input.plannedNewSiteVisits,
          plannedFollowUpSiteVisits: input.plannedFollowUpSiteVisits,
          plannedNewDealerVisits: input.plannedNewDealerVisits,
          plannedInfluencerVisits: input.plannedInfluencerVisits,

          influencerName: input.influencerName,
          influencerPhone: input.influencerPhone,
          activityType: input.activityType,

          noOfConvertedBags: input.noOfConvertedBags,
          noOfMasonPcSchemes: input.noOfMasonPcSchemes,

          verificationStatus: input.verificationStatus ?? 'PENDING',
          additionalVisitRemarks: input.additionalVisitRemarks ?? null,
          idempotencyKey: input.idempotencyKey,
        })
        .onConflictDoNothing({
          target: [
            permanentJourneyPlans.userId,
            permanentJourneyPlans.dealerId,
            permanentJourneyPlans.planDate,
          ],
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: record ? 'Permanent Journey Plan created successfully' : 'Skipped (already exists)',
        data: record ?? null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.issues });
      }
      console.error('Create PJP error:', error);
      return res.status(500).json({ success: false, error: 'Failed to create PJP' });
    }
  });

  // BULK CREATE
  // BULK CREATE
  app.post('/api/bulkpjp', async (req: Request, res: Response) => {
    try {
      const input = bulkSchema.parse(req.body);

      // 🛡️ 1. THE BULK IDEMPOTENCY SHIELD
      // Check if this exact bulk operation lag-spiked and was sent twice.
      if (input.idempotencyKey || input.bulkOpId) {
        // We check whichever key the mobile app provided
        const existing = await db
          .select({ id: permanentJourneyPlans.id })
          .from(permanentJourneyPlans)
          .where(
            input.idempotencyKey
              ? eq(permanentJourneyPlans.idempotencyKey, input.idempotencyKey)
              : eq(permanentJourneyPlans.bulkOpId, input.bulkOpId!)
          )
          .limit(1);

        if (existing.length > 0) {
          console.log(`🛡️ Bulk Idempotency hit! Batch already processed. Ignoring duplicate.`);
          const requested = (input.dealerIds?.length || 0) + (input.siteIds?.length || 0);
          return res.status(200).json({
            success: true,
            message: 'Bulk PJP creation already processed (Idempotency check passed)',
            requestedCount: requested,
            totalRowsCreated: 0,
            totalRowsSkipped: requested,
          });
        }
      }

      // 🚀 2. IF NOT EXISTS, PROCEED WITH BULK GENERATION
      const {
        userId, createdById, dealerIds, siteIds, baseDate, batchSizePerDay,
        areaToBeVisited, route, description, status,
        plannedNewSiteVisits, plannedFollowUpSiteVisits, plannedNewDealerVisits, plannedInfluencerVisits,
        noOfConvertedBags, noOfMasonPcSchemes,
        influencerName, influencerPhone, activityType,
        bulkOpId, idempotencyKey,
      } = input;

      // Determine which ID list to use
      const targetIds = (dealerIds && dealerIds.length > 0)
        ? dealerIds
        : (siteIds && siteIds.length > 0)
          ? siteIds
          : [null];
      const isDealerBatch = dealerIds && dealerIds.length > 0;

      const rows = targetIds.map((id, i) => {
        const dayOffset = Math.floor(i / batchSizePerDay);
        const planDate = toDateOnly(addDays(baseDate, dayOffset));
        return {
          id: randomUUID(), // Server safely generates IDs because we already checked idempotency!
          userId,
          createdById,
          dealerId: isDealerBatch ? id : null,
          siteId: !isDealerBatch ? id : null,
          planDate,
          areaToBeVisited,
          route,
          description: description ?? null,
          status,

          plannedNewSiteVisits,
          plannedFollowUpSiteVisits,
          plannedNewDealerVisits,
          plannedInfluencerVisits,

          noOfConvertedBags,
          noOfMasonPcSchemes,

          influencerName,
          influencerPhone,
          activityType,

          verificationStatus: 'PENDING',
          bulkOpId,
          idempotencyKey,
        };
      });

      let totalCreated = 0;
      const CHUNK = 200;

      for (let i = 0; i < rows.length; i += CHUNK) {
        const result = await db
          .insert(permanentJourneyPlans)
          .values(rows.slice(i, i + CHUNK))
          .onConflictDoNothing({
            // Protects against overlapping dates for the same dealer
            target: [
              permanentJourneyPlans.userId,
              permanentJourneyPlans.dealerId,
              permanentJourneyPlans.planDate,
            ],
          })
          .returning({ id: permanentJourneyPlans.id });

        totalCreated += result.length;
      }

      return res.status(201).json({
        success: true,
        message: 'Bulk PJP creation complete',
        requestedCount: targetIds.length,
        totalRowsCreated: totalCreated,
        totalRowsSkipped: targetIds.length - totalCreated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ success: false, error: 'Validation failed', details: error.issues });
      }
      console.error('Bulk PJP error:', error);
      return res.status(500).json({ success: false, error: 'Failed to process bulk PJP' });
    }
  });

  console.log('✅ PJP POST endpoints (using dealerId & siteId) setup complete');
}