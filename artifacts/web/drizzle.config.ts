import { config } from "dotenv";
import path from "path";
import { defineConfig } from "drizzle-kit";

config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
