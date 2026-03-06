//  server/src/routes/dataFetchingRoutes/salesmanLeaveAttendance.ts 
// Leave Applications GET endpoints using createAutoCRUD pattern

import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { salesmanLeaveApplications, insertSalesmanLeaveApplicationSchema } from '../../db/schema';
import { eq, and, desc, gte, lte, SQL } from 'drizzle-orm';
import { any, z } from 'zod';

function createAutoCRUD(app: Express, config: {
  endpoint: string,
  table: any,
  schema: z.ZodSchema,
  tableName: string,
  autoFields?: { [key: string]: () => any },
  dateField?: string
}) {
  const { endpoint, table, schema, tableName, autoFields = {}, dateField } = config;

  // GET ALL - with optional filtering and date range
  app.get(`/api/${endpoint}`, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, limit = '50', userId, leaveType, status, appRole, ...filters } = req.query;

      let whereCondition: any = undefined;

      // Date range filtering using startDate
      if (startDate && endDate && dateField && table[dateField]) {
        whereCondition = and(
          gte(table[dateField], startDate as string),
          lte(table[dateField], endDate as string)
        );
      }

      // Filter by userId
      if (userId) {
        whereCondition = whereCondition 
          ? and(whereCondition, eq(table.userId, parseInt(userId as string)))
          : eq(table.userId, parseInt(userId as string));
      }

      // Filter by leaveType
      if (leaveType) {
        whereCondition = whereCondition 
          ? and(whereCondition, eq(table.leaveType, leaveType as string))
          : eq(table.leaveType, leaveType as string);
      }

      // Filter by status
      if (status) {
        whereCondition = whereCondition 
          ? and(whereCondition, eq(table.status, status as string))
          : eq(table.status, status as string);
      }

      // Filter by appRole explicitly
      if (appRole) {
        whereCondition = whereCondition 
          ? and(whereCondition, eq(table.appRole, appRole as string))
          : eq(table.appRole, appRole as string);
      }

      // Additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && table[key]) {
          if (key === 'userId') {
            whereCondition = whereCondition
              ? and(whereCondition, eq(table[key], parseInt(value as string)))
              : eq(table[key], parseInt(value as string));
          } else {
            whereCondition = whereCondition
              ? and(whereCondition, eq(table[key], value))
              : eq(table[key], value);
          }
        }
      });

      let query:any = db.select().from(table);
      
      if (whereCondition) {
        query = query.where(whereCondition);
      }

      const orderField = table[dateField as any] || table.createdAt;
      const records = await query
        .orderBy(desc(orderField))
        .limit(parseInt(limit as string));

      res.json({ success: true, data: records });
    } catch (error) {
      console.error(`Get ${tableName}s error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}s`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET BY User ID
  app.get(`/api/${endpoint}/user/:userId`, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate, limit = '50', status, leaveType, appRole, } = req.query;

      let whereCondition: (SQL|undefined) = eq(table.userId, parseInt(userId));

      // Date range filtering
      if (startDate && endDate && dateField && table[dateField]) {
        whereCondition = and(
          whereCondition,
          gte(table[dateField], startDate as string),
          lte(table[dateField], endDate as string)
        );
      }

      if (status) {
        whereCondition = and(whereCondition, eq(table.status, status as string));
      }
      if (leaveType) {
        whereCondition = and(whereCondition, eq(table.leaveType, leaveType as string));
      }
      if (appRole) {
        whereCondition = and(whereCondition, eq(table.appRole, appRole as string));
      }

      const orderField = table[dateField as any] || table.createdAt;
      const records = await db.select().from(table)
        .where(whereCondition)
        .orderBy(desc(orderField))
        .limit(parseInt(limit as string));

      res.json({ success: true, data: records });
    } catch (error) {
      console.error(`Get ${tableName}s by User error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}s`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET BY ID
  app.get(`/api/${endpoint}/:id`, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [record] = await db.select().from(table).where(eq(table.id, id)).limit(1);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: `${tableName} not found`
        });
      }

      res.json({ success: true, data: record });
    } catch (error) {
      console.error(`Get ${tableName} error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // GET BY Status
  app.get(`/api/${endpoint}/status/:status`, async (req: Request, res: Response) => {
    try {
      const { status } = req.params;
      const { startDate, endDate, limit = '50', userId, leaveType, appRole } = req.query;

      let whereCondition: (SQL|undefined) = eq(table.status, status);

      // Date range filtering
      if (startDate && endDate && dateField && table[dateField]) {
        whereCondition  = and(
          whereCondition,
          gte(table[dateField], startDate as string),
          lte(table[dateField], endDate as string)
        );
      }

      if (userId) {
        whereCondition = and(whereCondition, eq(table.userId, parseInt(userId as string)));
      }
      if (leaveType) {
        whereCondition = and(whereCondition, eq(table.leaveType, leaveType as string));
      }
      if (appRole) {
        whereCondition = and(whereCondition, eq(table.appRole, appRole as string));
      }

      const orderField = table[dateField as any] || table.createdAt;
      const records = await db.select().from(table)
        .where(whereCondition)
        .orderBy(desc(orderField))
        .limit(parseInt(limit as string));

      res.json({ success: true, data: records });
    } catch (error) {
      console.error(`Get ${tableName}s by Status error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}s`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

}

// Function call in the same file
export default function setupSalesmanLeaveApplicationsRoutes(app: Express) {
  // Leave Applications - date field for filtering
  createAutoCRUD(app, {
    endpoint: 'leave-applications',
    table: salesmanLeaveApplications,
    schema: insertSalesmanLeaveApplicationSchema,
    tableName: 'Leave Application',
    dateField: 'startDate',
    autoFields: {
      status: () => 'Pending' // default status
    }
  });
  
  console.log('✅ Salesman Leave Applications GET endpoints setup complete');
}