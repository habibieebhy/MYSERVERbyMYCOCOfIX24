// src/routes/updateRoutes/salesmanLeaves.ts
import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { salesmanLeaveApplications } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default function setupLeaveUpdateRoute(app: Express) {
    app.patch('/api/leave-applications/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status, adminRemarks } = req.body;

            if (!['Approved', 'Rejected'].includes(status)) {
                return res.status(400).json({ success: false, error: 'Invalid status' });
            }

            const [updated] = await db
                .update(salesmanLeaveApplications)
                .set({ 
                    status, 
                    adminRemarks, 
                    updatedAt: new Date() 
                })
                .where(eq(salesmanLeaveApplications.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ success: false, error: 'Leave not found' });
            }

            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to update leave' });
        }
    });
}