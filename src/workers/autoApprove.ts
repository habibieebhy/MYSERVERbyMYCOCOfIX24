// server/src/workers/autoApprove.ts
import cron from 'node-cron';
import { db } from '../db/db';
import { dailyTasks } from '../db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';

export function setupAutoApproveCron() {
  // Runs at minute 0 past every hour
  cron.schedule('0 1 * * *', async () => {
    console.log('⏳ Running 48-hour auto-approve check for PJPs...');
    
    try {
      const result = await db
        .update(dailyTasks)
        .set({ status: 'Approved' })
        .where(
          and(
            eq(dailyTasks.status, 'Pending'), // The magic check! Ignores anything already approved.
            lte(dailyTasks.createdAt, sql`NOW() - INTERVAL '24 hours'`) 
          )
        );

      console.log(`✅ Auto-approve cycle complete.`);
    } catch (error) {
      console.error('❌ Error in auto-approve cron job:', error);
    }
  });

  console.log('✅ 48-Hour Auto-Approve Worker initialized.');
}