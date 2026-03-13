// server/src/routes/users.ts
// Users GET endpoints using a DRY (Don't Repeat Yourself) approach.

import { Request, Response, Express } from 'express';
import { db } from '../db/db';
import { users, insertUserSchema } from '../db/schema';
// --- ✅ 1. IMPORT 'ilike' ---
import { eq, and, desc, like, or, SQL, ilike } from 'drizzle-orm';
import { z, ZodType } from 'zod';

// Helper function to safely convert BigInt to JSON
function toJsonSafe(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

/*
 * 123Defines the set of user fields that are safe to return to the public.
 * This object is reused in all 'select' queries to ensure consistency
 * and prevent accidental exposure of sensitive data like 'hashedPassword'.
 */
const userPublicSelect = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  phoneNumber: users.phoneNumber,
  region: users.region,
  area: users.area,
  salesmanLoginId: users.salesmanLoginId,
  status: users.status,
  companyId: users.companyId,
  reportsToId: users.reportsToId,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  workosUserId: users.workosUserId,
  inviteToken: users.inviteToken,
  noOfPJP: users.noOfPJP,
  isTechnicalRole: users.isTechnicalRole,
  techLoginId: users.techLoginId,
  isAdminAppUser: users.isAdminAppUser,
  adminAppLoginId: users.adminAppLoginId,
};

function parseBooleanQuery(value?: string | string[] | undefined): boolean | undefined {
  if (typeof value === 'undefined') return undefined;
  const s = String(value).trim().toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

function createAutoCRUD(app: Express, config: {
  endpoint: string,
  table: any,
  schema: z.ZodSchema,
  tableName: string,
}) {
  const { endpoint, table, schema, tableName } = config;

  /**
   * GET /api/users
   * Fetches all users with extensive filtering and search capabilities.
   * Query Params:
   * - limit (number, default 50)
   * - role (string)
   * - region (string)
   * - area (string)
   * - status (string)
   * - companyId (number)
   * - reportsToId (number)
   * - search (string) - Searches email, firstName, and lastName (case-insensitive)
   * - isTechnical / isTechnicalRole (boolean) - Filter by the isTechnicalRole column
   */
  app.get(`/api/${endpoint}`, async (req: Request, res: Response) => {
    try {
      const {
        limit = '50',
        role,
        region,
        area,
        status,
        companyId,
        reportsToId,
        search,
        isTechnical,
        isTechnicalRole,
      } = req.query;

      let conditions: SQL[] = [];

      // Search by name or email (partial, case-insensitive match)
      if (search) {
        const searchPattern = `%${String(search).trim()}%`;
        conditions.push(
          or(
            ilike(table.email, searchPattern),
            ilike(table.firstName, searchPattern),
            ilike(table.lastName, searchPattern)
          )!
        );
      }

      // Add filters for specific fields
      if (role) conditions.push(eq(table.role, role as string));
      if (region) conditions.push(eq(table.region, region as string));
      if (area) conditions.push(eq(table.area, area as string));
      if (status) conditions.push(eq(table.status, status as string));
      
      // Handle numeric filters with parsing
      if (companyId) {
        const id = parseInt(companyId as string, 10);
        if (!isNaN(id)) conditions.push(eq(table.companyId, id));
      }
      if (reportsToId) {
        const id = parseInt(reportsToId as string, 10);
        if (!isNaN(id)) conditions.push(eq(table.reportsToId, id));
      }

      // --- New: filter by isTechnicalRole boolean column ---
      // Accepts isTechnical=true/false or isTechnicalRole=true/false or 1/0
      const parsedIsTech = parseBooleanQuery(isTechnical as any) ?? parseBooleanQuery(isTechnicalRole as any);
      if (typeof parsedIsTech === 'boolean') {
        conditions.push(eq(table.isTechnicalRole, parsedIsTech));
      }
      // --- End new filter ---

      // 1. Create a base query that selects our consistent public fields.
      const baseQuery = db.select(userPublicSelect).from(table);

      // 2. Use .$dynamic() to allow conditional 'where'
      let query = baseQuery.$dynamic();

      // 3. Apply the 'where' clause only if conditions exist.
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // 4. Chain final methods and execute.
      const records = await query
        .orderBy(desc(table.createdAt))
        .limit(parseInt(limit as string));

      res.json({ success: true, data: toJsonSafe(records) });
    } catch (error) {
      console.error(`Get ${tableName}s error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}s`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/users/company/:companyId
   * Fetches users for a specific company, with optional sub-filtering.
   * Accepts same filters as /api/users, including isTechnical/isTechnicalRole.
   */
  app.get(`/api/${endpoint}/company/:companyId`, async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.companyId, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ success: false, error: 'Invalid company id' });
      }
      
      const { limit = '50', role, region, area, status, isTechnical, isTechnicalRole } = req.query;

      // Start with the mandatory companyId condition
      let conditions: SQL[] = [eq(table.companyId, companyId)];

      // Add optional filters
      if (role) conditions.push(eq(table.role, role as string));
      if (region) conditions.push(eq(table.region, region as string));
      if (area) conditions.push(eq(table.area, area as string));
      if (status) conditions.push(eq(table.status, status as string));

      // --- New: filter by isTechnicalRole boolean column in company route ---
      const parsedIsTech = parseBooleanQuery(isTechnical as any) ?? parseBooleanQuery(isTechnicalRole as any);
      if (typeof parsedIsTech === 'boolean') {
        conditions.push(eq(table.isTechnicalRole, parsedIsTech));
      }
      // --- End new filter ---

      const records = await db.select(userPublicSelect)
        .from(table)
        .where(and(...conditions))
        .orderBy(desc(table.createdAt))
        .limit(parseInt(limit as string));

      res.json({ success: true, data: toJsonSafe(records) });
    } catch (error) {
      console.error(`Get ${tableName}s by Company error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}s`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/users/:id
   * Fetches a single user by their primary key.
   */
  app.get(`/api/${endpoint}/:id`, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
          return res.status(400).json({ success: false, error: 'Invalid user id' });
      }

      // Use the consistent 'userPublicSelect'
      const [record] = await db.select(userPublicSelect)
        .from(table)
        .where(eq(table.id, id))
        .limit(1);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: `${tableName} not found`
        });
      }

      res.json({ success: true, data: toJsonSafe(record) });
    } catch (error) {
      console.error(`Get ${tableName} error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Removed redundant /role/:role and /region/:region routes.
  // The main /api/users endpoint handles this filtering.
}

// Function call in the same file
export default function setupUsersRoutes(app: Express) {
  createAutoCRUD(app, {
    endpoint: 'users',
    table: users,
    schema: insertUserSchema as ZodType<any>,
    tableName: 'User',
  });

  console.log('✅ Users GET endpoints setup complete');
}