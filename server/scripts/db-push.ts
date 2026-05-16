import { db } from '../db';
import { sql } from 'drizzle-orm';
import {
  users, customers, vehicles, fiProducts, deals, dealFiProducts, documents, creditApplications
} from '../../shared/schema';
import { fileURLToPath } from 'url';

// This script pushes the Drizzle schema to the database
async function main() {
  console.log('Pushing schema to database...');
  
  try {
    // Create extensions
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    // Create tables
    const queries = [
      sql`
      CREATE TABLE IF NOT EXISTS ${users} (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        dealership_id INTEGER
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${customers} (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT NOT NULL,
        annual_income NUMERIC,
        employer TEXT,
        credit_score INTEGER
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${vehicles} (
        id SERIAL PRIMARY KEY,
        year INTEGER NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        trim TEXT,
        vin TEXT NOT NULL UNIQUE,
        color TEXT,
        odometer INTEGER NOT NULL,
        price NUMERIC NOT NULL,
        status TEXT NOT NULL DEFAULT 'available'
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${fiProducts} (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        base_price NUMERIC NOT NULL,
        monthly_price NUMERIC,
        category TEXT NOT NULL,
        icon TEXT,
        recommended BOOLEAN DEFAULT FALSE
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${deals} (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        vehicle_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        deal_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        amount NUMERIC NOT NULL,
        down_payment NUMERIC,
        term INTEGER,
        apr REAL,
        monthly_payment NUMERIC,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        progress INTEGER NOT NULL DEFAULT 0,
        current_stage TEXT NOT NULL DEFAULT 'credit-application'
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${dealFiProducts} (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL,
        fi_product_id INTEGER NOT NULL,
        price NUMERIC NOT NULL
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${documents} (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        content JSONB,
        signed_at TIMESTAMP,
        signature_data TEXT,
        "order" INTEGER NOT NULL
      )
      `,
      sql`
      CREATE TABLE IF NOT EXISTS ${creditApplications} (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        annual_income NUMERIC NOT NULL,
        employment_status TEXT NOT NULL,
        employer TEXT NOT NULL,
        job_title TEXT,
        years_employed REAL,
        housing_status TEXT,
        monthly_housing_payment NUMERIC,
        credit_score INTEGER,
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP
      )
      `
    ];

    for (const query of queries) {
      await db.execute(query);
    }

    console.log('Schema pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    process.exit(1);
  }
}

// Only exit if running as a standalone script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(() => {
    console.log("Database push completed successfully");
    process.exit(0);
  });
}