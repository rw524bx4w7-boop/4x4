import OpenAI from "openai";
import type { DealWithRelations, FiProduct } from "@shared/schema";
import { log } from "../vite";

let openai: OpenAI | null = null;
let localAIClient: any = null;

export interface ClosingToolRequest {
  dealId: number;
  customerConcerns?: string[];
  selectedProducts: number[];
  customerBudget?: number;
  urgency?: 'low' | 'medium' | 'high';
  customerType?: 'first_time' | 'returning' | 'referral';
}

export interface ClosingToolResponse {
  closingStrategy: string;
  objectionHandling: string[];
  valuePropositions: string[];
  urgencyTactics: string[];
  finalOffer?: {
    discountPercentage: number;
    bundleDiscount: number;
    timeLimit: string;
    reasoning: string;
  };
  nextSteps: string[];
  confidence: number; // 0-100
}

function getAIClient(): any {
  // Priority: Local AI Router > Local AI models > OpenAI > Fallback
  
  // Check for local LLM router (Groq, OpenRouter, Fireworks)
  if (process.env.LLM_ROUTER_ENDPOINT) {
    if (!localAIClient) {
      try {
        localAIClient = {
          chat: {
            completions: {
              create: async (params: any) => {
                const response = await fetch(`${process.env.LLM_ROUTER_ENDPOINT}/chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    provider: process.env.LLM_PROVIDER || 'groq',
                    model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
                    messages: params.messages,
                    temperature: params.temperature || 0.3
                  })
                });
                const data = await response.json();
                return {
                  choices: [{
                    message: { content: data.content }
                  }]
                };
              }
            }
          }
        };
        log(`Initialized LLM router client: ${process.env.LLM_PROVIDER || 'groq'}`, 'info');
      } catch (error) {
        log(`Error initializing LLM router client: ${error}`, 'error');
        localAIClient = null;
      }
    }
    return localAIClient;
  }
  
  // Check for local AI endpoint (Phi-3, Mistral 7B, or LLaMA 3)
  if (process.env.LOCAL_AI_ENDPOINT) {
    if (!localAIClient) {
      try {
        // Configure for local AI models with OpenAI-compatible API
        localAIClient = new OpenAI({
          apiKey: process.env.LOCAL_AI_KEY || 'local-ai-key',
          baseURL: process.env.LOCAL_AI_ENDPOINT,
        });
        log(`Initialized local AI client: ${process.env.LOCAL_AI_MODEL || 'Unknown model'}`, 'info');
      } catch (error) {
        log(`Error initializing local AI client: ${error}`, 'error');
        localAIClient = null;
      }
    }
    return localAIClient;
  }
  
  // Fallback to OpenAI if available
  if (process.env.OPENAI_API_KEY) {
    if (!openai) {
      try {
        openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        log('Using OpenAI for AI closing tool', 'info');
      } catch (error) {
        log(`Error initializing OpenAI client: ${error}`, 'error');
        return null;
      }
    }
    return openai;
  }
  
  log('No AI service available for closing tool - using rules-based system', 'warn');
  return null;
}

/**
 * Generates AI-powered closing strategies and tactics for F&I product sales
 */
export async function generateClosingStrategy(
  request: ClosingToolRequest,
  deal: DealWithRelations,
  availableProducts: FiProduct[]
): Promise<ClosingToolResponse> {
  const client = getAIClient();
  
  // Fallback to rules-based system if no AI client is available
  if (!client) {
    return generateFallbackClosingStrategy(request, deal, availableProducts);
  }

  try {
    // Prepare context for AI
    const dealContext = {
      vehicleInfo: {
        year: deal.vehicle.year,
        make: deal.vehicle.make,
        model: deal.vehicle.model,
        price: deal.vehicle.price,
        odometer: deal.vehicle.odometer
      },
      customerInfo: {
        name: `${deal.customer.firstName} ${deal.customer.lastName}`,
        creditScore: deal.customer.creditScore || 0,
        annualIncome: deal.customer.annualIncome || "0"
      },
      dealInfo: {
        amount: deal.amount,
        monthlyPayment: deal.monthlyPayment,
        term: deal.term,
        apr: deal.apr
      }
    };

    const selectedProductsInfo = availableProducts
      .filter(p => request.selectedProducts.includes(p.id))
      .map(p => ({
        name: p.name,
        price: p.basePrice,
        monthlyPrice: p.monthlyPrice,
        description: p.description
      }));

    const prompt = `
You are an expert F&I (Finance & Insurance) closing specialist for vehicle warranty sales. 
Analyze the customer situation and provide strategic closing guidance.

DEAL CONTEXT:
Vehicle: ${dealContext.vehicleInfo.year} ${dealContext.vehicleInfo.make} ${dealContext.vehicleInfo.model}
Vehicle Price: $${dealContext.vehicleInfo.price}
Customer: ${dealContext.customerInfo.name}
Credit Score: ${dealContext.customerInfo.creditScore}
Monthly Payment: $${dealContext.dealInfo.monthlyPayment}

SELECTED PRODUCTS:
${selectedProductsInfo.map(p => `- ${p.name}: $${p.price} ($${p.monthlyPrice}/month)`).join('\n')}

CUSTOMER SITUATION:
${request.customerConcerns ? `Concerns: ${request.customerConcerns.join(', ')}` : 'No specific concerns mentioned'}
Budget Sensitivity: ${request.customerBudget ? `$${request.customerBudget}` : 'Not specified'}
Urgency Level: ${request.urgency || 'medium'}
Customer Type: ${request.customerType || 'unknown'}

Provide a comprehensive closing strategy in JSON format with these fields:
{
  "closingStrategy": "Primary approach and talking points",
  "objectionHandling": ["Array of specific objection responses"],
  "valuePropositions": ["Array of key value points to emphasize"],
  "urgencyTactics": ["Array of time-sensitive motivators"],
  "finalOffer": {
    "discountPercentage": number (0-15),
    "bundleDiscount": number (in dollars),
    "timeLimit": "specific timeframe",
    "reasoning": "why this offer works"
  },
  "nextSteps": ["Array of immediate actions to take"],
  "confidence": number (0-100)
}

Focus on:
1. Customer-specific value propositions
2. Addressing budget concerns tactfully
3. Creating urgency without pressure
4. Ethical closing techniques
5. Building trust and rapport
`;

    // Determine model based on environment
    const model = process.env.LOCAL_AI_MODEL || "gpt-4o";
    
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are an expert F&I closing specialist. Provide ethical, effective closing strategies in valid JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: process.env.LOCAL_AI_ENDPOINT ? undefined : { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(response) as ClosingToolResponse;
    
    // Validate and sanitize the response
    return {
      closingStrategy: parsed.closingStrategy || "Focus on value and customer needs",
      objectionHandling: Array.isArray(parsed.objectionHandling) ? parsed.objectionHandling : [],
      valuePropositions: Array.isArray(parsed.valuePropositions) ? parsed.valuePropositions : [],
      urgencyTactics: Array.isArray(parsed.urgencyTactics) ? parsed.urgencyTactics : [],
      finalOffer: parsed.finalOffer || {
        discountPercentage: 5,
        bundleDiscount: 100,
        timeLimit: "end of business today",
        reasoning: "Standard new customer offer"
      },
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      confidence: Math.min(100, Math.max(0, parsed.confidence || 75))
    };

  } catch (error) {
    log(`Error generating AI closing strategy: ${error}`, 'error');
    return generateFallbackClosingStrategy(request, deal, availableProducts);
  }
}

/**
 * Fallback closing strategy when AI is not available
 */
function generateFallbackClosingStrategy(
  request: ClosingToolRequest,
  deal: DealWithRelations,
  availableProducts: FiProduct[]
): ClosingToolResponse {
  const selectedProducts = availableProducts.filter(p => request.selectedProducts.includes(p.id));
  const totalValue = selectedProducts.reduce((sum, p) => sum + Number(p.basePrice), 0);
  
  // Rules-based closing strategy
  let strategy = "Focus on the protection and peace of mind these products provide.";
  let confidence = 70;
  
  // Adjust strategy based on customer type
  if (request.customerType === 'first_time') {
    strategy = "Emphasize education and protection for their first vehicle purchase.";
    confidence = 75;
  } else if (request.customerType === 'returning') {
    strategy = "Build on previous positive experience and upgraded protection.";
    confidence = 80;
  }
  
  // Adjust for urgency
  const urgencyTactics = [];
  if (request.urgency === 'high') {
    urgencyTactics.push("Limited-time pricing available today only");
    urgencyTactics.push("Rates may increase next week");
  } else if (request.urgency === 'medium') {
    urgencyTactics.push("Special pricing available this week");
  }
  
  // Budget-conscious adjustments
  let discountPercentage = 5;
  if (request.customerBudget && totalValue > request.customerBudget) {
    discountPercentage = 10;
    urgencyTactics.push("Special budget-friendly package available");
  }
  
  return {
    closingStrategy: strategy,
    objectionHandling: [
      "I understand your concern about the additional cost. Let me show you the value breakdown.",
      "Many customers initially feel this way. Here's what changed their mind...",
      "What specific aspect would you like me to explain further?"
    ],
    valuePropositions: [
      "Protects your investment in this vehicle",
      "Provides peace of mind for unexpected repairs",
      "Can be financed into your monthly payment",
      "Transfers if you sell the vehicle early"
    ],
    urgencyTactics,
    finalOffer: {
      discountPercentage,
      bundleDiscount: Math.floor(totalValue * 0.05),
      timeLimit: "end of business today",
      reasoning: "Standard new customer incentive"
    },
    nextSteps: [
      "Review the final numbers together",
      "Address any remaining questions",
      "Complete the paperwork",
      "Schedule delivery or pickup"
    ],
    confidence
  };
}

/**
 * Analyzes customer interaction patterns to suggest optimal closing timing
 */
export function analyzeClosingTiming(
  chatHistory: any[],
  timeSpent: number,
  productViewCount: number
): {
  readinessScore: number;
  suggestedAction: string;
  reasoning: string;
} {
  let readinessScore = 50; // Base score
  
  // Analyze time spent (sweet spot is 10-20 minutes)
  if (timeSpent >= 600 && timeSpent <= 1200) { // 10-20 minutes
    readinessScore += 20;
  } else if (timeSpent < 300) { // Less than 5 minutes
    readinessScore -= 15;
  } else if (timeSpent > 1800) { // More than 30 minutes
    readinessScore -= 10;
  }
  
  // Analyze product engagement
  if (productViewCount >= 3) {
    readinessScore += 15;
  } else if (productViewCount <= 1) {
    readinessScore -= 10;
  }
  
  // Analyze chat patterns
  const positiveKeywords = ['interested', 'sounds good', 'tell me more', 'how much', 'when'];
  const concernKeywords = ['expensive', 'think about it', 'budget', 'not sure', 'spouse'];
  
  let positiveSignals = 0;
  let concernSignals = 0;
  
  chatHistory.forEach(message => {
    const content = message.content?.toLowerCase() || '';
    positiveKeywords.forEach(keyword => {
      if (content.includes(keyword)) positiveSignals++;
    });
    concernKeywords.forEach(keyword => {
      if (content.includes(keyword)) concernSignals++;
    });
  });
  
  readinessScore += (positiveSignals * 5) - (concernSignals * 3);
  
  // Cap the score between 0 and 100
  readinessScore = Math.min(100, Math.max(0, readinessScore));
  
  // Determine suggested action
  let suggestedAction = "Continue building rapport";
  let reasoning = "Customer needs more time to warm up";
  
  if (readinessScore >= 80) {
    suggestedAction = "Present final offer and close";
    reasoning = "Strong buying signals detected";
  } else if (readinessScore >= 65) {
    suggestedAction = "Begin trial close attempts";
    reasoning = "Customer showing moderate interest";
  } else if (readinessScore >= 45) {
    suggestedAction = "Address concerns and build value";
    reasoning = "Customer has reservations to overcome";
  }
  
  return {
    readinessScore,
    suggestedAction,
    reasoning
  };
}