import { db } from './db';
import { sql } from 'drizzle-orm';
import { log } from './vite';

export async function setupDatabase() {
  try {
    log("Creating database extensions...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    log("Database extensions created successfully");
    log("Note: Schema management is now handled by Drizzle");
    log("Tables are created automatically when using Drizzle ORM queries");
    await db.execute(sql`SELECT 1`);
    log("Database connection verified");
    return true;
  } catch (error) {
    log(`Error setting up database: ${error}`, "error");
    return false;
  }
}
