// src/websocket/socketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from '../db/db';
import { journeyOps, journeys, journeyBreadcrumbs, syncState } from '../db/schema'; // Import your schemas
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

// Define the shape of the message we expect from the client
interface WsMessage {
  type: 'SYNC_OPS' | 'PING';
  payload: any;
}

interface IncomingOp {
  opId: string;
  journeyId: string;
  userId: number;
  type: 'START' | 'MOVE' | 'STOP';
  payload: any; // Contains lat, lng, speed, etc.
  appRole?: string;
  createdAt: string;
}

export function attachWebSocket(server: Server) {

  // 🔌 Attach to the EXISTING server instance
  const wss = new WebSocketServer({ server });

  console.log('✅ WebSocket attached to main HTTP server');

  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('🔌 New Client Connected');

    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Server Response: OK' }));

    ws.on('message', async (data) => {
      try {
        const messageString = data.toString();
        const message: WsMessage = JSON.parse(messageString);

        if (message.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        if (message.type === 'SYNC_OPS') {
          await handleSyncOps(ws, message.payload);
        }

      } catch (err) {
        console.error('❌ WS Error:', err);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 Client Disconnected');
    });
  });
}

async function handleSyncOps(ws: WebSocket, ops: IncomingOp[]) {
  const acks = [];

  for (const op of ops) {
    try {
      // WRAP IN TRANSACTION
      // If any part of this block fails, EVERYTHING in it is undone.
      const result = await db.transaction(async (tx) => {

        // 1. Idempotency Check (Inside transaction for safety)
        const [existing] = await tx
          .select()
          .from(journeyOps)
          .where(eq(journeyOps.opId, op.opId));

        if (existing) {
          return {
            status: 'ALREADY_PROCESSED',
            serverSeq: existing.serverSeq
          };
        }

        // 2. Insert into 'journey_ops' (Use 'tx' instead of 'db')
        const [insertedOp] = await tx.insert(journeyOps).values({
          opId: op.opId,
          journeyId: op.journeyId,
          userId: op.userId,
          type: op.type,
          payload: op.payload,
          appRole: op.appRole,
          createdAt: new Date(op.createdAt),
        }).returning({ serverSeq: journeyOps.serverSeq });

        // 3. Process Specific Logic (Use 'tx' instead of 'db')
        if (op.type === 'START') {
          const { siteId, dealerId, siteName, destLat, destLng, pjpId, taskId, verifiedDealerId } = op.payload;

          await tx.insert(journeys).values({
            id: op.journeyId,
            userId: op.userId,
            startTime: new Date(op.createdAt),
            status: 'ACTIVE',
            siteName: siteName || 'N/A Site',
            pjpId: pjpId,
            siteId: siteId,
            dealerId: dealerId,
            taskId: taskId || null,                     
            verifiedDealerId: verifiedDealerId || null, 
            destLat: destLat ? destLat.toString() : null,
            destLng: destLng ? destLng.toString() : null,
            isSynced: true,
            appRole: op.appRole,
            updatedAt: new Date(),
          });

        }

        // the breadcrumbs are not being sent ---- commenting out
        // else if (op.type === 'MOVE') {
        //   const { latitude, longitude, speed, h3Index, accuracy, heading, altitude, batteryLevel } = op.payload;

        //   await tx.insert(journeyBreadcrumbs).values({
        //       id: crypto.randomUUID(),
        //       journeyId: op.journeyId,
        //       latitude: latitude.toString(),
        //       longitude: longitude.toString(),
        //       h3Index: h3Index,
        //       speed: speed,
        //       accuracy: accuracy,
        //       heading: heading,
        //       altitude: altitude,
        //       batteryLevel: batteryLevel,
        //       recordedAt: new Date(op.createdAt),
        //       isSynced: true
        //   });

        // } 
        else if (op.type === 'STOP') {
          // Convert distance comming in m to Km (formatted to 3 decimals)
          const rawDistanceMeters = op.payload.totalDistance || 0.0;
          const distanceKm = (rawDistanceMeters / 1000.0).toFixed(3);

          await tx.update(journeys)
            .set({
              status: 'COMPLETED',
              endTime: new Date(op.createdAt),
              totalDistance: distanceKm.toString(),
              updatedAt: new Date()
            })
            .where(eq(journeys.id, op.journeyId));
        }

        // Return success for this specific Op
        return { status: 'OK', serverSeq: insertedOp.serverSeq };
      });

      // Transaction succeeded, add to ACKs
      acks.push({
        opId: op.opId,
        status: result.status,
        serverSeq: result.serverSeq
      });

    } catch (dbError) {
      console.error(`Failed to process op ${op.opId}:`, dbError);

      // Because we used a transaction, if we land here, the insert into journeyOps 
      // was ROLLED BACK. The client can safely retry!
      acks.push({ opId: op.opId, status: 'FAILED' });
    }
  }

  // Send ACKs back
  ws.send(JSON.stringify({ type: 'ACK', payload: acks }));
}