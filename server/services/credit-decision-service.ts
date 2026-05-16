import axios from 'axios';
import { log } from '../vite';
import { storage } from '../storage';
import crypto from 'crypto';
import type { 
  CreditApplicationData, 
  CreditResponse, 
  CreditProviderConfig 
} from '../../shared/integration-schemas';
import { InsertCreditSubmission } from '../../shared/schema';

// Utility functions for safely accessing IDs
function getDealId(applicationData: CreditApplicationData): number | undefined {
  return (applicationData.deal as any)?.id;
}

function getApplicantId(applicationData: CreditApplicationData): number | undefined {
  return (applicationData.applicant as any)?.id;
}

// Utility method to handle error type safety
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Data encryption utilities
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // initialization vector length
const AUTH_TAG_LENGTH = 16; // GCM auth tag length

/**
 * Encrypts data for secure transmission
 */
function encryptData(data: any, encryptionKey?: string): string {
  const key = encryptionKey || process.env.ENCRYPTION_KEY || 'default-secure-encryption-key-change-in-prod';
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  const dataString = JSON.stringify(data);
  let encrypted = cipher.update(dataString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

/**
 * Decrypts data received from secure transmission
 */
function decryptData(encryptedData: string, encryptionKey?: string): any {
  const key = encryptionKey || process.env.ENCRYPTION_KEY || 'default-secure-encryption-key-change-in-prod';
  const keyBuffer = crypto.createHash('sha256').update(key).digest();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// Credit provider factory and service registry
const creditProviders: Record<string, CreditDecisionProvider> = {};

/**
 * Base class for all credit decision integrations
 */
abstract class CreditDecisionProvider {
  protected config: CreditProviderConfig;
  
  constructor(config: CreditProviderConfig) {
    this.config = config;
  }
  
  abstract submitApplication(applicationData: CreditApplicationData): Promise<CreditResponse>;
  abstract checkApplicationStatus(referenceId: string): Promise<CreditResponse>;
  
  protected async makeApiRequest(endpoint: string, data: any, method = 'POST', useEncryption = false): Promise<any> {
    try {
      const url = `${this.config.apiEndpoint}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      let processedData = data;
      if (useEncryption) {
        headers['X-Encryption'] = 'AES-256-GCM';
        if (method !== 'GET') {
          processedData = { encryptedData: encryptData(data) };
        }
        headers['X-Timestamp'] = Date.now().toString();
      }
      
      const response = await axios({
        method,
        url,
        headers,
        data: method !== 'GET' ? processedData : undefined,
        params: method === 'GET' ? processedData : undefined,
      });
      
      if (useEncryption && response.data && response.data.encryptedData) {
        return decryptData(response.data.encryptedData);
      }
      
      return response.data;
    } catch (error) {
      log(`API request error to ${endpoint}: ${getErrorMessage(error)}`, 'error');
      throw error;
    }
  }
  
  protected async logCreditSubmission(
    dealId: number, 
    creditApplicationId: number, 
    submissionData: any, 
    responseData?: any,
    status = 'submitted',
    providerReferenceId?: string
  ): Promise<void> {
    try {
      const submission: InsertCreditSubmission = {
        dealId,
        creditApplicationId,
        providerId: this.config.id || 0,
        submissionData,
        status,
        responseData,
      };
      
      if (providerReferenceId) {
        submission.providerReferenceId = providerReferenceId;
      }
      
      await storage.createCreditSubmission(submission);
    } catch (error) {
      log(`Error logging credit submission: ${error}`, 'error');
    }
  }
}

/**
 * Dealertrack Unify provider implementation
 */
class DealertrackUnifyProvider extends CreditDecisionProvider {
  async submitApplication(applicationData: CreditApplicationData): Promise<CreditResponse> {
    try {
      if (this.config.type !== 'dealertrack') {
        throw new Error('Invalid provider configuration');
      }
      
      const isDealertrackCredentials = (creds: any): creds is { 
        dealertrackDealerId: string; 
        dealertrackUserId: string;
        routingPreferences?: string[];
        dealertrackSpecificFields?: Record<string, any>;
      } => {
        return 'dealertrackDealerId' in creds && 'dealertrackUserId' in creds;
      };
      
      if (!isDealertrackCredentials(this.config.credentials)) {
        throw new Error('Invalid dealertrack credentials configuration');
      }
      
      const dealertrackCredentials = this.config.credentials;
      
      const dealertrackPayload = {
        DealerId: dealertrackCredentials.dealertrackDealerId,
        UserId: dealertrackCredentials.dealertrackUserId,
        Application: {
          Applicant: {
            FirstName: applicationData.applicant.firstName,
            MiddleName: applicationData.applicant.middleName || '',
            LastName: applicationData.applicant.lastName,
            SSN: applicationData.applicant.ssn || '',
            DateOfBirth: applicationData.applicant.dateOfBirth || '',
            EmailAddress: applicationData.applicant.email || '',
            PhoneNumber: applicationData.applicant.phoneNumber || '',
            Address: {
              Street: applicationData.applicant.address.street,
              City: applicationData.applicant.address.city,
              State: applicationData.applicant.address.state,
              ZipCode: applicationData.applicant.address.zipCode,
            },
            HousingStatus: applicationData.applicant.housingStatus || 'other',
            MonthlyHousingPayment: applicationData.applicant.monthlyHousingPayment || 0,
            EmploymentStatus: applicationData.applicant.employmentStatus || 'other',
            Employer: applicationData.applicant.employer || '',
            JobTitle: applicationData.applicant.jobTitle || '',
            YearsEmployed: applicationData.applicant.yearsEmployed || 0,
            MonthlyIncome: applicationData.applicant.monthlyIncome || 0,
            OtherIncome: applicationData.applicant.otherIncome || 0,
          },
          CoApplicant: applicationData.coApplicant ? {
            FirstName: applicationData.coApplicant.firstName || '',
            MiddleName: applicationData.coApplicant.middleName || '',
            LastName: applicationData.coApplicant.lastName || '',
            SSN: applicationData.coApplicant.ssn || '',
            DateOfBirth: applicationData.coApplicant.dateOfBirth || '',
            EmailAddress: applicationData.coApplicant.email || '',
            PhoneNumber: applicationData.coApplicant.phoneNumber || '',
            Address: applicationData.coApplicant.address ? {
              Street: applicationData.coApplicant.address.street || '',
              City: applicationData.coApplicant.address.city || '',
              State: applicationData.coApplicant.address.state || '',
              ZipCode: applicationData.coApplicant.address.zipCode || '',
            } : undefined,
            RelationshipToApplicant: applicationData.coApplicant.relationshipToApplicant || '',
            EmploymentStatus: applicationData.coApplicant.employmentStatus || 'other',
            Employer: applicationData.coApplicant.employer || '',
            JobTitle: applicationData.coApplicant.jobTitle || '',
            YearsEmployed: applicationData.coApplicant.yearsEmployed || 0,
            MonthlyIncome: applicationData.coApplicant.monthlyIncome || 0,
          } : undefined,
          Vehicle: {
            Year: applicationData.vehicle.year,
            Make: applicationData.vehicle.make,
            Model: applicationData.vehicle.model,
            Trim: applicationData.vehicle.trim || '',
            VIN: applicationData.vehicle.vin,
            MSRP: applicationData.vehicle.msrp,
            SellingPrice: applicationData.vehicle.sellingPrice,
            Mileage: applicationData.vehicle.mileage || 0,
            NewOrUsed: applicationData.vehicle.newOrUsed,
          },
          Deal: {
            RequestedAmount: applicationData.deal.requestedAmount,
            DownPayment: applicationData.deal.downPayment || 0,
            Term: applicationData.deal.term || 60,
            TradeInValue: applicationData.deal.tradeInValue || 0,
            TradeInPayoff: applicationData.deal.tradeInPayoff || 0,
          },
          Dealership: {
            Name: applicationData.dealership.name,
            DealerId: applicationData.dealership.dealerId,
            Address: {
              Street: applicationData.dealership.address.street,
              City: applicationData.dealership.address.city,
              State: applicationData.dealership.address.state,
              ZipCode: applicationData.dealership.address.zipCode,
            },
            ContactName: applicationData.dealership.contactName || '',
            ContactEmail: applicationData.dealership.contactEmail || '',
            ContactPhone: applicationData.dealership.contactPhone || '',
          },
          BankPreferences: applicationData.bankPreferences || [],
        },
        RoutingPreferences: dealertrackCredentials.routingPreferences || [],
        ...dealertrackCredentials.dealertrackSpecificFields,
      };
      
      const response = await this.makeApiRequest('/v1/applications', dealertrackPayload);
      
      const commonResponse: CreditResponse = {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: response.ApplicationId || response.ReferenceId || '',
        status: this.mapDealertrackStatus(response.Status),
        statusMessage: response.StatusMessage || '',
        timestamp: new Date().toISOString(),
        lenderResponses: (response.LenderResponses || []).map((lender: any) => ({
          lenderId: lender.LenderId || '',
          lenderName: lender.LenderName || '',
          status: this.mapDealertrackStatus(lender.Status),
          approvalAmount: lender.ApprovalAmount,
          maxApprovalAmount: lender.MaxApprovalAmount,
          apr: lender.APR,
          term: lender.Term,
          monthlyPayment: lender.MonthlyPayment,
          stipulations: (lender.Stipulations || []).map((stipulation: any) => ({
            type: stipulation.Type || '',
            description: stipulation.Description || '',
            required: stipulation.Required === true,
          })),
          comments: lender.Comments || '',
          expirationDate: lender.ExpirationDate || '',
        })),
        rawResponse: response,
      };

      const dealId = getDealId(applicationData);
      const applicantId = getApplicantId(applicationData);
      
      if (dealId && applicantId) {
        await this.logCreditSubmission(
          dealId,
          applicantId,
          dealertrackPayload,
          response,
          commonResponse.status,
          commonResponse.providerReferenceId
        );
      }
      
      return commonResponse;
    } catch (error) {
      log(`Error in Dealertrack submitApplication: ${error}`, 'error');
      
      const errorResponse: CreditResponse = {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: '',
        status: 'error',
        statusMessage: `Error submitting application: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: error,
      };
      
      await logCreditError(this, applicationData, error);
      
      return errorResponse;
    }
  }
  
  async checkApplicationStatus(referenceId: string): Promise<CreditResponse> {
    try {
      const dealertrackCredentials = this.config.credentials;
      if (this.config.type !== 'dealertrack') {
        throw new Error('Invalid provider configuration');
      }
      
      const statusPayload = {
        DealerId: (dealertrackCredentials as any).dealertrackDealerId,
        ApplicationId: referenceId,
      };
      
      const response = await this.makeApiRequest('/v1/applications/status', statusPayload, 'GET');
      
      const commonResponse: CreditResponse = {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: response.ApplicationId || response.ReferenceId || referenceId,
        status: this.mapDealertrackStatus(response.Status),
        statusMessage: response.StatusMessage || '',
        timestamp: new Date().toISOString(),
        lenderResponses: (response.LenderResponses || []).map((lender: any) => ({
          lenderId: lender.LenderId || '',
          lenderName: lender.LenderName || '',
          status: this.mapDealertrackStatus(lender.Status),
          approvalAmount: lender.ApprovalAmount,
          maxApprovalAmount: lender.MaxApprovalAmount,
          apr: lender.APR,
          term: lender.Term,
          monthlyPayment: lender.MonthlyPayment,
          stipulations: (lender.Stipulations || []).map((stipulation: any) => ({
            type: stipulation.Type || '',
            description: stipulation.Description || '',
            required: stipulation.Required === true,
          })),
          comments: lender.Comments || '',
          expirationDate: lender.ExpirationDate || '',
        })),
        rawResponse: response,
      };
      
      return commonResponse;
    } catch (error) {
      log(`Error in Dealertrack checkApplicationStatus: ${error}`, 'error');
      
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: referenceId,
        status: 'error',
        statusMessage: `Error checking application status: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: error,
      };
    }
  }
  
  private mapDealertrackStatus(status: string): 'approved' | 'conditionally_approved' | 'rejected' | 'pending' | 'error' {
    switch (status?.toLowerCase()) {
      case 'approved': return 'approved';
      case 'conditionally approved':
      case 'conditional': return 'conditionally_approved';
      case 'declined':
      case 'rejected': return 'rejected';
      case 'pending':
      case 'in progress':
      case 'submitted': return 'pending';
      case 'error':
      default: return 'error';
    }
  }
}

/**
 * RouteOne provider implementation
 */
class RouteOneProvider extends CreditDecisionProvider {
  async submitApplication(applicationData: CreditApplicationData): Promise<CreditResponse> {
    try {
      if (this.config.type !== 'routeone') {
        throw new Error('Invalid provider configuration');
      }
      
      const isRouteOneCredentials = (creds: any): creds is {
        routeOneDealerId: string;
        routeOneUserId: string;
        routeOnePassword?: string;
        desiredPrograms?: string[];
        routeOneSpecificFields?: Record<string, any>;
      } => {
        return 'routeOneDealerId' in creds && 'routeOneUserId' in creds;
      };
      
      if (!isRouteOneCredentials(this.config.credentials)) {
        throw new Error('Invalid RouteOne credentials configuration');
      }
      
      const routeOneCredentials = this.config.credentials;
      
      const routeOnePayload = {
        dealerId: routeOneCredentials.routeOneDealerId,
        userId: routeOneCredentials.routeOneUserId,
        password: routeOneCredentials.routeOnePassword,
        application: {
          applicant: {
            firstName: applicationData.applicant.firstName,
            middleName: applicationData.applicant.middleName,
            lastName: applicationData.applicant.lastName,
            ssn: applicationData.applicant.ssn,
            dateOfBirth: applicationData.applicant.dateOfBirth,
            email: applicationData.applicant.email,
            phoneNumber: applicationData.applicant.phoneNumber,
            address: {
              street: applicationData.applicant.address.street,
              city: applicationData.applicant.address.city,
              state: applicationData.applicant.address.state,
              zipCode: applicationData.applicant.address.zipCode,
            },
            housingStatus: applicationData.applicant.housingStatus,
            monthlyHousingPayment: applicationData.applicant.monthlyHousingPayment,
            employmentStatus: applicationData.applicant.employmentStatus,
            employer: applicationData.applicant.employer,
            jobTitle: applicationData.applicant.jobTitle,
            yearsEmployed: applicationData.applicant.yearsEmployed,
            monthlyIncome: applicationData.applicant.monthlyIncome,
            otherIncome: applicationData.applicant.otherIncome,
          },
          coApplicant: applicationData.coApplicant,
          vehicle: {
            year: applicationData.vehicle.year,
            make: applicationData.vehicle.make,
            model: applicationData.vehicle.model,
            trim: applicationData.vehicle.trim,
            vin: applicationData.vehicle.vin,
            msrp: applicationData.vehicle.msrp,
            sellingPrice: applicationData.vehicle.sellingPrice,
            mileage: applicationData.vehicle.mileage,
            newOrUsed: applicationData.vehicle.newOrUsed,
          },
          deal: {
            requestedAmount: applicationData.deal.requestedAmount,
            downPayment: applicationData.deal.downPayment,
            term: applicationData.deal.term,
            tradeInValue: applicationData.deal.tradeInValue,
            tradeInPayoff: applicationData.deal.tradeInPayoff,
          },
          dealership: {
            name: applicationData.dealership.name,
            dealerId: applicationData.dealership.dealerId,
            address: applicationData.dealership.address,
            contactName: applicationData.dealership.contactName,
            contactEmail: applicationData.dealership.contactEmail,
            contactPhone: applicationData.dealership.contactPhone,
          },
        },
        desiredPrograms: routeOneCredentials.desiredPrograms,
        ...routeOneCredentials.routeOneSpecificFields,
      };
      
      const response = await this.makeApiRequest('/creditApplication', routeOnePayload);
      
      const commonResponse: CreditResponse = {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: response.applicationId || response.referenceId || '',
        status: this.mapRouteOneStatus(response.status),
        statusMessage: response.statusMessage || '',
        timestamp: new Date().toISOString(),
        lenderResponses: (response.lenderResponses || []).map((lender: any) => ({
          lenderId: lender.lenderId || '',
          lenderName: lender.lenderName || '',
          status: this.mapRouteOneStatus(lender.status),
          approvalAmount: lender.approvalAmount,
          maxApprovalAmount: lender.maxApprovalAmount,
          apr: lender.apr,
          term: lender.term,
          monthlyPayment: lender.monthlyPayment,
          stipulations: (lender.stipulations || []).map((stipulation: any) => ({
            type: stipulation.type || '',
            description: stipulation.description || '',
            required: stipulation.required === true,
          })),
          comments: lender.comments || '',
          expirationDate: lender.expirationDate || '',
        })),
        rawResponse: response,
      };

      const dealId = getDealId(applicationData);
      const applicantId = getApplicantId(applicationData);
      
      if (dealId && applicantId) {
        await this.logCreditSubmission(
          dealId,
          applicantId,
          routeOnePayload,
          response,
          commonResponse.status,
          commonResponse.providerReferenceId
        );
      }
      
      return commonResponse;
    } catch (error) {
      log(`Error in RouteOne submitApplication: ${error}`, 'error');
      
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: '',
        status: 'error',
        statusMessage: `Error submitting application: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: error,
      };
    }
  }
  
  async checkApplicationStatus(referenceId: string): Promise<CreditResponse> {
    try {
      const routeOneCredentials = this.config.credentials as any;
      if (this.config.type !== 'routeone') {
        throw new Error('Invalid provider configuration');
      }
      
      const statusPayload = {
        dealerId: routeOneCredentials.routeOneDealerId,
        userId: routeOneCredentials.routeOneUserId,
        password: routeOneCredentials.routeOnePassword,
        applicationId: referenceId,
      };
      
      const response = await this.makeApiRequest('/creditApplication/status', statusPayload, 'GET');
      
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: response.applicationId || response.referenceId || referenceId,
        status: this.mapRouteOneStatus(response.status),
        statusMessage: response.statusMessage || '',
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: response,
      };
    } catch (error) {
      log(`Error in RouteOne checkApplicationStatus: ${error}`, 'error');
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: referenceId,
        status: 'error',
        statusMessage: `Error checking application status: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: error,
      };
    }
  }
  
  private mapRouteOneStatus(status: string): 'approved' | 'conditionally_approved' | 'rejected' | 'pending' | 'error' {
    switch (status?.toLowerCase()) {
      case 'approved': return 'approved';
      case 'conditionally approved':
      case 'conditional': return 'conditionally_approved';
      case 'declined':
      case 'rejected': return 'rejected';
      case 'pending':
      case 'in review':
      case 'in progress':
      case 'submitted': return 'pending';
      case 'error':
      default: return 'error';
    }
  }
}

/**
 * ODE (Open Dealer Exchange) provider implementation
 */
class OdeProvider extends CreditDecisionProvider {
  async submitApplication(applicationData: CreditApplicationData): Promise<CreditResponse> {
    try {
      if (this.config.type !== 'ode') {
        throw new Error('Invalid provider configuration');
      }
      
      const isOdeCredentials = (creds: any): creds is {
        odeDealerId: string;
        lenderPriorities?: string[];
        odeSpecificFields?: Record<string, any>;
      } => {
        return 'odeDealerId' in creds;
      };
      
      if (!isOdeCredentials(this.config.credentials)) {
        throw new Error('Invalid ODE credentials configuration');
      }
      
      const odeCredentials = this.config.credentials;
      
      const odePayload = {
        api_key: this.config.apiKey,
        dealer_id: odeCredentials.odeDealerId,
        application: {
          primary_applicant: {
            first_name: applicationData.applicant.firstName,
            last_name: applicationData.applicant.lastName,
            ssn: applicationData.applicant.ssn,
            date_of_birth: applicationData.applicant.dateOfBirth,
            email: applicationData.applicant.email,
            phone: applicationData.applicant.phoneNumber,
            address: {
              street_address: applicationData.applicant.address.street,
              city: applicationData.applicant.address.city,
              state: applicationData.applicant.address.state,
              zip_code: applicationData.applicant.address.zipCode,
            },
            housing_status: applicationData.applicant.housingStatus,
            monthly_housing_payment: applicationData.applicant.monthlyHousingPayment,
            employment_status: applicationData.applicant.employmentStatus,
            employer_name: applicationData.applicant.employer,
            job_title: applicationData.applicant.jobTitle,
            years_at_job: applicationData.applicant.yearsEmployed,
            monthly_income: applicationData.applicant.monthlyIncome,
            other_income: applicationData.applicant.otherIncome,
          },
          vehicle: {
            year: applicationData.vehicle.year,
            make: applicationData.vehicle.make,
            model: applicationData.vehicle.model,
            vin: applicationData.vehicle.vin,
            msrp: applicationData.vehicle.msrp,
            selling_price: applicationData.vehicle.sellingPrice,
            mileage: applicationData.vehicle.mileage,
            condition: applicationData.vehicle.newOrUsed,
          },
          deal: {
            amount_financed: applicationData.deal.requestedAmount,
            down_payment: applicationData.deal.downPayment,
            term_months: applicationData.deal.term,
            trade_in_value: applicationData.deal.tradeInValue,
            trade_in_payoff: applicationData.deal.tradeInPayoff,
          },
          dealership: {
            name: applicationData.dealership.name,
            dealer_id: applicationData.dealership.dealerId,
            address: {
              street_address: applicationData.dealership.address.street,
              city: applicationData.dealership.address.city,
              state: applicationData.dealership.address.state,
              zip_code: applicationData.dealership.address.zipCode,
            },
            contact_name: applicationData.dealership.contactName,
            contact_email: applicationData.dealership.contactEmail,
            contact_phone: applicationData.dealership.contactPhone,
          },
        },
        lender_priorities: odeCredentials.lenderPriorities,
        ...odeCredentials.odeSpecificFields,
      };
      
      const response = await this.makeApiRequest('/applications', odePayload, 'POST', true);
      
      const commonResponse: CreditResponse = {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: response.application_id || response.reference_id || '',
        status: this.mapOdeStatus(response.status),
        statusMessage: response.status_message || '',
        timestamp: new Date().toISOString(),
        lenderResponses: (response.lender_responses || []).map((lender: any) => ({
          lenderId: lender.lender_id || '',
          lenderName: lender.lender_name || '',
          status: this.mapOdeStatus(lender.status),
          approvalAmount: lender.approved_amount,
          maxApprovalAmount: lender.max_approved_amount,
          apr: lender.apr,
          term: lender.term_months,
          monthlyPayment: lender.monthly_payment,
          stipulations: (lender.stipulations || []).map((stipulation: any) => ({
            type: stipulation.type || '',
            description: stipulation.description || '',
            required: stipulation.required === true,
          })),
          comments: lender.comments || '',
          expirationDate: lender.expiration_date || '',
        })),
        rawResponse: response,
      };

      const dealId = getDealId(applicationData);
      const applicantId = getApplicantId(applicationData);
      
      if (dealId && applicantId) {
        await this.logCreditSubmission(
          dealId,
          applicantId,
          odePayload,
          response,
          commonResponse.status,
          commonResponse.providerReferenceId
        );
      }
      
      return commonResponse;
    } catch (error) {
      log(`Error in ODE submitApplication: ${error}`, 'error');
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: '',
        status: 'error',
        statusMessage: `Error submitting application: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: error,
      };
    }
  }
  
  async checkApplicationStatus(referenceId: string): Promise<CreditResponse> {
    try {
      const odeCredentials = this.config.credentials as any;
      if (this.config.type !== 'ode') {
        throw new Error('Invalid provider configuration');
      }
      
      const statusPayload = {
        api_key: this.config.apiKey,
        dealer_id: odeCredentials.odeDealerId,
        application_id: referenceId,
      };
      
      const response = await this.makeApiRequest('/applications/status', statusPayload, 'GET');
      
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: response.application_id || response.reference_id || referenceId,
        status: this.mapOdeStatus(response.status),
        statusMessage: response.status_message || '',
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: response,
      };
    } catch (error) {
      log(`Error in ODE checkApplicationStatus: ${error}`, 'error');
      return {
        providerId: this.config.id?.toString() || '0',
        providerName: this.config.name,
        providerReferenceId: referenceId,
        status: 'error',
        statusMessage: `Error checking application status: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
        rawResponse: error,
      };
    }
  }
  
  private mapOdeStatus(status: string): 'approved' | 'conditionally_approved' | 'rejected' | 'pending' | 'error' {
    switch (status?.toLowerCase()) {
      case 'approved': return 'approved';
      case 'conditionally_approved':
      case 'conditional': return 'conditionally_approved';
      case 'declined':
      case 'rejected': return 'rejected';
      case 'pending':
      case 'in_review':
      case 'in_progress':
      case 'submitted': return 'pending';
      case 'error':
      default: return 'error';
    }
  }
}

// Helper for logging credit errors
async function logCreditError(provider: CreditDecisionProvider, applicationData: CreditApplicationData, error: unknown): Promise<void> {
  const dealId = getDealId(applicationData);
  const applicantId = getApplicantId(applicationData);
  if (dealId && applicantId) {
    await (provider as any).logCreditSubmission(dealId, applicantId, applicationData, error, 'error');
  }
}

/**
 * Factory function to create provider instances
 */
export async function initializeCreditProviders(): Promise<void> {
  try {
    const providerConfigs = await storage.getIntegrationProvidersByType('credit');
    for (const config of providerConfigs) {
      registerCreditProvider(config);
    }
    log(`Initialized ${Object.keys(creditProviders).length} credit providers`, 'info');
  } catch (error) {
    log(`Error initializing credit providers: ${error}`, 'error');
  }
}

/**
 * Register a credit provider with the system
 */
export function registerCreditProvider(config: CreditProviderConfig): void {
  try {
    if (!config.active) {
      log(`Skipping inactive credit provider: ${config.name}`, 'info');
      return;
    }
    
    let provider: CreditDecisionProvider;
    
    switch (config.type) {
      case 'dealertrack':
        provider = new DealertrackUnifyProvider(config);
        break;
      case 'routeone':
        provider = new RouteOneProvider(config);
        break;
      case 'ode':
        provider = new OdeProvider(config);
        break;
      default:
        log(`Unknown credit provider type: ${config.type}`, 'error');
        return;
    }
    
    const providerId = config.id?.toString() || config.name;
    creditProviders[providerId] = provider;
    log(`Registered credit provider: ${config.name} (${config.type})`, 'info');
  } catch (error) {
    log(`Error registering credit provider ${config.name}: ${error}`, 'error');
  }
}

/**
 * Submit a credit application to all configured providers
 */
export async function submitCreditApplication(
  applicationData: CreditApplicationData
): Promise<CreditResponse[]> {
  try {
    const responses: CreditResponse[] = [];
    
    if (Object.keys(creditProviders).length === 0) {
      log('No credit providers configured, initializing...', 'warn');
      await initializeCreditProviders();
      
      if (Object.keys(creditProviders).length === 0) {
        log('No credit providers available after initialization', 'warn');
        return [];
      }
    }
    
    const submissionPromises = Object.values(creditProviders).map(provider =>
      provider.submitApplication(applicationData)
    );
    
    const results = await Promise.allSettled(submissionPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      } else {
        log(`Error from provider ${index}: ${result.reason}`, 'error');
        responses.push({
          providerId: Object.keys(creditProviders)[index] || '0',
          providerName: 'Unknown Provider',
          providerReferenceId: '',
          status: 'error',
          statusMessage: `Error submitting application: ${result.reason}`,
          timestamp: new Date().toISOString(),
          lenderResponses: [],
          rawResponse: result.reason,
        });
      }
    });
    
    return responses;
  } catch (error) {
    log(`Error submitting credit applications: ${error}`, 'error');
    return [{
      providerId: '0',
      providerName: 'Credit Service',
      providerReferenceId: '',
      status: 'error',
      statusMessage: `Error in credit submission service: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      lenderResponses: [],
      rawResponse: error,
    }];
  }
}

/**
 * Check status of a credit application with a specific provider
 */
export async function checkCreditApplicationStatus(
  providerId: string,
  referenceId: string
): Promise<CreditResponse> {
  try {
    const provider = creditProviders[providerId];
    if (!provider) {
      log(`Provider not found: ${providerId}`, 'error');
      return {
        providerId,
        providerName: 'Unknown Provider',
        providerReferenceId: referenceId,
        status: 'error',
        statusMessage: `Provider not found: ${providerId}`,
        timestamp: new Date().toISOString(),
        lenderResponses: [],
      };
    }
    
    return await provider.checkApplicationStatus(referenceId);
  } catch (error) {
    log(`Error checking credit application status: ${error}`, 'error');
    return {
      providerId,
      providerName: 'Unknown Provider',
      providerReferenceId: referenceId,
      status: 'error',
      statusMessage: `Error checking status: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      lenderResponses: [],
      rawResponse: error,
    };
  }
}

export async function checkAllCreditApplicationStatuses(dealId: number): Promise<CreditResponse[]> {
  try {
    const submissions = await storage.getCreditSubmissionsByDeal(dealId);
    const responses: CreditResponse[] = [];
    
    for (const submission of submissions) {
      if (submission.providerReferenceId) {
        const response = await checkCreditApplicationStatus(
          submission.providerId.toString(),
          submission.providerReferenceId
        );
        
        responses.push(response);
        
        if (response.status !== submission.status) {
          await storage.updateCreditSubmission(submission.id, {
            status: response.status,
            responseData: response.rawResponse,
            ...(response.lenderResponses.length > 0 ? {
              bankName: response.lenderResponses[0].lenderName,
              bankId: response.lenderResponses[0].lenderId,
              approvalAmount: response.lenderResponses[0].approvalAmount,
              term: response.lenderResponses[0].term,
              apr: response.lenderResponses[0].apr,
            } : {}),
          });
        }
      }
    }
    
    return responses;
  } catch (error) {
    log(`Error checking all credit application statuses: ${error}`, 'error');
    return [{
      providerId: '0',
      providerName: 'Credit Service',
      providerReferenceId: '',
      status: 'error',
      statusMessage: `Error checking statuses: ${(error as Error).message}`,
      timestamp: new Date().toISOString(),
      lenderResponses: [],
      rawResponse: error,
    }];
  }
}