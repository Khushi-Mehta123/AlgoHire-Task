import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const db = new Pool({
  connectionString: databaseUrl,
  max: 30,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});
