import { Request, Response, Express } from 'express';
import { db } from '../../db/db';
import { dealers, insertDealerSchema } from '../../db/schema';
import { eq, and, desc, asc, ilike, sql, SQL } from 'drizzle-orm';
import { z } from 'zod';

type TableLike = typeof dealers;

// ---------- helpers ----------
const numberish = (v: unknown) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const boolish = (v: unknown) => {
  if (v === 'true' || v === true) return true;
  if (v === 'false' || v === false) return false;
  return undefined;
};

// normalize brand query to string[]
function extractBrands(q: any): string[] {
  const raw = q.brand ?? q.brands ?? q.brandSelling ?? undefined;
  if (!raw) return [];
  const arr = Array.isArray(raw)
    ? raw
    : String(raw).includes(',')
      ? String(raw).split(',').map(s => s.trim()).filter(Boolean)
      : [String(raw).trim()].filter(Boolean);
  return arr as string[];
}

// safely convert to a Postgres array literal, used as a bound parameter
function toPgArrayLiteral(values: string[]): string {
  return `{${values
    .map(v =>
      String(v)
        .replace(/\\/g, '\\\\')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .trim()
    )
    .join(',')}}`;
}

function createAutoCRUD(app: Express, config: {
  endpoint: string,
  table: TableLike,
  schema: z.ZodSchema,
  tableName: string,
}) {
  const { endpoint, table, tableName } = config;

  const buildWhere = (q: any) => {
    const conds: (SQL | undefined)[] = [];

    // optional filters
    if (q.region) conds.push(eq(table.region, String(q.region)));
    if (q.area) conds.push(eq(table.area, String(q.area)));
    if (q.type) conds.push(eq(table.type, String(q.type)));
    if (q.userId) {
      const uid = numberish(q.userId);
      if (uid !== undefined) conds.push(eq(table.userId, uid));
    }
    if (q.verificationStatus) conds.push(eq(table.verificationStatus, String(q.verificationStatus)));
    if (q.pinCode) conds.push(eq(table.pinCode, String(q.pinCode)));
    if (q.businessType) conds.push(eq(table.businessType, String(q.businessType)));

    // --- ✅ NEW FILTERS ADDED ---
    if (q.nameOfFirm) {
      conds.push(ilike(table.nameOfFirm, `%${String(q.nameOfFirm)}%`));
    }
    if (q.underSalesPromoterName) {
      conds.push(ilike(table.underSalesPromoterName, `%${String(q.underSalesPromoterName)}%`));
    }
    // --- END NEW FILTERS ---

    // hierarchy filters
    const onlyParents = boolish(q.onlyParents);
    const onlySubs = boolish(q.onlySubs);
    const parentDealerId = q.parentDealerId as string | undefined;

    if (parentDealerId) {
      conds.push(eq(table.parentDealerId, parentDealerId));
    } else if (onlyParents) {
      conds.push(sql`${table.parentDealerId} IS NULL`);
    } else if (onlySubs) {
      conds.push(sql`${table.parentDealerId} IS NOT NULL`);
    }

    // lightweight search
    if (q.search) {
      const s = `%${String(q.search).trim()}%`;
      conds.push(
        sql`(${ilike(table.name, s)} 
          OR ${ilike(table.phoneNo, s)} 
          OR ${ilike(table.address, s)} 
          OR ${ilike(table.emailId, s)}
          OR ${ilike(table.nameOfFirm, s)}
          OR ${ilike(table.underSalesPromoterName, s)}
          )`
      );
    }

    // brandSelling filters
    const brands = extractBrands(q);
    if (brands.length) {
      const arrLiteral = toPgArrayLiteral(brands);
      const anyBrand = boolish(q.anyBrand);
      if (anyBrand) {
        conds.push(sql`${table.brandSelling} && ${arrLiteral}::text[]`);
      } else {
        conds.push(sql`${table.brandSelling} @> ${arrLiteral}::text[]`);
      }
    }

    const finalConds = conds.filter(Boolean) as SQL[];
    if (finalConds.length === 0) return undefined;
    return finalConds.length === 1 ? finalConds[0] : and(...finalConds);
  };

  // --- ✅ SORT BY SALES GROWTH ADDED ---
  const buildSort = (sortByRaw?: string, sortDirRaw?: string) => {
    const direction = (sortDirRaw || '').toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Use an explicit switch to be type-safe
    switch (sortByRaw) {
      case 'name':
        return direction === 'asc' ? asc(table.name) : desc(table.name);
      case 'region':
        return direction === 'asc' ? asc(table.region) : desc(table.region);
      case 'area':
        return direction === 'asc' ? asc(table.area) : desc(table.area);
      case 'type':
        return direction === 'asc' ? asc(table.type) : desc(table.type);
      case 'verificationStatus':
      case 'verification_status':
        return direction === 'asc' ? asc(table.verificationStatus) : desc(table.verificationStatus);

      // --- ✅ NEW SORT OPTION ---
      case 'salesGrowthPercentage':
        return direction === 'asc' ? asc(table.salesGrowthPercentage) : desc(table.salesGrowthPercentage);
      // --- END NEW SORT OPTION ---

      case 'createdAt':
        return direction === 'asc' ? asc(table.createdAt) : desc(table.createdAt);
      default:
        // Default to createdAt
        return desc(table.createdAt);
    }
  };
  // --- END FIX ---

  const listHandler = async (req: Request, res: Response, baseWhere?: SQL) => {
    try {
      const { limit = '50', page = '1', sortBy, sortDir, ...filters } = req.query;
      //   console.log('DEALERS LIST HIT', {
      //   rawQuery: req.query,
      //   filters,
      // });
      const lmt = Math.max(1, Math.min(500, parseInt(String(limit), 10) || 50));
      const pg = Math.max(1, parseInt(String(page), 10) || 1);
      const offset = (pg - 1) * lmt;

      const extra = buildWhere(filters);
      const whereCondition = baseWhere ? (extra ? and(baseWhere, extra) : baseWhere) : extra;

      // --- SMART SORT LOGIC ---
      let orderExpr: SQL | any = buildSort(String(sortBy), String(sortDir));

      // If searching AND no specific sort requested, prioritize relevance
      if (filters.search && !sortBy) {
        const s = String(filters.search).trim();
        // Priority: 1. Exact Name match, 2. Starts with Name, 3. Alphabetical
        orderExpr = sql`
          CASE 
            WHEN ${table.name} ILIKE ${s} THEN 0 
            WHEN ${table.name} ILIKE ${s + '%'} THEN 1 
            ELSE 2 
          END, 
          ${table.name} ASC
        `;
      }
      // --- END CHANGE ---

      // 1. Start query
      let q = db.select().from(table).$dynamic();
      // 2. Conditionally apply where
      if (whereCondition) {
        q = q.where(whereCondition);
      }
      // 3. Apply sorting/paging and execute
      const data = await q.orderBy(orderExpr, asc(table.id)).limit(lmt).offset(offset);
      
      res.json({ success: true, page: pg, limit: lmt, count: data.length, data });
    } catch (error) {
      console.error(`Get ${tableName}s error:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to fetch ${tableName}s`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // ===== GET ALL =====
  app.get(`/api/${endpoint}`, (req, res) => listHandler(req, res));

  // ===== GET BY USER =====
  app.get(`/api/${endpoint}/user/:userId`, (req, res) => {
    const uid = numberish(req.params.userId);
    if (uid === undefined) {
      return res.status(400).json({ success: false, error: 'Invalid User ID' });
    }
    const base = eq(table.userId, uid);
    return listHandler(req, res, base);
  });

  // ===== GET BY ID =====
  app.get(`/api/${endpoint}/:id`, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [record] = await db.select().from(table).where(eq(table.id, id)).limit(1);

      if (!record) return res.status(404).json({ success: false, error: `${tableName} not found` });

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

  // ===== GET BY REGION =====
  app.get(`/api/${endpoint}/region/:region`, (req, res) => {
    const base = eq(table.region, String(req.params.region));
    return listHandler(req, res, base);
  });

  // ===== GET BY AREA =====
  app.get(`/api/${endpoint}/area/:area`, (req, res) => {
    const base = eq(table.area, String(req.params.area));
    return listHandler(req, res, base);
  });

  // GET /api/dealers/discovery/nearby?lat=...&lng=...&radius=0.1
  app.get('/api/dealers/discovery/nearby', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      // Default radius to 0.1 km (100 meters) if not provided
      const radiusInKm = parseFloat(req.query.radius as string) || 0.1;

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          error: 'Valid latitude and longitude are required.'
        });
      }

      // Haversine distance formula implementation in Drizzle SQL
      const distanceSql = sql`
        (6371 * acos(
          cos(radians(${lat})) * cos(radians(${dealers.latitude})) * cos(radians(${dealers.longitude}) - radians(${lng})) + 
          sin(radians(${lat})) * sin(radians(${dealers.latitude}))
        ))
      `;

      const nearbyDealers = await db.select({
        id: dealers.id,
        name: dealers.name,
        address: dealers.address,
        phoneNo: dealers.phoneNo,
        type: dealers.type,
        distance: distanceSql, // Calculated distance in KM
      })
        .from(dealers)
        .where(sql`${distanceSql} < ${radiusInKm}`)
        .orderBy(distanceSql)
        .limit(10); // Return top 10 matches

      res.json({
        success: true,
        data: nearbyDealers
      });
    } catch (error) {
      console.error('Dealer Nearby Discovery Error:', error);
      res.status(500).json({
        success: false,
        error: 'Discovery search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

}

export default function setupDealersRoutes(app: Express) {
  createAutoCRUD(app, {
    endpoint: 'dealers',
    table: dealers,
    schema: insertDealerSchema,
    tableName: 'Dealer',
  });
  console.log('✅ Dealers GET endpoints with brandSelling & no default verification filter ready');
}
