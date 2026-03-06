// server/src/routes/geoTrackingRoutes/journeyOps.ts

import { Express, Request, Response } from "express";
import { db } from "../../db/db";
import { journeyOps, journeys } from "../../db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const JourneyOpSchema = z.object({
  opId: z.string().uuid(),
  journeyId: z.string(),
  type: z.enum(["START", "MOVE", "STOP"]),
  payload: z.any(),
  localSeq: z.number().int(),
  createdAt: z.string().datetime(),
  appRole: z.string().optional(),
});

const SyncSchema = z.object({
  lastServerSeq: z.number().int(),
  ops: z.array(JourneyOpSchema),
});

export default function setupJourneyOpsRoutes(app: Express) {

  app.post("/api/journey-ops/sync", async (req: Request, res: Response) => {
    try {
      const parsed = SyncSchema.parse(req.body);
      const acks: { opId: string; serverSeq: number }[] = [];

      for (const op of parsed.ops) {
        // 🔒 Resolve userId from journey (authoritative)
        const [journey] = await db
          .select({ userId: journeys.userId })
          .from(journeys)
          .where(eq(journeys.id, op.journeyId))
          .limit(1);

        if (!journey) {
          return res.status(400).json({
            success: false,
            error: `Invalid journeyId: ${op.journeyId}`,
          });
        }

        const userId = journey.userId;

        // 🔁 Idempotency check
        const [existing] = await db
          .select()
          .from(journeyOps)
          .where(eq(journeyOps.opId, op.opId))
          .limit(1);

        if (existing) {
          acks.push({
            opId: existing.opId,
            serverSeq: existing.serverSeq,
          });
          continue;
        }

        const [inserted] = await db
          .insert(journeyOps)
          .values({
            opId: op.opId,
            journeyId: op.journeyId,
            userId,
            type: op.type,
            payload: op.payload,
            appRole: op.appRole,
            createdAt: new Date(op.createdAt),
          })
          .returning();

        acks.push({
          opId: inserted.opId,
          serverSeq: inserted.serverSeq,
        });
      }

      return res.json({
        success: true,
        data: { acks },
      });

    } catch (err) {
      console.error("[journey-ops-sync] error", err);
      return res.status(400).json({
        success: false,
        error: "Invalid sync payload",
      });
    }
  });
}