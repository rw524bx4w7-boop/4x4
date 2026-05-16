import { db } from "../db";
import { 
  stateComplianceRules, 
  adminTargetList, 
  providerComplianceStatus,
  b4uSignLicenses,
  type InsertStateComplianceRule,
  type InsertAdminTarget,
  type InsertProviderComplianceStatus,
  type InsertB4uSignLicense,
  type StateComplianceRule,
  type AdminTarget,
  type ProviderComplianceStatus,
  type B4uSignLicense
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { log } from "../vite";

export class ComplianceDataService {
  
  /**
   * Initialize all compliance data from CSV sources
   */
  async initializeComplianceData(): Promise<void> {
    try {
      log("Initializing compliance data...", "info");
      
      // Initialize state compliance rules
      await this.initializeStateComplianceRules();
      
      // Initialize admin target list
      await this.initializeAdminTargetList();
      
      // Initialize B4uSign licenses
      await this.initializeB4uSignLicenses();
      
      log("Compliance data initialization complete", "info");
    } catch (error) {
      log(`Error initializing compliance data: ${error}`, "error");
      throw error;
    }
  }

  /**
   * Initialize state compliance rules from CSV data
   */
  private async initializeStateComplianceRules(): Promise<void> {
    const complianceData: InsertStateComplianceRule[] = [
      {
        state: "AL",
        stateName: "Alabama",
        brokerLicenseNeeded: true,
        licenseType: "P&C Producer / VSC seller if required",
        regulatoryAuthority: "State DOI",
        providerComplianceRequired: "Verify provider licensed / insured",
        appointmentRequired: true,
        keyComplianceNotes: "Confirm state-specific refund, form, and marketing rules.",
        refundPeriodDays: 30,
        specialRequirements: ["State-specific refund forms", "Marketing compliance"],
        isActive: true
      },
      {
        state: "CA",
        stateName: "California",
        brokerLicenseNeeded: true,
        licenseType: "Property & Casualty Producer (broker-agent)",
        regulatoryAuthority: "CA Dept. of Insurance",
        providerComplianceRequired: "Provider must hold VSCP license",
        appointmentRequired: true,
        keyComplianceNotes: "No seller license but must be appointed; follow 30-day free-look & refund rules.",
        refundPeriodDays: 30,
        specialRequirements: ["30-day free-look period", "VSCP license verification"],
        isActive: true
      },
      {
        state: "FL",
        stateName: "Florida",
        brokerLicenseNeeded: true,
        licenseType: "Motor Vehicle Service Agreement Salesperson / 2-14 License",
        regulatoryAuthority: "FL Office of Insurance Regulation",
        providerComplianceRequired: "Provider must be licensed MVSA company",
        appointmentRequired: true,
        keyComplianceNotes: "Register under agency; disclose FL cancellation/refund provisions.",
        refundPeriodDays: 30,
        specialRequirements: ["MVSA registration", "FL-specific cancellation disclosure"],
        isActive: true
      },
      {
        state: "NY",
        stateName: "New York",
        brokerLicenseNeeded: true,
        licenseType: "Insurance Producer (Property & Casualty)",
        regulatoryAuthority: "NYDFS",
        providerComplianceRequired: "Provider must register as Service Contract Provider",
        appointmentRequired: true,
        keyComplianceNotes: "Include NY GBL §790 cancellation & refund notice.",
        refundPeriodDays: 30,
        specialRequirements: ["NY GBL §790 compliance", "Service Contract Provider registration"],
        isActive: true
      },
      {
        state: "TX",
        stateName: "Texas",
        brokerLicenseNeeded: true,
        licenseType: "Property & Casualty Agent + VSC Seller Registration",
        regulatoryAuthority: "Texas Dept. of Licensing & Regulation (TDLR)",
        providerComplianceRequired: "Provider must register as Service Contract Provider",
        appointmentRequired: true,
        keyComplianceNotes: "Seller registration easy after agent license; follow 20-day free-look.",
        refundPeriodDays: 20,
        specialRequirements: ["VSC Seller Registration", "20-day free-look period"],
        isActive: true
      }
    ];

    // Add all other states with standard requirements
    const standardStates = [
      "AK", "AZ", "AR", "CO", "CT", "DE", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
    ];

    standardStates.forEach(state => {
      complianceData.push({
        state,
        stateName: this.getStateName(state),
        brokerLicenseNeeded: true,
        licenseType: "P&C Producer / VSC seller if required",
        regulatoryAuthority: "State DOI",
        providerComplianceRequired: "Verify provider licensed / insured",
        appointmentRequired: true,
        keyComplianceNotes: "Confirm state-specific refund, form, and marketing rules.",
        refundPeriodDays: 30,
        specialRequirements: ["State-specific refund forms", "Marketing compliance"],
        isActive: true
      });
    });

    // Insert compliance rules
    await db.insert(stateComplianceRules).values(complianceData).onConflictDoNothing();
  }

  /**
   * Initialize admin target list from CSV data
   */
  private async initializeAdminTargetList(): Promise<void> {
    const adminTargets: InsertAdminTarget[] = [
      {
        administrator: "Endurance Warranty Services",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC", "Agent"],
        stateExclusions: ["CA"],
        stateExclusionNotes: "CA excluded for some tiers",
        website: "https://www.endurancewarranty.com",
        comment: "Large in-house call center, API quoting via AAS",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 8,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "CARCHEX",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC", "Affiliate"],
        stateExclusions: ["MA"],
        stateExclusionNotes: "Massachusetts excluded",
        website: "https://www.carchex.com",
        comment: "Partnership model; offers white-label portals",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 7,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: true,
        isActive: true
      },
      {
        administrator: "Olive (Repair Ventures)",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC", "Embedded"],
        stateExclusions: ["CA", "FL"],
        stateExclusionNotes: "Not in CA, FL for older vehicles",
        website: "https://olive.com",
        comment: "Instant-quote API; subscription-style VSC",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 9,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "Omega Auto Care",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC", "Agent"],
        stateExclusions: ["NY"],
        stateExclusionNotes: "NY excluded",
        website: "https://omegautocare.com",
        comment: "Multi-tier coverage; friendly to aggregators",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 6,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "autopom!",
        type: "Open-Distribution Broker/Admin",
        keyChannels: ["DTC"],
        stateExclusions: [],
        stateExclusionNotes: "Sample rate cards all 50 states",
        website: "https://www.autopom.com",
        comment: "Broker with admin partnerships (Royal, Mercury)",
        apiAvailable: false,
        integrationStatus: "pending",
        priority: 5,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "Protect My Car",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC"],
        stateExclusions: ["CA"],
        stateExclusionNotes: "CA excluded",
        website: "https://protectmycar.com",
        comment: "12-pay financing; strong post-sale service",
        apiAvailable: false,
        integrationStatus: "pending",
        priority: 7,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "CarShield / American Auto Shield",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC", "TV media"],
        stateExclusions: ["CA"],
        stateExclusionNotes: "CA excluded",
        website: "https://carshield.com",
        comment: "High volume; requires MAP pricing floors",
        apiAvailable: false,
        integrationStatus: "pending",
        priority: 8,
        salesQuotaRequired: true,
        mapPricingRequired: true,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "Veritas Global Protection",
        type: "Open-Distribution Admin",
        keyChannels: ["DTC", "Dealer"],
        stateExclusions: [],
        stateExclusionNotes: "Few state exclusions",
        website: "https://veritasglobal.com",
        comment: "Offers EV coverage; quick integration",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 8,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      },
      {
        administrator: "Smart AutoCare",
        type: "Independent TPA",
        keyChannels: ["Dealer", "Agent", "API"],
        stateExclusions: [],
        stateExclusionNotes: "All 50 states",
        website: "https://smartautocare.com",
        comment: "Modern REST API; reasonable sales quotas",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 9,
        salesQuotaRequired: true,
        minimumVolume: 100,
        mapPricingRequired: false,
        whitelistRequired: true,
        isActive: true
      },
      {
        administrator: "AUL Corp (Protective)",
        type: "Independent TPA",
        keyChannels: ["Dealer", "Agent"],
        stateExclusions: [],
        stateExclusionNotes: "All 50 states",
        website: "https://aulcorp.com",
        comment: "Has API and welcomes post-warranty DTC volume",
        apiAvailable: true,
        integrationStatus: "pending",
        priority: 7,
        salesQuotaRequired: false,
        mapPricingRequired: false,
        whitelistRequired: false,
        isActive: true
      }
    ];

    // Insert admin targets
    await db.insert(adminTargetList).values(adminTargets).onConflictDoNothing();
  }

  /**
   * Initialize B4uSign licenses for key states
   */
  private async initializeB4uSignLicenses(): Promise<void> {
    const licenseData: InsertB4uSignLicense[] = [
      {
        state: "CA",
        licenseType: "Property & Casualty Producer (broker-agent)",
        status: "pending",
        regulatoryAuthority: "CA Dept. of Insurance",
        applicationFee: "150.00",
        renewalFee: "150.00",
        continuingEducationRequired: true,
        continuingEducationHours: 24,
        notes: "Priority state - high volume market",
        isActive: true
      },
      {
        state: "FL",
        licenseType: "Motor Vehicle Service Agreement Salesperson / 2-14 License",
        status: "pending",
        regulatoryAuthority: "FL Office of Insurance Regulation",
        applicationFee: "75.00",
        renewalFee: "75.00",
        continuingEducationRequired: true,
        continuingEducationHours: 20,
        notes: "Priority state - high volume market",
        isActive: true
      },
      {
        state: "NY",
        licenseType: "Insurance Producer (Property & Casualty)",
        status: "pending",
        regulatoryAuthority: "NYDFS",
        applicationFee: "200.00",
        renewalFee: "200.00",
        continuingEducationRequired: true,
        continuingEducationHours: 15,
        notes: "Priority state - high volume market",
        isActive: true
      },
      {
        state: "TX",
        licenseType: "Property & Casualty Agent + VSC Seller Registration",
        status: "pending",
        regulatoryAuthority: "Texas Dept. of Licensing & Regulation (TDLR)",
        applicationFee: "100.00",
        renewalFee: "100.00",
        continuingEducationRequired: true,
        continuingEducationHours: 30,
        notes: "Priority state - high volume market",
        isActive: true
      }
    ];

    // Insert B4uSign licenses
    await db.insert(b4uSignLicenses).values(licenseData).onConflictDoNothing();
  }

  /**
   * Get state compliance rules
   */
  async getStateComplianceRules(): Promise<StateComplianceRule[]> {
    return await db.select().from(stateComplianceRules).where(eq(stateComplianceRules.isActive, true));
  }

  /**
   * Get admin target list
   */
  async getAdminTargetList(): Promise<AdminTarget[]> {
    return await db.select().from(adminTargetList).where(eq(adminTargetList.isActive, true));
  }

  /**
   * Get B4uSign licenses
   */
  async getB4uSignLicenses(): Promise<B4uSignLicense[]> {
    return await db.select().from(b4uSignLicenses).where(eq(b4uSignLicenses.isActive, true));
  }

  /**
   * Check compliance for a specific state and provider
   */
  async checkProviderCompliance(providerId: number, state: string): Promise<boolean> {
    const [complianceStatus] = await db
      .select()
      .from(providerComplianceStatus)
      .where(
        and(
          eq(providerComplianceStatus.adminTargetId, providerId),
          eq(providerComplianceStatus.state, state)
        )
      );

    return complianceStatus?.isCompliant || false;
  }

  /**
   * Update provider compliance status
   */
  async updateProviderCompliance(data: InsertProviderComplianceStatus): Promise<void> {
    await db
      .insert(providerComplianceStatus)
      .values(data)
      .onConflictDoUpdate({
        target: [providerComplianceStatus.adminTargetId, providerComplianceStatus.state],
        set: {
          isCompliant: data.isCompliant,
          licenseNumber: data.licenseNumber,
          licenseExpiry: data.licenseExpiry,
          appointmentStatus: data.appointmentStatus,
          appointmentDate: data.appointmentDate,
          complianceNotes: data.complianceNotes,
          lastVerified: new Date(),
          updatedAt: new Date()
        }
      });
  }

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(): Promise<any> {
    const totalStates = await db.select().from(stateComplianceRules).where(eq(stateComplianceRules.isActive, true));
    const totalProviders = await db.select().from(adminTargetList).where(eq(adminTargetList.isActive, true));
    const totalLicenses = await db.select().from(b4uSignLicenses).where(eq(b4uSignLicenses.isActive, true));
    const pendingLicenses = await db.select().from(b4uSignLicenses).where(eq(b4uSignLicenses.status, 'pending'));

    return {
      totalStates: totalStates.length,
      totalProviders: totalProviders.length,
      totalLicenses: totalLicenses.length,
      pendingLicenses: pendingLicenses.length,
      complianceRate: totalLicenses.length > 0 ? 
        ((totalLicenses.length - pendingLicenses.length) / totalLicenses.length * 100).toFixed(1) : 0
    };
  }

  /**
   * Get state name from abbreviation
   */
  private getStateName(state: string): string {
    const stateNames: { [key: string]: string } = {
      'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CO': 'Colorado', 'CT': 'Connecticut',
      'DE': 'Delaware', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois',
      'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana',
      'ME': 'Maine', 'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
      'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NC': 'North Carolina',
      'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania',
      'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee',
      'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
      'WI': 'Wisconsin', 'WY': 'Wyoming'
    };
    return stateNames[state] || state;
  }
}

export const complianceDataService = new ComplianceDataService();