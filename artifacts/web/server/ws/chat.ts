import { WebSocketServer, WebSocket } from "ws";
import { db } from "../db/index";
import { messages, messageReads, inquiries } from "../db/schema";
import { eq, and, or, ne } from "drizzle-orm";
import type { IncomingMessage } from "http";

interface AuthenticatedWS extends WebSocket {
  userId?: string;
  inquiryIds?: Set<string>;
}

const clients = new Map<string, Set<AuthenticatedWS>>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws: AuthenticatedWS, req: IncomingMessage) => {
    // Parse session cookie for auth (simplified — in production use session middleware)
    ws.inquiryIds = new Set();

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case "auth": {
            ws.userId = msg.userId;
            if (!clients.has(msg.userId)) {
              clients.set(msg.userId, new Set());
            }
            clients.get(msg.userId)!.add(ws);
            ws.send(JSON.stringify({ type: "auth_ok" }));
            break;
          }

          case "join_inquiry": {
            if (!ws.userId) {
              ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
              return;
            }

            // Verify user is part of this inquiry
            const [inquiry] = await db
              .select()
              .from(inquiries)
              .where(eq(inquiries.id, msg.inquiryId))
              .limit(1);

            if (
              inquiry &&
              (inquiry.buyerId === ws.userId || inquiry.agentId === ws.userId)
            ) {
              ws.inquiryIds!.add(msg.inquiryId);
              ws.send(
                JSON.stringify({ type: "joined", inquiryId: msg.inquiryId })
              );
            }
            break;
          }

          case "send_message": {
            if (!ws.userId) return;

            const [newMsg] = await db
              .insert(messages)
              .values({
                inquiryId: msg.inquiryId,
                senderId: ws.userId,
                content: msg.content,
                attachments: msg.attachments,
              })
              .returning();

            await db
              .update(inquiries)
              .set({ updatedAt: new Date() })
              .where(eq(inquiries.id, msg.inquiryId));

            // Get the inquiry to find the other party
            const [inq] = await db
              .select()
              .from(inquiries)
              .where(eq(inquiries.id, msg.inquiryId))
              .limit(1);

            if (inq) {
              const recipientId =
                inq.buyerId === ws.userId ? inq.agentId : inq.buyerId;

              // Send to all connected clients of both parties
              const payload = JSON.stringify({
                type: "new_message",
                message: newMsg,
              });

              for (const uid of [ws.userId, recipientId]) {
                const sockets = clients.get(uid);
                if (sockets) {
                  for (const s of sockets) {
                    if (s.readyState === WebSocket.OPEN) {
                      s.send(payload);
                    }
                  }
                }
              }

              // Chat replies surface via the WebSocket broadcast above + the chat
              // tab badge — intentionally no bell notification, push, or digest entry
              // to avoid duplicate signals.
            }
            break;
          }

          case "mark_read": {
            if (!ws.userId || !msg.messageIds?.length) return;

            // Insert into message_reads
            await db.insert(messageReads)
              .values(msg.messageIds.map((mid: string) => ({ messageId: mid, userId: ws.userId! })))
              .onConflictDoNothing();

            // Legacy compat
            await db.update(messages).set({ isRead: true }).where(
              and(
                eq(messages.inquiryId, msg.inquiryId),
                eq(messages.isRead, false),
                ne(messages.senderId, ws.userId!)
              )
            );

            // Notify the other party
            const [inq] = await db
              .select()
              .from(inquiries)
              .where(eq(inquiries.id, msg.inquiryId))
              .limit(1);

            if (inq) {
              const otherId =
                inq.buyerId === ws.userId ? inq.agentId : inq.buyerId;
              const sockets = clients.get(otherId);
              if (sockets) {
                const payload = JSON.stringify({
                  type: "messages_read",
                  inquiryId: msg.inquiryId,
                  readBy: ws.userId,
                });
                for (const s of sockets) {
                  if (s.readyState === WebSocket.OPEN) s.send(payload);
                }
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        const sockets = clients.get(ws.userId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) clients.delete(ws.userId);
        }
      }
    });
  });
}
