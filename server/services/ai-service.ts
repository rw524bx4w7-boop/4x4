import type { DealWithRelations, FiProduct } from "@shared/schema";
import { generateFiRecommendations } from './openai-service';
import { log } from '../vite';

interface RecommendationResponse {
  products: FiProduct[];
  explanations: Map<number, string>;
  customerProfile: string;
}

export async function generateAiRecommendations(
  deal: DealWithRelations,
  availableProducts: FiProduct[]
): Promise<RecommendationResponse> {
  try {
    // Try to use the OpenAI service first
    const aiResponse = await generateFiRecommendations(deal, availableProducts);
    
    // If we have a response from OpenAI, use it
    if (aiResponse) {
      const recommendedProducts: FiProduct[] = [];
      const explanations = new Map<number, string>();
      
      // Convert the product IDs to actual product objects
      for (const productId of aiResponse.products) {
        const product = availableProducts.find(p => p.id === productId);
        if (product) {
          recommendedProducts.push(product);
          // Convert the explanations from record to map
          if (aiResponse.explanations[productId]) {
            explanations.set(productId, aiResponse.explanations[productId]);
          }
        }
      }
      
      return {
        products: recommendedProducts,
        explanations,
        customerProfile: aiResponse.customerProfile
      };
    }
    
    // Fallback to deterministic recommendations if OpenAI service fails
    log("Using fallback recommendation system", "info");
    return generateFallbackRecommendations(deal, availableProducts);
  } catch (error) {
    log(`Error in AI recommendations: ${error}`, "error");
    return generateFallbackRecommendations(deal, availableProducts);
  }
}

// Fallback recommendation system that doesn't rely on OpenAI
function generateFallbackRecommendations(
  deal: DealWithRelations,
  availableProducts: FiProduct[]
): RecommendationResponse {
  const recommendedProducts: FiProduct[] = [];
  const explanations = new Map<number, string>();
  let customerProfile = "";
  
  // Basic customer profile
  const { customer, vehicle } = deal;
  const vehicleValue = Number(vehicle.price);
  let creditScore = customer.creditScore || 680; // Default if no credit score
  
  // Create a simple profile description
  customerProfile = `${customer.firstName} ${customer.lastName} is purchasing a ${vehicle.year} ${vehicle.make} ${vehicle.model}. `;
  
  if (vehicle.odometer < 100) {
    customerProfile += "This is a new vehicle. ";
  } else {
    customerProfile += `This vehicle has ${vehicle.odometer} miles on it. `;
  }
  
  if (creditScore > 720) {
    customerProfile += "They have excellent credit. ";
  } else if (creditScore > 660) {
    customerProfile += "They have good credit. ";
  } else {
    customerProfile += "They have average credit. ";
  }
  
  // Apply some simple rules for recommendations
  
  // Extended Warranty
  const warrantyProduct = availableProducts.find(p => p.name.includes("Extended Warranty"));
  if (warrantyProduct) {
    if (vehicle.odometer > 30000 || vehicleValue > 25000) {
      recommendedProducts.push(warrantyProduct);
      explanations.set(warrantyProduct.id, 
        vehicle.odometer > 30000 
          ? "Recommended due to vehicle's higher mileage. This will protect against unexpected mechanical and electrical failures."
          : "Recommended for this premium vehicle to maintain value and avoid costly repairs."
      );
    }
  }
  
  // GAP Insurance
  const gapProduct = availableProducts.find(p => p.name.includes("GAP"));
  if (gapProduct) {
    if (deal.downPayment && Number(deal.downPayment) < vehicleValue * 0.2) {
      recommendedProducts.push(gapProduct);
      explanations.set(gapProduct.id, 
        "Recommended because your down payment is less than 20%. GAP insurance covers the difference between what you owe and what the vehicle is worth if it's totaled."
      );
    }
  }
  
  // Tire & Wheel Protection
  const tireProduct = availableProducts.find(p => p.name.includes("Tire"));
  if (tireProduct && vehicle.make.match(/BMW|Mercedes|Audi|Lexus/i)) {
    recommendedProducts.push(tireProduct);
    explanations.set(tireProduct.id, 
      "Recommended for your luxury vehicle, which typically has more expensive tires and wheels that are costly to replace if damaged by road hazards."
    );
  }
  
  // If no products were recommended, recommend the most popular one
  if (recommendedProducts.length === 0 && availableProducts.length > 0) {
    const defaultProduct = availableProducts.find(p => p.recommended) || availableProducts[0];
    recommendedProducts.push(defaultProduct);
    explanations.set(defaultProduct.id, 
      "This is our most popular protection product that provides excellent value and peace of mind for your new vehicle."
    );
  }
  
  return {
    products: recommendedProducts,
    explanations,
    customerProfile
  };
}
