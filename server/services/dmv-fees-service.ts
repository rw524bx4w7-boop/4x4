import axios from 'axios';
import { JSDOM } from 'jsdom';
import { log } from '../vite';
import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Structured interfaces for DMV fee data
 */
export interface StateFees {
  state: string
  stateCode: string;
  baseRegistrationFee: number;
  titleFee: number;
  platesFee: number;
  inspectionFee?: number;
  emissionsFee?: number;
  docFee: number;
  evFee?: number;
  hybridFee?: number;
  luxuryTax?: number;
  rvrFee?: number;
  weightBasedFees?: WeightBasedFee[];
  valueBasedFees?: ValueBasedFee[];
  countyFees?: CountyFee[];
  sourceUrl: string;
  lastUpdated: Date;
}

interface WeightBasedFee {
  minWeight: number;
  maxWeight: number;
  fee: number;
}

interface ValueBasedFee {
  minValue: number;
  maxValue: number;
  feePercentage: number;
}

interface CountyFee {
  countyName: string;
  additionalFee: number;
}

let dmvFeeCache: Map<string, StateFees> = new Map();

export async function initializeDmvFeeTables() {
  try {
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dmv_fees'
      );
    `);
    
    if (!tableExists.rows[0]?.exists) {
      await db.execute(sql`
        CREATE TABLE dmv_fees (
          id SERIAL PRIMARY KEY,
          state_code VARCHAR(2) NOT NULL UNIQUE,
          state_name VARCHAR(50) NOT NULL,
          base_registration_fee DECIMAL(10, 2) NOT NULL,
          title_fee DECIMAL(10, 2) NOT NULL,
          plates_fee DECIMAL(10, 2) NOT NULL,
          inspection_fee DECIMAL(10, 2),
          emissions_fee DECIMAL(10, 2),
          doc_fee DECIMAL(10, 2) NOT NULL,
          ev_fee DECIMAL(10, 2),
          hybrid_fee DECIMAL(10, 2),
          luxury_tax DECIMAL(10, 2),
          source_url TEXT NOT NULL,
          last_updated TIMESTAMPTZ NOT NULL
        )
      `);
      
      await db.execute(sql`
        CREATE TABLE dmv_weight_fees (
          id SERIAL PRIMARY KEY,
          state_code VARCHAR(2) NOT NULL,
          min_weight INTEGER NOT NULL,
          max_weight INTEGER NOT NULL,
          fee DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (state_code) REFERENCES dmv_fees(state_code) ON DELETE CASCADE
        )
      `);
      
      await db.execute(sql`
        CREATE TABLE dmv_value_fees (
          id SERIAL PRIMARY KEY,
          state_code VARCHAR(2) NOT NULL,
          min_value INTEGER NOT NULL,
          max_value INTEGER NOT NULL,
          fee_percentage DECIMAL(10, 4) NOT NULL,
          FOREIGN KEY (state_code) REFERENCES dmv_fees(state_code) ON DELETE CASCADE
        )
      `);
      
      await db.execute(sql`
        CREATE TABLE dmv_county_fees (
          id SERIAL PRIMARY KEY,
          state_code VARCHAR(2) NOT NULL,
          county_name VARCHAR(100) NOT NULL,
          additional_fee DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (state_code) REFERENCES dmv_fees(state_code) ON DELETE CASCADE
        )
      `);
      
      log('Created DMV fee tables', 'info');
    }
  } catch (error) {
    log(`Error initializing DMV fee tables: ${error}`, 'error');
  }
}

export async function getDmvFees(stateCode: string): Promise<StateFees | null> {
  if (!stateCode) {
    log(`Cannot retrieve DMV fees: state code is undefined or empty`, 'error');
    return null;
  }
  
  stateCode = stateCode.toUpperCase();
  
  if (dmvFeeCache.has(stateCode)) {
    return dmvFeeCache.get(stateCode)!;
  }
  
  try {
    const result = await db.execute(sql`
      SELECT * FROM dmv_fees WHERE state_code = ${stateCode}
    `);
    
    if (result.rows.length === 0) {
      return await fetchDmvFeesFromSource(stateCode);
    }
    
    const feeData = result.rows[0];
    
    const weightFeesResult = await db.execute(sql`
      SELECT min_weight, max_weight, fee 
      FROM dmv_weight_fees 
      WHERE state_code = ${stateCode}
    `);
    
    const valueFeesResult = await db.execute(sql`
      SELECT min_value, max_value, fee_percentage 
      FROM dmv_value_fees 
      WHERE state_code = ${stateCode}
    `);
    
    const countyFeesResult = await db.execute(sql`
      SELECT county_name, additional_fee 
      FROM dmv_county_fees 
      WHERE state_code = ${stateCode}
    `);
    
    const stateFees: StateFees = {
      state: String(feeData.state_name || ''),
      stateCode: String(feeData.state_code || ''),
      baseRegistrationFee: parseFloat(String(feeData.base_registration_fee || 0)),
      titleFee: parseFloat(String(feeData.title_fee || 0)),
      platesFee: parseFloat(String(feeData.plates_fee || 0)),
      docFee: parseFloat(String(feeData.doc_fee || 0)),
      sourceUrl: String(feeData.source_url || ''),
      lastUpdated: new Date(String(feeData.last_updated || new Date()))
    };
    
    if (feeData.inspection_fee) stateFees.inspectionFee = parseFloat(String(feeData.inspection_fee || 0));
    if (feeData.emissions_fee) stateFees.emissionsFee = parseFloat(String(feeData.emissions_fee || 0));
    if (feeData.ev_fee) stateFees.evFee = parseFloat(String(feeData.ev_fee || 0));
    if (feeData.hybrid_fee) stateFees.hybridFee = parseFloat(String(feeData.hybrid_fee || 0));
    if (feeData.luxury_tax) stateFees.luxuryTax = parseFloat(String(feeData.luxury_tax || 0));
    if (feeData.rv_fee) stateFees.rvrFee = parseFloat(String(feeData.rv_fee || 0));
    
    if (weightFeesResult.rows.length > 0) {
      stateFees.weightBasedFees = weightFeesResult.rows.map(row => ({
        minWeight: parseInt(String(row.min_weight || 0)),
        maxWeight: parseInt(String(row.max_weight || 0)),
        fee: parseFloat(String(row.fee || 0))
      }));
    }
    
    if (valueFeesResult.rows.length > 0) {
      stateFees.valueBasedFees = valueFeesResult.rows.map(row => ({
        minValue: parseInt(String(row.min_value || 0)),
        maxValue: parseInt(String(row.max_value || 0)),
        feePercentage: parseFloat(String(row.fee_percentage || 0))
      }));
    }
    
    if (countyFeesResult.rows.length > 0) {
      stateFees.countyFees = countyFeesResult.rows.map(row => ({
        countyName: String(row.county_name || ''),
        additionalFee: parseFloat(String(row.additional_fee || 0))
      }));
    }
    
    dmvFeeCache.set(stateCode, stateFees);
    
    return stateFees;
  } catch (error) {
    log(`Error retrieving DMV fees for ${stateCode}: ${error}`, 'error');
    return null;
  }
}

export async function fetchDmvFeesFromSource(stateCode: string): Promise<StateFees | null> {
  try {
    log(`DMV scraping disabled for ${stateCode} - using default fee structure`, 'info');
    
    if (stateCode === 'CO') {
      return await createDefaultCOFees();
    }
    
    return null;
  } catch (error) {
    log(`Error creating default DMV fees for ${stateCode}: ${error}`, 'error');
    return null;
  }
}

async function createDefaultCOFees(): Promise<StateFees | null> {
  try {
    const baseRegistrationFee = 26.50;
    const titleFee = 7.20;
    const platesFee = 8.06;
    const evFee = 50.00;
    
    const weightBasedFees: WeightBasedFee[] = [
      { minWeight: 0, maxWeight: 2000, fee: 6.00 },
      { minWeight: 2001, maxWeight: 5000, fee: 10.00 },
      { minWeight: 5001, maxWeight: 10000, fee: 15.00 },
      { minWeight: 10001, maxWeight: 16000, fee: 25.00 },
      { minWeight: 16001, maxWeight: 80000, fee: 50.00 }
    ];
    
    const countyFees: CountyFee[] = [
      { countyName: 'Denver', additionalFee: 10.00 },
      { countyName: 'Arapahoe', additionalFee: 7.00 },
      { countyName: 'Jefferson', additionalFee: 6.50 },
      { countyName: 'Adams', additionalFee: 6.00 },
      { countyName: 'Boulder', additionalFee: 5.00 },
      { countyName: 'Larimer', additionalFee: 4.50 }
    ];
    
    const fees: StateFees = {
      state: 'Colorado',
      stateCode: 'CO',
      baseRegistrationFee,
      titleFee,
      platesFee,
      inspectionFee: 0,
      emissionsFee: 25.00,
      docFee: 0,
      evFee,
      weightBasedFees,
      countyFees,
      sourceUrl: 'default-data',
      lastUpdated: new Date()
    };
    
    await storeDmvFees(fees);
    dmvFeeCache.set('CO', fees);
    
    return fees;
  } catch (error) {
    log(`Error creating default Colorado DMV fees: ${error}`, 'error');
    return null;
  }
}

async function storeDmvFees(fees: StateFees): Promise<void> {
  try {
    await db.execute(sql`BEGIN`);
    await db.execute(sql`DELETE FROM dmv_fees WHERE state_code = ${fees.stateCode}`);
    
    await db.execute(sql`
      INSERT INTO dmv_fees (
        state_code, state_name, base_registration_fee, title_fee, plates_fee,
        inspection_fee, emissions_fee, doc_fee, ev_fee, hybrid_fee, luxury_tax,
        source_url, last_updated
      ) VALUES (
        ${fees.stateCode}, ${fees.state}, ${fees.baseRegistrationFee}, ${fees.titleFee}, ${fees.platesFee},
        ${fees.inspectionFee || null}, ${fees.emissionsFee || null}, ${fees.docFee}, ${fees.evFee || null}, 
        ${fees.hybridFee || null}, ${fees.luxuryTax || null}, ${fees.sourceUrl}, ${fees.lastUpdated}
      )
    `);
    
    if (fees.weightBasedFees && fees.weightBasedFees.length > 0) {
      for (const wbf of fees.weightBasedFees) {
        await db.execute(sql`
          INSERT INTO dmv_weight_fees (state_code, min_weight, max_weight, fee)
          VALUES (${fees.stateCode}, ${wbf.minWeight}, ${wbf.maxWeight}, ${wbf.fee})
        `);
      }
    }
    
    if (fees.valueBasedFees && fees.valueBasedFees.length > 0) {
      for (const vbf of fees.valueBasedFees) {
        await db.execute(sql`
          INSERT INTO dmv_value_fees (state_code, min_value, max_value, fee_percentage)
          VALUES (${fees.stateCode}, ${vbf.minValue}, ${vbf.maxValue}, ${vbf.feePercentage})
        `);
      }
    }
    
    if (fees.countyFees && fees.countyFees.length > 0) {
      for (const cf of fees.countyFees) {
        await db.execute(sql`
          INSERT INTO dmv_county_fees (state_code, county_name, additional_fee)
          VALUES (${fees.stateCode}, ${cf.countyName}, ${cf.additionalFee})
        `);
      }
    }
    
    await db.execute(sql`COMMIT`);
    log(`Successfully stored DMV fees for ${fees.state}`, 'info');
  } catch (error) {
    await db.execute(sql`ROLLBACK`);
    log(`Error storing DMV fees: ${error}`, 'error');
  }
}

export function calculateRegistrationFee(
  stateFees: StateFees,
  county?: string,
  weight?: number,
  value?: number
): number {
  let totalFee = stateFees.baseRegistrationFee;
  
  if (stateFees.weightBasedFees && weight) {
    const weightFee = stateFees.weightBasedFees.find(
      wbf => weight >= wbf.minWeight && weight <= wbf.maxWeight
    );
    if (weightFee) totalFee += weightFee.fee;
  }
  
  if (stateFees.valueBasedFees && value) {
    const valueFee = stateFees.valueBasedFees.find(
      vbf => value >= vbf.minValue && value <= vbf.maxValue
    );
    if (valueFee) totalFee += value * (valueFee.feePercentage / 100);
  }
  
  if (stateFees.countyFees && county) {
    const countyFee = stateFees.countyFees.find(
      cf => cf.countyName.toLowerCase() === county.toLowerCase()
    );
    if (countyFee) totalFee += countyFee.additionalFee;
  }
  
  return totalFee;
}

export async function initializeWithDefaultFees() {
  await initializeDmvFeeTables();
  
  const result = await db.execute(sql`SELECT COUNT(*) FROM dmv_fees`);
  const count = parseInt(String(result.rows[0]?.count || '0'));
  
  if (count === 0) {
    log('No DMV fee data found. Initializing with defaults.', 'info');
    const states = ['CO', 'CA', 'TX', 'NY', 'FL'];
    for (const state of states) {
      await fetchDmvFeesFromSource(state);
    }
  } else {
    log(`Found ${count} state DMV fee records in database.`, 'info');
  }
}