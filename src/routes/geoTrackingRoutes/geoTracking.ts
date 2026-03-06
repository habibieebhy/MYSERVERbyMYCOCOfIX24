// server/src/routes/geoTrackingRoutes/geoTracking.ts

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { geoTracking, insertGeoTrackingSchema, journeyBreadcrumbs, journeys, journeyOps } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from "crypto";

// Create a partial schema for PATCH validation.
const geoTrackingUpdateSchema = insertGeoTrackingSchema.partial();

const createJourneySchema = z.object({
  id: z.string().optional(),
  userId: z.number(),
  pjpId: z.string().optional(),
  siteId: z.string().optional(),
  dealerId: z.string().optional(),
  siteName: z.string().optional(),
  destLat: z.string().optional(),
  destLng: z.string().optional(),
  status: z.string().default('ACTIVE'),
  batteryStart: z.number().optional(),
  appRole: z.string().optional(),
});

const createBreadcrumbSchema = z.object({
  id: z.string().optional(),
  journeyId: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  h3Index: z.string().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  accuracy: z.number().optional(),
  recordedAt: z.string().optional(),
});

export default function setupGeoTrackingRoutes(app: Express) {

  // -------------------------
  // GET Endpoints
  // -------------------------

  // Replaces: /api/geotracking/user/:userId
  app.get('/api/journeys/user/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) return res.status(400).json({ error: 'Invalid User ID' });

      // Only fetch the PARENT info (Context), fast and light
      const results = await db.select()
        .from(journeys)
        .where(eq(journeys.userId, userId))
        .orderBy(desc(journeys.startTime))
        .limit(50);

      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Server Error' });
    }
  });

  // Replaces: /api/geotracking/journey/:journeyId
  app.get('/api/journeys/:journeyId', async (req: Request, res: Response) => {
    try {
      const { journeyId } = req.params;

      // A. Get Context
      const [journey] = await db.select().from(journeys).where(eq(journeys.id, journeyId));
      if (!journey) return res.status(404).json({ error: 'Journey not found' });

      // B. Get Physics (The Blue Line)
      const path = await db.select({
        lat: journeyBreadcrumbs.latitude,
        lng: journeyBreadcrumbs.longitude,
        speed: journeyBreadcrumbs.speed,
        h3: journeyBreadcrumbs.h3Index,
        ts: journeyBreadcrumbs.recordedAt
      })
        .from(journeyBreadcrumbs)
        .where(eq(journeyBreadcrumbs.journeyId, journeyId))
        .orderBy(desc(journeyBreadcrumbs.recordedAt));

      res.json({ success: true, data: { ...journey, path } });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Server Error' });
    }
  });

  app.get("/api/journeys/:journeyId/ops", async (req, res) => {
    const { journeyId } = req.params;

    const ops = await db
      .select()
      .from(journeyOps)
      .where(eq(journeyOps.journeyId, journeyId))
      .orderBy(journeyOps.serverSeq);

    res.json({ success: true, data: ops });
  });

  app.get("/api/journeys/:journeyId/latest", async (req, res) => {
    const { journeyId } = req.params;

    const [latestMove] = await db
      .select()
      .from(journeyOps)
      .where(eq(journeyOps.journeyId, journeyId))
      .orderBy(desc(journeyOps.serverSeq))
      .limit(1);

    if (!latestMove || latestMove.type !== "MOVE") {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: latestMove.payload,
    });
  });

  // New Endpoint: Shows where every active driver is right now
  app.get('/api/live-locations', async (req: Request, res: Response) => {
    try {
      const activeJourneys = await db.select().from(journeys).where(eq(journeys.status, 'ACTIVE'));
      const liveData = [];

      for (const j of activeJourneys) {
        // Get the absolute latest crumb for this driver
        const [lastCrumb] = await db.select()
          .from(journeyBreadcrumbs)
          .where(eq(journeyBreadcrumbs.journeyId, j.id))
          .orderBy(desc(journeyBreadcrumbs.recordedAt))
          .limit(1);

        if (lastCrumb) {
          liveData.push({ ...j, ...lastCrumb });
        }
      }
      res.json({ success: true, data: liveData });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Live view error' });
    }
  });

  // -------------------------
  // POST Endpoint
  // -------------------------

  app.post('/api/journeys', async (req: Request, res: Response) => {
    try {
      const parsed = createJourneySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error });

      const payload = {
        ...parsed.data,
        id: parsed.data.id || crypto.randomUUID(),
        startTime: new Date(),
        updatedAt: new Date(),
      };

      const [inserted] = await db.insert(journeys).values(payload as any).returning();
      res.status(201).json({ success: true, data: inserted });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Start Journey Failed' });
    }
  });

  app.patch('/api/journeys/:journeyId', async (req: Request, res: Response) => {
    try {
      const { journeyId } = req.params;
      const { status, totalDistance, endTime } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (totalDistance) updateData.totalDistance = totalDistance.toString();
      if (endTime) updateData.endTime = new Date(endTime);
      else if (status === 'COMPLETED') updateData.endTime = new Date();

      const [updated] = await db.update(journeys)
        .set(updateData)
        .where(eq(journeys.id, journeyId))
        .returning();

      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Stop Journey Failed' });
    }
  });

  // This handles the "Batch Sync" when internet returns
  app.post('/api/breadcrumbs', async (req: Request, res: Response) => {
    try {
      const rawBody = Array.isArray(req.body) ? req.body : [req.body];
      const validRows: any[] = [];

      for (const item of rawBody) {
        const parsed = createBreadcrumbSchema.safeParse(item);
        if (parsed.success) {
          validRows.push({
            ...parsed.data,
            id: parsed.data.id || crypto.randomUUID(),
            recordedAt: parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
          });
        }
      }

      if (validRows.length > 0) {
        await db.insert(journeyBreadcrumbs).values(validRows);
      }

      res.status(201).json({ success: true, count: validRows.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Breadcrumb Sync Failed' });
    }
  });

} 