// server/src/routes/updateRoutes/dailytask.ts
// Endpoint for partially updating a Daily Task.

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { dailyTasks, insertDailyTaskSchema } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Create a partial schema for validation. This allows any subset of fields to be sent.
const dailyTaskUpdateSchema = insertDailyTaskSchema.partial();

export default function setupDailyTaskPatchRoutes(app: Express) {

  // PATCH /api/daily-tasks/:id
  app.patch('/api/daily-tasks/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 1. Validate the incoming data against the partial schema
      const validatedData = dailyTaskUpdateSchema.parse(req.body);

      // If the body is empty, there's nothing to update.
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update were provided.',
        });
      }

      // 2. Check if the task exists before trying to update
      const [existingTask] = await db.select().from(dailyTasks).where(eq(dailyTasks.id, id)).limit(1);

      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: `Daily Task with ID '${id}' not found.`,
        });
      }

      // 3. Perform the update
      const [updatedTask] = await db
        .update(dailyTasks)
        .set({
          ...validatedData,
        })
        .where(eq(dailyTasks.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Daily Task updated successfully',
        data: updatedTask,
      });

    } catch (error) {
      // Handle validation errors from Zod
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues,
        });
      }

      console.error('Update Daily Task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update Daily Task',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // PATCH /api/daily-tasks/bulk-status
  app.patch('/api/daily-tasks/bulk-status', async (req: Request, res: Response) => {
    try {
      const { taskIds, status } = req.body;

      // 1. Validate inputs
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'An array of taskIds is required.',
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'A status string is required.',
        });
      }

      // 2. Perform the bulk update in ONE database query
      const updatedTasks = await db
        .update(dailyTasks)
        .set({ status, updatedAt: new Date() })
        .where(inArray(dailyTasks.id, taskIds))
        .returning({ id: dailyTasks.id }); // Only return IDs to keep the payload tiny

      res.json({
        success: true,
        message: `Successfully updated ${updatedTasks.length} tasks`,
        updatedCount: updatedTasks.length,
      });

    } catch (error) {
      console.error('Bulk Update Daily Task error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk update tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('✅ Daily Tasks PATCH endpoints setup complete');
}