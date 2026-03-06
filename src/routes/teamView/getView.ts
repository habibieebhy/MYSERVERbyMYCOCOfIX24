// src/routes/teamView/getView.ts
import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { users } from '../../db/schema'; 
import { eq, and, sql, inArray } from 'drizzle-orm';

/**
 * Sets up GET routes for Team Hierarchy and Recursive Reporting.
 * * GET /api/team/recursive/:seniorId
 * - Fetches all users who report to the seniorId, directly or indirectly.
 */
export default function setupTeamViewRoutes(app: Express) {

    // Helper to safely convert to a number or undefined
    const numberish = (v: unknown) => {
        if (v === null || v === undefined || v === '') return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };

    app.get('/api/team/recursive/:seniorId', async (req: Request, res: Response) => {
        try {
            const seniorId = numberish(req.params.seniorId);
            
            if (seniorId === undefined) {
                return res.status(400).json({ success: false, error: 'Invalid Senior User ID' });
            }

            /**
             * RECURSIVE CTE LOGIC:
             * 1. Anchor Member: Start with everyone whose reports_to_id is the seniorId.
             * 2. Recursive Member: Find everyone whose reports_to_id is in the previously found set.
             */
            const recursiveQuery = sql`
                WITH RECURSIVE team_hierarchy AS (
                    -- Base case: Direct reports of the senior
                    SELECT id, 1 as depth
                    FROM ${users}
                    WHERE reports_to_id = ${seniorId}

                    UNION ALL

                    -- Recursive case: Reports of the reports
                    SELECT u.id, th.depth + 1
                    FROM ${users} u
                    INNER JOIN team_hierarchy th ON u.reports_to_id = th.id
                )
                SELECT id FROM team_hierarchy
            `;

            // Execute the CTE to get the list of IDs in the downline
            const hierarchyResult = await db.execute(recursiveQuery);
            const downlineIds = hierarchyResult.rows.map(row => row.id as number);

            if (downlineIds.length === 0) {
                return res.json({ 
                    success: true, 
                    count: 0, 
                    data: [], 
                    message: "No juniors found for this user." 
                });
            }

            // Fetch full user details for all discovered IDs
            const teamMembers = await db
                .select()
                .from(users)
                .where(inArray(users.id, downlineIds));

            res.json({
                success: true,
                count: teamMembers.length,
                data: teamMembers
            });

        } catch (error) {
            console.error(`Recursive Team View error:`, error);
            res.status(500).json({
                success: false,
                error: `Failed to fetch team hierarchy`,
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    console.log('✅ Team Hierarchy Recursive GET endpoint setup complete');
}