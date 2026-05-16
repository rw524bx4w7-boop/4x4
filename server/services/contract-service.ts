import { storage } from "../storage";
import { 
  ContractTemplate, 
  DealContract, 
  DealWithRelations,
  InsertDealContract
} from "@shared/schema";
import { log } from "../vite";
import { generateDocument } from "./document-service";

/**
 * Contract Management Service
 * Handles creation, rendering, and management of contract documents
 */

/**
 * Get all available contract templates by category
 */
export async function getContractTemplatesByCategory(category: string): Promise<ContractTemplate[]> {
  return await storage.getContractTemplatesByCategory(category);
}

/**
 * Generate a contract for a deal from a template
 */
export async function generateContractFromTemplate(
  dealId: number,
  templateId: number
): Promise<DealContract | undefined> {
  try {
    // Get the deal with all related data
    const deal = await storage.getDealWithRelations(dealId);
    
    if (!deal) {
      throw new Error(`Deal not found with ID: ${dealId}`);
    }
    
    // Get the template
    const template = await storage.getContractTemplate(templateId);
    
    if (!template) {
      throw new Error(`Contract template not found with ID: ${templateId}`);
    }
    
    // Generate the contract content by replacing template variables
    const content = await renderContractTemplate(template, deal);
    
    // Create the contract
    const contractData: InsertDealContract = {
      dealId,
      contractTemplateId: templateId,
      content,
      status: 'draft',
      signedByCustomer: false,
      signedByDealer: false
    };
    
    return await storage.createDealContract(contractData);
  } catch (error) {
    log(`Error generating contract: ${error}`, 'error');
    return undefined;
  }
}

/**
 * Render contract template with deal data
 */
async function renderContractTemplate(
  template: ContractTemplate, 
  deal: DealWithRelations
): Promise<string> {
  try {
    let content = template.template;
    
    // Replace deal variables
    content = content.replace(/\${deal\.id}/g, String(deal.id));
    content = content.replace(/\${deal\.status}/g, deal.status);
    content = content.replace(/\${deal\.amount}/g, deal.amount || '0.00');
    content = content.replace(/\${deal\.totalDue}/g, deal.totalDue?.toString() || '0.00');
    content = content.replace(/\${deal\.createdAt}/g, new Date(deal.createdAt).toLocaleDateString());
    
    // Replace customer variables
    if (deal.customer) {
      content = content.replace(/\${customer\.firstName}/g, deal.customer.firstName || '');
      content = content.replace(/\${customer\.lastName}/g, deal.customer.lastName || '');
      content = content.replace(/\${customer\.email}/g, deal.customer.email || '');
      content = content.replace(/\${customer\.phone}/g, deal.customer.phone || '');
      content = content.replace(/\${customer\.address}/g, deal.customer.address || '');
      content = content.replace(/\${customer\.city}/g, deal.customer.city || '');
      content = content.replace(/\${customer\.state}/g, deal.customer.state || '');
      content = content.replace(/\${customer\.zipCode}/g, deal.customer.zipCode || '');
    }
    
    // Replace vehicle variables
    if (deal.vehicle) {
      content = content.replace(/\${vehicle\.make}/g, deal.vehicle.make || '');
      content = content.replace(/\${vehicle\.model}/g, deal.vehicle.model || '');
      content = content.replace(/\${vehicle\.year}/g, String(deal.vehicle.year || ''));
      content = content.replace(/\${vehicle\.vin}/g, deal.vehicle.vin || '');
      content = content.replace(/\${vehicle\.color}/g, deal.vehicle.color || '');
      content = content.replace(/\${vehicle\.trim}/g, deal.vehicle.trim || '');
      content = content.replace(/\${vehicle\.price}/g, deal.vehicle.price || '0.00');
      content = content.replace(/\${vehicle\.odometer}/g, String(deal.vehicle.odometer || '0'));
    }
    
    // Replace F&I product variables
    if (deal.fiProducts && deal.fiProducts.length > 0) {
      let productsText = '';
      let productsTotal = 0;
      
      deal.fiProducts.forEach((product, index) => {
        // Use basePrice for the display price
        const price = parseFloat(product.basePrice);
        productsText += `${index + 1}. ${product.name} - $${price.toFixed(2)}\n`;
        productsTotal += price;
      });
      
      content = content.replace(/\${products\.list}/g, productsText);
      content = content.replace(/\${products\.total}/g, productsTotal.toFixed(2));
    } else {
      content = content.replace(/\${products\.list}/g, 'No additional products');
      content = content.replace(/\${products\.total}/g, '0.00');
    }
    
    // Replace current date
    content = content.replace(/\${currentDate}/g, new Date().toLocaleDateString());
    
    return content;
  } catch (error) {
    log(`Error rendering contract template: ${error}`, 'error');
    throw error;
  }
}

/**
 * Generate a PDF document from a contract
 */
export async function generateContractPdf(contractId: number): Promise<string | undefined> {
  try {
    // Get the contract
    const contract = await storage.getDealContract(contractId);
    
    if (!contract) {
      throw new Error(`Contract not found with ID: ${contractId}`);
    }
    
    // Get the deal
    const deal = await storage.getDealWithRelations(contract.dealId);
    
    if (!deal) {
      throw new Error(`Deal not found for contract with ID: ${contractId}`);
    }
    
    // Generate the document - convert content to JSON if it's a string
    const documentContent = typeof contract.content === 'string' ? contract.content : JSON.stringify(contract.content);
    
    // Create a document object to pass to generateDocument
    const documentData = {
      dealId: deal.id,
      name: `Contract_${contract.id}`,
      type: 'contract',
      content: documentContent,
      status: 'generated',
      order: 1
    };
    
    // Generate PDF
    const pdfContent = await generateDocument(documentData, 'pdf');
    
    return pdfContent;
  } catch (error) {
    log(`Error generating contract PDF: ${error}`, 'error');
    return undefined;
  }
}

/**
 * Sign a contract with customer or dealer signature
 */
export async function signContract(
  contractId: number, 
  signatureData: string, 
  isCustomer: boolean
): Promise<DealContract | undefined> {
  try {
    return await storage.signDealContract(contractId, signatureData, isCustomer);
  } catch (error) {
    log(`Error signing contract: ${error}`, 'error');
    return undefined;
  }
}

/**
 * Generate all required contracts for a deal based on state and deal type
 */
export async function generateAllRequiredContracts(dealId: number): Promise<DealContract[]> {
  try {
    // Get the deal with all related data
    const deal = await storage.getDealWithRelations(dealId);
    
    if (!deal) {
      throw new Error(`Deal not found with ID: ${dealId}`);
    }
    
    const state = deal.customer?.state || 'unknown';
    const generatedContracts: DealContract[] = [];
    
    // Get required contract templates for this state
    const baseTemplates = await storage.getContractTemplatesByCategory('base');
    const stateTemplates = await storage.getContractTemplatesByCategory(state.toLowerCase());
    
    // Generate base contracts (required for all deals)
    for (const template of baseTemplates) {
      const contract = await generateContractFromTemplate(dealId, template.id);
      if (contract) {
        generatedContracts.push(contract);
      }
    }
    
    // Generate state-specific contracts
    for (const template of stateTemplates) {
      const contract = await generateContractFromTemplate(dealId, template.id);
      if (contract) {
        generatedContracts.push(contract);
      }
    }
    
    return generatedContracts;
  } catch (error) {
    log(`Error generating required contracts: ${error}`, 'error');
    return [];
  }
}