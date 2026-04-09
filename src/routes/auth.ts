// server/src/routes/auth.ts
// HARD DEVICE BINDING – ADMIN CONTROLLED

import { Request, Response, Express, NextFunction } from 'express';
import { db } from '../db/db';
import { users, companies } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import pkg from 'jsonwebtoken';

const { sign, verify } = pkg;

// Helper function to safely convert BigInt to JSON
function toJsonSafe(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

// --------------------------------------------------
// JWT Verification Middleware
// --------------------------------------------------
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is missing' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  verify(token, process.env.JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    (req as any).user = user;
    next();
  });
};

// --------------------------------------------------
// ROUTES
// --------------------------------------------------
export default function setupAuthRoutes(app: Express) {
  // --------------------------------------------------
  // LOGIN (HARD DEVICE BINDING)
  // --------------------------------------------------
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const loginId = String(req.body?.loginId ?? '').trim();
      const password = String(req.body?.password ?? '');
      const incomingDeviceId = String(req.body?.deviceId ?? '').trim();
      const incomingFcmToken = String(req.body?.fcmToken ?? '').trim();

      if (!loginId || !password) {
        return res
          .status(400)
          .json({ error: 'Login ID and password are required' });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // Fetch user
      const [row] = await db
        .select({
          id: users.id,
          email: users.email,
          status: users.status,
          role: users.role,
          deviceId: users.deviceId,
          fcmToken: users.fcmToken,
          
          // Salesman Credentials
          salesmanLoginId: users.salesmanLoginId,
          hashedPassword: users.hashedPassword,
          
          // Tech Credentials
          isTechnicalRole: users.isTechnicalRole,
          techLoginId: users.techLoginId,
          techHashPassword: users.techHashPassword,

          // Admin App Credentials 
          isAdminAppUser: users.isAdminAppUser,
          adminAppLoginId: users.adminAppLoginId,
          adminAppHashedPassword: users.adminAppHashedPassword,
        })
        .from(users)
        .where(
          or(
            eq(users.salesmanLoginId, loginId),
            eq(users.email, loginId),
            eq(users.techLoginId, loginId),
            eq(users.adminAppLoginId, loginId) 
          )
        )
        .limit(1);

      if (!row) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (row.status !== 'active') {
        return res.status(401).json({ error: 'Account is not active' });
      }

      // 🔒 HARD DEVICE LOCK (NO OVERRIDE)
      // if (row.deviceId && row.deviceId !== incomingDeviceId) {
      //   return res.status(403).json({
      //     code: 'DEVICE_LOCKED',
      //     error:
      //       'This account is locked to another device. Please contact admin.',
      //   });
      // }

      // Password validation
      // Password Validation (Check all 3 possibilities)
      let isAuthenticated = false;

      // A. Salesman Check
      if (row.hashedPassword && row.hashedPassword === password && row.salesmanLoginId === loginId) {
        isAuthenticated = true;
      }

      // B. Technical Check
      else if (
        row.isTechnicalRole && 
        row.techLoginId === loginId && 
        row.techHashPassword === password
      ) {
        isAuthenticated = true;
      }

      // C. Admin App Check 
      else if (
        row.isAdminAppUser &&
        row.adminAppLoginId === loginId &&
        row.adminAppHashedPassword === password
      ) {
        isAuthenticated = true;
      }

      if (!isAuthenticated) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Bind device on successful login
      await db
        .update(users)
        .set({
          // deviceId: incomingDeviceId,
          deviceId: null,
          fcmToken: incomingFcmToken || row.fcmToken,
        })
        .where(eq(users.id, row.id));

      // Create JWT
      const token = sign(
        { id: row.id, email: row.email, role: row.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        userId: row.id,
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  // --------------------------------------------------
  // USER PROFILE
  // --------------------------------------------------
  app.get('/api/users/:id', verifyToken, async (req: Request, res: Response) => {
    try {
      const userId = Number(req.params.id);
      const tokenUser = (req as any).user;

      if (!userId || tokenUser.id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          phoneNumber: users.phoneNumber,
          companyId: users.companyId,
          companyName: companies.companyName,
          region: users.region,
          area: users.area,
          salesmanLoginId: users.salesmanLoginId,
          status: users.status,
          reportsToId: users.reportsToId,
          noOfPJP: users.noOfPjp,
          isTechnicalRole: users.isTechnicalRole,
          techLoginId: users.techLoginId,
          isAdminAppUser: users.isAdminAppUser,
          adminAppLoginId: users.adminAppLoginId,
        })
        .from(users)
        .leftJoin(companies, eq(companies.id, users.companyId))
        .where(eq(users.id, userId))
        .limit(1);

      if (!rows.length) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ data: toJsonSafe(rows[0]) });
    } catch (err) {
      console.error('Profile error:', err);
      res.status(500).json({ error: 'Failed to load user' });
    }
  });

  // --------------------------------------------------
  // DEVICE SYNC (ADMIN / SYSTEM USE)
  // --------------------------------------------------
  app.put('/api/users/device', verifyToken, async (req: Request, res: Response) => {
    try {
      const { userId, fcmToken, deviceId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      await db
        .update(users)
        .set({
          // deviceId: deviceId ?? null,
          deviceId: null,
          fcmToken: fcmToken ?? null,
        })
        .where(eq(users.id, userId));

      return res.json({
        success: true,
        message: 'Device binding updated',
      });
    } catch (err) {
      console.error('Device sync error:', err);
      res.status(500).json({ error: 'Failed to sync device' });
    }
  });

  console.log('✅ Auth routes loaded');
}