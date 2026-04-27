import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://Jan@localhost:5432/miremont";

const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export type Database = typeof db;

export async function notify(userId: string, type: string, title: string, body?: string, link?: string) {
  await db.insert(schema.notifications).values({ userId, type, title, body, link });
}
