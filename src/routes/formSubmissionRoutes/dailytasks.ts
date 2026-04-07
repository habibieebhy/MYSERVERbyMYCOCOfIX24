// server/src/routes/postRoutes/dailyTasks.ts 

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { dailyTasks, insertDailyTaskSchema } from '../../db/schema';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export default function setupDailyTasksPostRoutes(app: Express) {
  app.post('/api/daily-tasks', async (req: Request, res: Response) => {
    try {
      const body = req.body;

      // 🚀 1. THE BULLETPROOF PAYLOAD MAPPER
      // We explicitly build the object with ONLY the columns that exist in Postgres.
      // This completely strips out 'latitude' and 'longitude' so Postgres doesn't crash.
      const cleanInsertData = {
        id: body.id || randomUUID(),
        pjpBatchId: body.pjpBatchId || null,
        userId: Number(body.userId), // Safely enforce integer
        dealerId: body.dealerId || null,
        dealerNameSnapshot: body.dealerNameSnapshot || null,
        dealerMobile: body.dealerMobile || null,
        zone: body.zone || null,
        area: body.area || null,
        route: body.route || null,
        objective: body.objective || null,
        visitType: body.visitType || null,
        requiredVisitCount: Number(body.requiredVisitCount) || 1,
        week: body.week || null,
        
        // Drizzle 'date' type safely accepts the "YYYY-MM-DD" string
        taskDate: body.taskDate, 
        
        status: body.status || 'Assigned',
        
        // Drizzle 'timestamp' type strictly requires Native JS Date objects!
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: body.updatedAt ? new Date(body.updatedAt) : new Date(),
      };

      // 🚀 2. VALIDATE THE CLEAN DATA
      // This ensures everything perfectly matches your insertDailyTaskSchema
      const validatedData = insertDailyTaskSchema.parse(cleanInsertData);

      // 🚀 3. INSERT INTO POSTGRES
      const [newRecord] : any = await db.insert(dailyTasks)
        .values(validatedData)
        .returning();

      res.status(201).json({
        success: true,
        message: 'Daily Task created successfully',
        data: newRecord
      });
      
    } catch (error: any) {
      console.error('Create Daily Task error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create Daily Task',
        // If it ever fails again, this will tell you EXACTLY why Postgres rejected it
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  console.log('✅ Daily Tasks POST endpoints setup complete');
}