import { storage } from "../storage";
import { 
  DmsIntegration,
  InsertDmsIntegrationLog,
  DealWithRelations
} from "@shared/schema";
import { log } from "../vite";
import axios from "axios";

/**
 * DMS Integration Service
 * Handles integration with Dealer Management Systems (DMS)
 */

interface DmsRequest {
  action: string;
  dealId: number;
  payload: any;
}

interface DmsResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function getDmsIntegrationByProvider(provider: string): Promise<DmsIntegration | undefined> {
  const integrations = await storage.getDmsIntegrations();
  return integrations.find(integration => integration.provider === provider && integration.active);
}

export async function sendToDms(
  integration: DmsIntegration, 
  deal: DealWithRelations, 
  action: string, 
  payload: any
): Promise<DmsResponse> {
  try {
    const logEntry: InsertDmsIntegrationLog = {
      dmsIntegrationId: integration.id,
      dealId: deal.id,
      action,
      status: 'pending',
      requestPayload: JSON.stringify(payload)
    };
    
    const dmsLog = await storage.createDmsIntegrationLog(logEntry);
    
    let response: any;
    let success = false;
    
    try {
      switch (integration.provider.toLowerCase()) {
        case 'cdk':
          response = await sendToCdkDms(integration, deal, action, payload);
          success = response.success;
          break;
        case 'dealertrack':
          response = await sendToDealertrackDms(integration, deal, action, payload);
          success = response.success;
          break;
        case 'reynolds':
          response = await sendToReynoldsDms(integration, deal, action, payload);
          success = response.success;
          break;
        default:
          throw new Error(`Unsupported DMS provider: ${integration.provider}`);
      }
      
      await storage.updateDmsIntegrationLog(dmsLog.id, {
        status: success ? 'success' : 'error',
        responsePayload: JSON.stringify(response),
        errorMessage: !success && response.error ? response.error : undefined
      });
      
      return response;
    } catch (error) {
      await storage.updateDmsIntegrationLog(dmsLog.id, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  } catch (error) {
    log(`Error sending to DMS (${integration.provider}): ${error}`, 'error');
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function sendToCdkDms(
  integration: DmsIntegration, 
  deal: DealWithRelations, 
  action: string, 
  payload: any
): Promise<DmsResponse> {
  try {
    const apiUrl = integration.apiUrl;
    const apiKey = integration.apiKey;
    
    if (!apiKey) {
      throw new Error('API key is required for CDK DMS integration');
    }
    
    const dmsPayload: DmsRequest = { action, dealId: deal.id, payload };
    
    const response = await axios.post(apiUrl, dmsPayload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      error: response.data?.error || undefined
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`CDK DMS API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data?.message || error.message };
    }
    throw error;
  }
}

async function sendToDealertrackDms(
  integration: DmsIntegration, 
  deal: DealWithRelations, 
  action: string, 
  payload: any
): Promise<DmsResponse> {
  try {
    const apiUrl = integration.apiUrl;
    const apiKey = integration.apiKey;
    const apiUser = integration.apiUser;
    
    if (!apiKey || !apiUser) {
      throw new Error('API key and user are required for DealerTrack DMS integration');
    }
    
    const dmsPayload: DmsRequest = { action, dealId: deal.id, payload };
    
    const response = await axios.post(apiUrl, dmsPayload, {
      timeout: 10000,
      headers: {
        'X-API-KEY': apiKey,
        'X-API-USER': apiUser,
        'Content-Type': 'application/json',
        'User-Agent': 'B4uSign-DMSService/1.0'
      }
    });
    
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      error: response.data?.error || undefined
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`DealerTrack DMS API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data?.message || error.message };
    }
    throw error;
  }
}

async function sendToReynoldsDms(
  integration: DmsIntegration, 
  deal: DealWithRelations, 
  action: string, 
  payload: any
): Promise<DmsResponse> {
  try {
    const apiUrl = integration.apiUrl;
    const apiKey = integration.apiKey;
    
    if (!apiKey) {
      throw new Error('API key is required for Reynolds DMS integration');
    }
    
    const dmsPayload: DmsRequest = { action, dealId: deal.id, payload };
    
    const response = await axios.post(apiUrl, dmsPayload, {
      timeout: 10000,
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'B4uSign-DMSService/1.0'
      }
    });
    
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      error: response.data?.error || undefined
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`Reynolds DMS API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`, 'error');
      return { success: false, error: error.response?.data?.message || error.message };
    }
    throw error;
  }
}

export async function exportDealToDms(dealId: number): Promise<DmsResponse> {
  try {
    const deal = await storage.getDealWithRelations(dealId);
    
    if (!deal) {
      throw new Error(`Deal not found with ID: ${dealId}`);
    }
    
    const integrations = await storage.getDmsIntegrations();
    const activeIntegration = integrations.find(integration => integration.active);
    
    if (!activeIntegration) {
      return { success: false, error: 'No active DMS integration available' };
    }
    
    const payload = {
      deal: {
        id: deal.id,
        status: deal.status,
        totalAmount: deal.amount,
        totalDue: deal.totalDue,
        taxAmount: deal.taxAmount,
        docFee: deal.docFee,
        titleFee: deal.titleFee,
        registrationFee: deal.registrationFee,
        createdAt: deal.createdAt
      },
      customer: deal.customer,
      vehicle: deal.vehicle,
      products: deal.fiProducts || [],
      creditApplication: deal.creditApplication
    };
    
    return await sendToDms(activeIntegration, deal, 'EXPORT_DEAL', payload);
  } catch (error) {
    log(`Error exporting deal to DMS: ${error}`, 'error');
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}