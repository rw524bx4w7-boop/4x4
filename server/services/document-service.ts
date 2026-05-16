import type { DealWithRelations, InsertDocument } from "@shared/schema";
import { calculateTaxesAndFees, calculateMonthlyPayment } from "./jdc-service";
import { storage } from "../storage";
import { log } from "../vite";

/**
 * Generate a document based on the document type and deal data
 */
export async function generateDocument(
  documentData: InsertDocument,
  format: string = 'json'
): Promise<string> {
  try {
    const document = await storage.createDocument(documentData);
    const deal = await storage.getDealWithRelations(documentData.dealId);
    
    if (!deal) {
      throw new Error(`Deal not found with ID: ${documentData.dealId}`);
    }
    
    let documentContent: any;
    
    if (typeof documentData.content === 'string') {
      documentContent = documentData.content;
    } else {
      documentContent = await generateDocumentContent(documentData.type, deal);
    }
    
    switch (format.toLowerCase()) {
      case 'pdf':
        return generatePdf(documentContent);
      case 'html':
        return generateHtml(documentContent);
      case 'json':
      default:
        return JSON.stringify(documentContent, null, 2);
    }
  } catch (error) {
    log(`Error generating document: ${error}`, 'error');
    throw error;
  }
}

async function generateDocumentContent(
  documentType: string,
  deal: DealWithRelations
): Promise<any> {
  const { customer, vehicle, user } = deal;
  const date = new Date().toLocaleDateString();
  
  switch (documentType) {
    case "credit-app": {
      return {
        title: "Credit Application",
        date,
        customerInfo: {
          name: `${customer.firstName} ${customer.lastName}`,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          email: customer.email,
          phone: customer.phone
        },
        employmentInfo: {
          employer: customer.employer,
          annualIncome: customer.annualIncome
        },
        dealerInfo: {
          name: `${user.firstName} ${user.lastName}`,
          dealershipId: user.dealershipId
        }
      };
    }
    
    case "purchase-agreement": {
      const fiProducts = deal.fiProducts || [];
      const fiProductsTotal = fiProducts.reduce((sum, product) => sum + parseFloat(product.basePrice), 0);
      
      const jdcResult = await calculateTaxesAndFees(
        customer.zipCode,
        parseFloat(vehicle.price),
        parseFloat(deal.tradeInValue?.toString() || '0'),
        parseFloat(deal.tradeInPayoff?.toString() || '0'),
        fiProducts
      );
      
      const tradeInValue = parseFloat(deal.tradeInValue?.toString() || '0');
      const tradeInPayoff = parseFloat(deal.tradeInPayoff?.toString() || '0');
      const netTradeEquity = tradeInValue - tradeInPayoff;
      const purchasePrice = parseFloat(vehicle.price);
      const totalDue = jdcResult.totalDue || (purchasePrice + jdcResult.taxAmount + jdcResult.totalFees);
      const downPayment = parseFloat(deal.downPayment?.toString() || '0');
      const amountFinanced = totalDue - downPayment - (netTradeEquity > 0 ? netTradeEquity : 0);
      
      return {
        title: "Vehicle Purchase Agreement",
        contractNumber: `VPA-${Math.floor(Math.random() * 10000000)}`,
        date,
        buyerInfo: {
          name: `${customer.firstName} ${customer.lastName}`,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          phone: customer.phone
        },
        vehicleInfo: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          vin: vehicle.vin,
          color: vehicle.color,
          odometer: vehicle.odometer
        },
        purchaseDetails: {
          purchasePrice: vehicle.price,
          tradeInValue: deal.tradeInValue || 0,
          tradeInPayoff: deal.tradeInPayoff || 0,
          netTradeEquity,
          salesTax: jdcResult.taxAmount,
          taxRate: `${jdcResult.taxRate}%`,
          documentationFee: jdcResult.docFee,
          registrationFee: jdcResult.registrationFee,
          titleFee: jdcResult.titleFee,
          fiProductsTotal,
          totalFees: jdcResult.totalFees,
          totalDue: jdcResult.totalDue,
          downPayment: deal.downPayment || 0,
          totalFinanced: amountFinanced
        },
        dealerInfo: {
          name: `${user.firstName} ${user.lastName}`,
          dealershipId: user.dealershipId
        }
      };
    }
    
    case "warranty": {
      const warrantyProduct = deal.fiProducts?.find(p => p.name.includes("Warranty"));
      
      if (!warrantyProduct) {
        return {
          title: "Warranty Agreement",
          content: "No warranty product selected for this deal."
        };
      }
      
      return {
        title: "Warranty Agreement",
        contractNumber: `WAR-${Math.floor(Math.random() * 10000000)}`,
        date,
        customerInfo: {
          name: `${customer.firstName} ${customer.lastName}`,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode
        },
        vehicleInfo: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          vin: vehicle.vin,
          odometer: vehicle.odometer
        },
        warrantyDetails: {
          name: warrantyProduct.name,
          description: warrantyProduct.description,
          price: warrantyProduct.basePrice,
          coverageTerm: "7 years or 100,000 miles",
          deductible: 10000,
          effective: date,
          expiration: "See Terms and Conditions"
        }
      };
    }
    
    case "finance": {
      const fiProducts = deal.fiProducts || [];
      const fiProductsTotal = fiProducts.reduce((sum, product) => sum + parseFloat(product.basePrice), 0);
      
      const jdcResult = await calculateTaxesAndFees(
        customer.zipCode,
        parseFloat(vehicle.price),
        parseFloat(deal.tradeInValue?.toString() || '0'),
        parseFloat(deal.tradeInPayoff?.toString() || '0'),
        fiProducts
      );
      
      const tradeInValue = parseFloat(deal.tradeInValue?.toString() || '0');
      const tradeInPayoff = parseFloat(deal.tradeInPayoff?.toString() || '0');
      const netTradeEquity = tradeInValue - tradeInPayoff;
      const purchasePrice = parseFloat(vehicle.price);
      const totalDue = jdcResult.totalDue || (purchasePrice + jdcResult.taxAmount + jdcResult.totalFees);
      const downPayment = parseFloat(deal.downPayment?.toString() || '0');
      const tradeInCredit = netTradeEquity > 0 ? netTradeEquity : 0;
      const negativeEquity = netTradeEquity < 0 ? Math.abs(netTradeEquity) : 0;
      const amountFinanced = totalDue - downPayment - tradeInCredit + negativeEquity;
      const term = deal.term || 60;
      const apr = deal.apr || 4.9;
      const calculatedPayment = calculateMonthlyPayment(amountFinanced, 0, apr, term);
      const totalPayments = calculatedPayment * term;
      const totalInterest = totalPayments - amountFinanced;
      
      return {
        title: "Finance Agreement",
        contractNumber: `FIN-${Math.floor(Math.random() * 10000000)}`,
        date,
        customerInfo: {
          name: `${customer.firstName} ${customer.lastName}`,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode
        },
        vehicleInfo: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          vin: vehicle.vin,
          mileage: vehicle.odometer
        },
        financeDetails: {
          purchasePrice,
          salesTax: jdcResult.taxAmount,
          docFee: jdcResult.docFee,
          registrationFee: jdcResult.registrationFee,
          titleFee: jdcResult.titleFee,
          fiProductsTotal,
          totalFees: jdcResult.totalFees,
          tradeInValue,
          tradeInPayoff,
          netTradeEquity,
          downPayment,
          amountFinanced,
          term,
          apr,
          monthlyPayment: calculatedPayment,
          totalInterest,
          totalOfPayments: totalPayments,
          firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          maturityDate: new Date(Date.now() + (term + 1) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        }
      };
    }
    
    case "odometer-disclosure": {
      return {
        title: "Odometer Disclosure Statement",
        date,
        customerInfo: {
          name: `${customer.firstName} ${customer.lastName}`,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode
        },
        vehicleInfo: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          vin: vehicle.vin,
          odometer: vehicle.odometer
        },
        certification: "I hereby certify that to the best of my knowledge the odometer reading reflects the actual mileage of the vehicle described above."
      };
    }
    
    case "contract": {
      return {
        title: "Contract",
        date,
        content: "See contract content"
      };
    }
    
    default:
      return {
        title: "Unknown Document Type",
        content: "Document template not found."
      };
  }
}

function generatePdf(content: any): string {
  if (typeof content === 'string') {
    return `PDF_CONTENT:${content}`;
  }
  return `PDF_CONTENT:${JSON.stringify(content)}`;
}

function generateHtml(content: any): string {
  if (typeof content === 'string') {
    return `<html><body><pre>${content}</pre></body></html>`;
  }
  
  let html = '<html><body>';
  if (content.title) html += `<h1>${content.title}</h1>`;
  if (content.date) html += `<p>Date: ${content.date}</p>`;
  if (content.content) {
    html += `<div>${content.content}</div>`;
  } else {
    html += `<pre>${JSON.stringify(content, null, 2)}</pre>`;
  }
  html += '</body></html>';
  
  return html;
}