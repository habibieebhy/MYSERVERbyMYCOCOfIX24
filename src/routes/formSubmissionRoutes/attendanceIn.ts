// server/src/routes/postRoutes/attendanceIn.ts
// Attendance Check-In POST endpoints

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { salesmanAttendance } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto'; // 👈 ADDED THIS IMPORT

// Zod schema for validation
const attendanceInSchema = z.object({
  id: z.string().optional(), // 👈 FIX 1: Allow the ID from Flutter!
  userId: z.number(),
  attendanceDate: z.string().date().or(z.string()), 
  locationName: z.string().min(1),
  inTimeImageCaptured: z.boolean().optional(),
  inTimeImageUrl: z.string().optional().nullable(),
  inTimeLatitude: z.number(),
  inTimeLongitude: z.number(),
  inTimeAccuracy: z.number().optional().nullable(),
  inTimeSpeed: z.number().optional().nullable(),
  inTimeHeading: z.number().optional().nullable(),
  inTimeAltitude: z.number().optional().nullable(),
  role: z.enum(['SALES', 'TECHNICAL']).default('SALES'),
});

export default function setupAttendanceInPostRoutes(app: Express) {
  // ATTENDANCE CHECK-IN
  app.post('/api/attendance/check-in', async (req: Request, res: Response) => {
    try {
      // Validate input
      const parsed = attendanceInSchema.parse(req.body);

      const {
        id, // 👈 Extract the ID
        userId,
        attendanceDate,
        locationName,
        inTimeImageCaptured,
        inTimeImageUrl,
        inTimeLatitude,
        inTimeLongitude,
        inTimeAccuracy,
        inTimeSpeed,
        inTimeHeading,
        inTimeAltitude,
        role,
      } = parsed;

      const dateStr = String(attendanceDate).substring(0, 10);
      
      console.log(`[CheckIn] App sent: ${attendanceDate} | Server using: ${dateStr}`);

      // Check if user already checked in today
      const [existingAttendance] = await db
        .select()
        .from(salesmanAttendance)
        .where(
          and(
            eq(salesmanAttendance.userId, userId),
            eq(salesmanAttendance.attendanceDate, dateStr),
            eq(salesmanAttendance.role, role)
          )
        )
        .limit(1);

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          error: 'User has already checked in today',
        });
      }

      const attendanceData = {
        id: id || randomUUID(),
        userId,
        attendanceDate: dateStr, 
        role,
        locationName,
        inTimeTimestamp: new Date().toISOString(), 
        outTimeTimestamp: null,
        inTimeImageCaptured: inTimeImageCaptured ?? false,
        outTimeImageCaptured: false,
        inTimeImageUrl: inTimeImageUrl || null,
        outTimeImageUrl: null,
        inTimeLatitude: inTimeLatitude.toString(),
        inTimeLongitude: inTimeLongitude.toString(),
        inTimeAccuracy: inTimeAccuracy?.toString() ?? null,
        inTimeSpeed: inTimeSpeed?.toString() ?? null,
        inTimeHeading: inTimeHeading?.toString() ?? null,
        inTimeAltitude: inTimeAltitude?.toString() ?? null,
        outTimeLatitude: null,
        outTimeLongitude: null,
        outTimeAccuracy: null,
        outTimeSpeed: null,
        outTimeHeading: null,
        outTimeAltitude: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const [newAttendance] = await db
        .insert(salesmanAttendance)
        .values(attendanceData)
        .returning();

      res.status(201).json({
        success: true,
        message: 'Check-in successful',
        data: newAttendance,
      });
    } catch (error) {
      console.error('Attendance check-in error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues,
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to check in',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('✅ Attendance Check-In POST endpoints setup complete');
}