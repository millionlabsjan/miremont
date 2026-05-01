import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { eq } from "drizzle-orm";
import { db } from "./db/index";
import { users } from "./db/schema";

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
});

interface PushPayload {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  const [user] = await db
    .select({ pushTokens: users.pushTokens })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const tokens = (user?.pushTokens || []).filter((t) => Expo.isExpoPushToken(t.token));
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  const sentTokens: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
      for (const m of chunk) {
        sentTokens.push(typeof m.to === "string" ? m.to : m.to[0]);
      }
    } catch (err) {
      console.warn("Expo push send failed:", err);
    }
  }

  // Remove tokens that Expo immediately rejected with DeviceNotRegistered
  const invalidTokens = new Set<string>();
  tickets.forEach((ticket, i) => {
    if (
      ticket.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
    ) {
      invalidTokens.add(sentTokens[i]);
    }
  });

  if (invalidTokens.size > 0) {
    const remaining = (user?.pushTokens || []).filter(
      (t) => !invalidTokens.has(t.token)
    );
    await db.update(users).set({ pushTokens: remaining }).where(eq(users.id, userId));
  }
}
