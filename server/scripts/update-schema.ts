import { db } from '../db';
import { sql } from 'drizzle-orm';
import { log } from '../vite';

export async function updateSchema() {
  try {
    log("Running database schema updates...");
    
    // Start a transaction
    await db.execute(sql`BEGIN`);
    
    // Update users table
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
    `);
    
    // Create product providers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        api_endpoint TEXT,
        api_key TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        logo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Update fi_products table
    await db.execute(sql`
      ALTER TABLE fi_products 
      ADD COLUMN IF NOT EXISTS provider_id INTEGER REFERENCES product_providers(id),
      ADD COLUMN IF NOT EXISTS provider_product_code TEXT,
      ADD COLUMN IF NOT EXISTS commission_rate NUMERIC;
    `);
    
    // Create integration providers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS integration_providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        description TEXT,
        api_endpoint TEXT,
        api_key TEXT,
        username TEXT,
        password TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        config_options JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create credit submissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS credit_submissions (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL REFERENCES deals(id),
        credit_application_id INTEGER NOT NULL REFERENCES credit_applications(id),
        provider_id INTEGER NOT NULL REFERENCES integration_providers(id),
        submission_data JSONB NOT NULL,
        status TEXT NOT NULL,
        provider_reference_id TEXT,
        response_data JSONB,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        approval_amount NUMERIC,
        term INTEGER,
        apr REAL,
        bank_name TEXT,
        bank_id TEXT,
        notes TEXT
      );
    `);
    
    // Commit the transaction
    await db.execute(sql`COMMIT`);
    
    log("Database schema update complete");
    return true;
  } catch (error) {
    // Rollback on error
    await db.execute(sql`ROLLBACK`);
    log(`Error updating database schema: ${error}`, "error");
    return false;
  }
}

// Allow script to be run directly from command line
// This check is performed differently in ES modules
import { fileURLToPath } from 'url';

// Check if this file is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateSchema()
    .then(() => {
      console.log("Schema update completed successfully");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error running schema update:", err);
      process.exit(1);
    });
}