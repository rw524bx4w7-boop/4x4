import OpenAI from 'openai';
import { handleFiChatWithoutAI, generateSimplePaymentComparison as rulesBasedPaymentComparison } from './rules-based-fi-service';
import type { DealWithRelations, FiProduct } from "@shared/schema";
import { log } from '../vite';

let openai: OpenAI | null = null;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface FiChatResponse {
  response: string;
  recommendedProductIds?: number[];
  dealInsights?: string;
}

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    log('OpenAI API key is not available', 'warn');
    return null;
  }
  
  if (!openai) {
    try {
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      log(`Error initializing OpenAI client: ${error}`, 'error');
      return null;
    }
  }
  
  return openai;
}

export async function processFiChat(
  userMessage: string,
  deal: DealWithRelations,
  availableProducts: FiProduct[],
  chatHistory: ChatMessage[] = []
): Promise<FiChatResponse> {
  const client = getOpenAIClient();
  
  if (!client) {
    log('Using rules-based F&I chat system', 'info');
    const currentProducts = deal.fiProducts || [];
    const response = handleFiChatWithoutAI(userMessage, deal, availableProducts, currentProducts);
    
    return {
      response,
      dealInsights: generateDealInsights(deal, availableProducts)
    };
  }

  try {
    const vehicleInfo = {
      year: deal.vehicle.year,
      make: deal.vehicle.make,
      model: deal.vehicle.model,
      trim: deal.vehicle.trim,
      odometer: deal.vehicle.odometer,
      price: deal.vehicle.price.toString(),
      status: deal.vehicle.status,
    };

    const customerInfo = {
      name: `${deal.customer.firstName} ${deal.customer.lastName}`,
      creditScore: deal.customer.creditScore || 0,
      annualIncome: deal.customer.annualIncome || "0",
    };

    const dealInfo = {
      dealType: deal.dealType,
      amount: deal.amount.toString(),
      downPayment: deal.downPayment?.toString() || "0",
      term: deal.term || 0,
      apr: deal.apr || 0,
      monthlyPayment: deal.monthlyPayment?.toString() || "0",
      tradeInValue: deal.tradeInValue?.toString() || "0",
    };

    const productsInfo = availableProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice.toString(),
      monthlyPrice: p.monthlyPrice?.toString() || "0",
      category: p.category,
    }));

    const dealProducts = deal.fiProducts || [];
    const currentProducts = dealProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice.toString(),
    }));

    const systemPrompt = `
You are an expert Finance & Insurance (F&I) assistant at a car dealership, designed to help customers understand
protection products and make informed decisions about their vehicle purchase.

Your expertise covers:
- Extended warranties and service contracts
- GAP insurance
- Tire and wheel protection
- Appearance protection
- Theft protection products
- Prepaid maintenance

Your communication style:
- Be conversational and friendly, but professional
- Avoid high-pressure sales tactics
- Use clear, non-technical language to explain complex terms
- Focus on the value and benefits rather than just features
- Provide specific examples relevant to the customer's vehicle
- Be honest about what products make sense for the customer's situation

Current deal information:
${JSON.stringify({ vehicleInfo, customerInfo, dealInfo }, null, 2)}

Available F&I products:
${JSON.stringify(productsInfo, null, 2)}

Current products selected:
${JSON.stringify(currentProducts, null, 2)}

KEY RULES:
1. Only recommend products from the available list provided
2. If the customer asks about cost impact, calculate and explain both cash price and monthly payment impact
3. When recommending products, include the product ID numbers in your reasoning
4. Be specific about how each recommended product works with their exact vehicle (${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model})
5. If the customer is asking a question unrelated to F&I products, politely redirect them to speak with their sales representative
6. Focus on value and protection, not fear-based selling
7. Don't make up product details - only use what's provided
8. Estimate monthly cost impact when appropriate: product price ÷ loan term with interest
`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 1200,
      top_p: 0.95,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    const productMatches = content.match(/product ID (\d+)|product #(\d+)|ID: (\d+)|ID number (\d+)/gi);
    let recommendedProductIds: number[] = [];
    
    if (productMatches) {
      const allProductIds = productMatches
        .map(match => {
          const id = match.replace(/[^\d]/g, '');
          return parseInt(id, 10);
        })
        .filter(id => !isNaN(id));
      
      recommendedProductIds = allProductIds.filter((id, index) => {
        return allProductIds.indexOf(id) === index;
      });
    }

    const result: FiChatResponse = {
      response: content,
      recommendedProductIds: recommendedProductIds.length > 0 ? recommendedProductIds : undefined,
      dealInsights: generateDealInsights(deal, availableProducts)
    };

    log("F&I chat response generated successfully", "info");
    return result;
  } catch (error) {
    log(`Error generating F&I chat response: ${error}`, "error");
    return {
      response: "I apologize, but I encountered an error while processing your question. Please try asking again or speak with your sales representative."
    };
  }
}

function generateDealInsights(deal: DealWithRelations, availableProducts: FiProduct[]): string {
  const insights: string[] = [];
  const vehicle = deal.vehicle;
  
  if (vehicle.odometer < 100) {
    insights.push("Your new vehicle may benefit from appearance protection to maintain its value.");
  } else if (vehicle.odometer > 50000) {
    insights.push("With this mileage, an extended warranty could provide valuable protection against unexpected repairs.");
  }
  
  const isLuxury = /BMW|Mercedes|Audi|Lexus|Porsche|Tesla|Infiniti|Acura|Cadillac|Lincoln/i.test(vehicle.make);
  if (isLuxury) {
    insights.push("Luxury vehicles typically have higher repair costs, making protection products especially valuable.");
  }
  
  const vehiclePrice = parseFloat(vehicle.price.toString());
  const downPayment = parseFloat(deal.downPayment?.toString() || '0');
  const downPaymentPercentage = (downPayment / vehiclePrice) * 100;
  
  if (downPaymentPercentage < 20) {
    insights.push("With less than 20% down payment, GAP protection is particularly important to cover potential negative equity.");
  }

  if (deal.term && deal.term > 60) {
    insights.push("With your extended loan term, added protection provides peace of mind throughout your ownership period.");
  }
  
  return insights.join(" ");
}

export async function getProductExplanation(
  productId: number,
  deal: DealWithRelations,
  availableProducts: FiProduct[]
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    log('OpenAI client is not available for product explanation.', 'warn');
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return "Product information not available.";
    return `${product.name}: ${product.description}. This product costs $${product.basePrice} as a one-time payment, or can be included in your financing.`;
  }

  try {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return "Product information not available.";

    const vehicle = deal.vehicle;
    
    const prompt = `
Provide a detailed but concise explanation of the "${product.name}" F&I product for a customer purchasing a ${vehicle.year} ${vehicle.make} ${vehicle.model}.

Product details:
${JSON.stringify(product, null, 2)}

Vehicle details:
${JSON.stringify(vehicle, null, 2)}

Generate a personalized explanation that covers:
1. What the product covers in plain language
2. How this specific product would benefit the customer with their ${vehicle.year} ${vehicle.make} ${vehicle.model}
3. What common situations would trigger coverage
4. The value proposition (why it's worth the cost)

Make it personalized to this specific vehicle and conversational, not like a generic product brochure.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert F&I manager who explains protection products clearly to customers." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI");

    return content;
  } catch (error) {
    log(`Error generating product explanation: ${error}`, "error");
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return "Product information not available.";
    return `${product.name}: ${product.description}`;
  }
}

export async function generatePaymentComparison(
  deal: DealWithRelations,
  selectedProductIds: number[],
  availableProducts: FiProduct[]
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    log('OpenAI client is not available for payment comparison.', 'warn');
    return rulesBasedPaymentComparison(deal, selectedProductIds, availableProducts);
  }

  try {
    const selectedProducts = availableProducts.filter(p => selectedProductIds.includes(p.id));
    const vehiclePrice = parseFloat(deal.vehicle.price.toString());
    const downPayment = parseFloat(deal.downPayment?.toString() || '0');
    const term = deal.term || 60;
    const apr = deal.apr || 5.0;
    
    const productTotal = selectedProducts.reduce((sum, product) => {
      return sum + parseFloat(product.basePrice.toString());
    }, 0);
    
    const baseAmount = vehiclePrice - downPayment;
    const monthlyInterestRate = apr / 12 / 100;
    
    const basePayment = calculateMonthlyPayment(baseAmount, monthlyInterestRate, term);
    const newAmount = baseAmount + productTotal;
    const newPayment = calculateMonthlyPayment(newAmount, monthlyInterestRate, term);
    const monthlyDifference = newPayment - basePayment;
    
    const formatAmount = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    
    const paymentData = {
      baseVehiclePrice: formatAmount(vehiclePrice),
      downPayment: formatAmount(downPayment),
      loanTerm: term,
      apr: apr.toFixed(2) + '%',
      baseMonthlyPayment: formatAmount(basePayment),
      selectedProducts: selectedProducts.map(p => ({
        name: p.name,
        price: formatAmount(parseFloat(p.basePrice.toString()))
      })),
      totalProductCost: formatAmount(productTotal),
      newMonthlyPayment: formatAmount(newPayment),
      monthlyDifference: formatAmount(monthlyDifference),
      totalPaid: formatAmount(newPayment * term)
    };
    
    const prompt = `
Generate a clear, concise payment comparison explanation for a customer considering adding F&I products to their vehicle purchase.

Deal Information:
${JSON.stringify(paymentData, null, 2)}

Explain how adding these protection products affects their financing in a helpful, informative way. Include:
1. Current base payment vs. new payment with protections
2. The actual dollar amount difference per month
3. The value perspective of what they're getting for the price
4. A brief personalized explanation considering their ${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}

Keep it conversational and focused on helping them understand the impact on their monthly budget.
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert F&I manager who explains financial impacts clearly to customers." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI");

    return content;
  } catch (error) {
    log(`Error generating payment comparison: ${error}`, "error");
    return rulesBasedPaymentComparison(deal, selectedProductIds, availableProducts);
  }
}

function calculateMonthlyPayment(principal: number, monthlyRate: number, term: number): number {
  if (monthlyRate === 0) {
    return principal / term;
  }
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
}