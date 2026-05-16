import OpenAI from 'openai';
import type { DealWithRelations, FiProduct } from "@shared/schema";
import { log } from '../vite';

// Function to get or create the OpenAI client
function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    log('OpenAI API key is not available for chat service', 'warn');
    return null;
  }
  
  try {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } catch (error) {
    log(`Error initializing OpenAI client for chat: ${error}`, 'error');
    return null;
  }
}

export async function generateFiChatResponse(
  question: string,
  deal: DealWithRelations,
  selectedProducts: FiProduct[]
): Promise<string> {
  // Get OpenAI client
  const client = getOpenAIClient();
  
  // If client is not available, return a fallback message
  if (!client) {
    log('OpenAI client is not available. Chat assistant cannot respond.', 'warn');
    return "I'm sorry, I can't answer your question right now. Please try again later or speak with your F&I manager.";
  }

  try {
    // Prepare context for the AI model
    const vehicleInfo = {
      year: deal.vehicle.year,
      make: deal.vehicle.make,
      model: deal.vehicle.model,
      trim: deal.vehicle.trim,
      odometer: deal.vehicle.odometer,
      price: deal.vehicle.price.toString()
    };

    const customerInfo = {
      name: `${deal.customer.firstName} ${deal.customer.lastName}`,
      creditScore: deal.customer.creditScore || 0,
    };

    const dealInfo = {
      dealType: deal.dealType,
      amount: deal.amount.toString(),
      downPayment: deal.downPayment?.toString() || "0",
      term: deal.term || 0,
      apr: deal.apr || 0,
      monthlyPayment: deal.monthlyPayment?.toString() || "0",
    };

    const productsInfo = selectedProducts.map(p => ({
      name: p.name,
      description: p.description,
      basePrice: p.basePrice.toString(),
      monthlyPrice: p.monthlyPrice?.toString() || "0",
      category: p.category,
    }));

    // Construct the prompt
    const userPrompt = `
Customer question: "${question}"

Context:
- The customer ${customerInfo.name} is purchasing a ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} ${vehicleInfo.trim || ''}.
- The vehicle costs $${vehicleInfo.price} and has ${vehicleInfo.odometer} miles.
- The deal is a ${dealInfo.dealType} with a down payment of $${dealInfo.downPayment} and monthly payment of $${dealInfo.monthlyPayment}.
- They have already selected these F&I products: ${productsInfo.map(p => p.name).join(', ')}

Product details:
${productsInfo.map(p => `${p.name}: ${p.description} Base price: $${p.basePrice}, Monthly: $${p.monthlyPrice}`).join('\n')}

Please provide a helpful, friendly response to the customer's question. Focus on addressing their question directly while providing accurate information about the F&I products they've selected. Be concise but thorough, and always be honest about both the benefits and limitations of the products.
`;

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a knowledgeable and friendly F&I assistant at a car dealership. Your goal is to help customers understand their F&I product choices and answer their questions accurately and honestly." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    log("AI chat response generated successfully", "info");
    return content;
  } catch (error) {
    log(`Error generating AI chat response: ${error}`, "error");
    return "I'm sorry, I encountered an error processing your question. Please try again or speak with your F&I manager for assistance.";
  }
}