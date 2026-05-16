// LLM Proxy Routes for B4uSign
// Proxies requests to the LLM router service

import { Router } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const router = Router();

// Validation schemas
const ChatRequestSchema = z.object({
  provider: z.enum(["groq", "openrouter", "fireworks", "demo"]).optional().default("groq"),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.3),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string()
  })).min(1)
});

const FIChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string()
  })).min(1),
  objection_type: z.string().optional(),
  scenario: z.string().optional(),
  product: z.string().optional().default("VSC")
});

// Check if LLM router is available, otherwise use mock responses for demo
const LLM_ROUTER_URL = process.env.LLM_ROUTER_URL || "http://localhost:3001";

// Health check - works even without external LLM router
router.get("/health", async (req, res) => {
  res.json({
    service: "B4uSign LLM Proxy",
    status: "healthy",
    providers: ["demo", "groq", "openrouter", "fireworks"],
    mode: process.env.LLM_ROUTER_URL ? "external" : "demo"
  });
});

// Chat endpoint - falls back to demo mode if router unavailable
router.post("/chat", async (req, res) => {
  try {
    // Validate request
    const validationResult = ChatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const error = fromZodError(validationResult.error);
      return res.status(400).json({ error: error.message });
    }

    const chatRequest = validationResult.data;

    // Skip external router if demo provider is explicitly requested
    if (chatRequest.provider !== "demo" && (process.env.LLM_ROUTER_URL || process.env.GROQ_API_KEY || process.env.OPENROUTER_KEY || process.env.FIREWORKS_API_KEY)) {
      try {
        const response = await fetch(`${LLM_ROUTER_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(chatRequest)
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({
            ...data,
            proxy: "B4uSign",
            cached: false
          });
        }
      } catch (routerError) {
        console.log("LLM router unavailable, falling back to demo mode");
      }
    }

    // Demo mode fallback - intelligent responses for common F&I questions
    const userMessage = chatRequest.messages.find(m => m.role === "user")?.content?.toLowerCase() || "";
    let demoResponse = "Thank you for your question about our warranty services.";

    if (userMessage.includes("warranty") || userMessage.includes("coverage")) {
      demoResponse = "Our vehicle warranties provide comprehensive coverage for unexpected repairs. We work with over 20 top-rated providers to find the best plan for your specific vehicle and budget. Extended warranties can save you thousands on major repairs and provide peace of mind.";
    } else if (userMessage.includes("expensive") || userMessage.includes("cost")) {
      demoResponse = "I understand cost is a concern. Our warranties are competitively priced and can actually save you money in the long run. A single major repair can cost more than the entire warranty. We offer flexible payment options and can find coverage that fits your budget.";
    } else if (userMessage.includes("don't need") || userMessage.includes("waste")) {
      demoResponse = "Many customers initially feel that way, but consider this: as vehicles age, repair costs increase significantly. Our warranties have helped thousands of customers avoid unexpected expenses. Even reliable vehicles can have costly failures, and a warranty ensures you're protected.";
    } else if (userMessage.includes("compare") || userMessage.includes("difference")) {
      demoResponse = "Great question! We compare multiple warranty providers to find the best match for your vehicle. Key differences include coverage levels (powertrain vs comprehensive), deductible amounts, claim processes, and network of approved repair facilities. Our platform makes this comparison easy.";
    }

    res.json({
      provider: chatRequest.provider || "demo",
      model: "b4usign-demo",
      temperature: 0.3,
      content: demoResponse,
      service: "B4uSign AI Demo",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("LLM proxy chat error:", error);
    res.status(500).json({
      error: "Internal proxy error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// F&I specialized chat endpoint - with demo fallback
router.post("/fi-chat", async (req, res) => {
  try {
    // Validate request
    const validationResult = FIChatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const error = fromZodError(validationResult.error);
      return res.status(400).json({ error: error.message });
    }

    const fiChatRequest = validationResult.data;

    // Try external F&I router first if available
    if (process.env.LLM_ROUTER_URL || process.env.GROQ_API_KEY) {
      try {
        const response = await fetch(`${LLM_ROUTER_URL}/fi-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(fiChatRequest)
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({
            ...data,
            proxy: "B4uSign F&I"
          });
        }
      } catch (routerError) {
        console.log("F&I router unavailable, using demo responses");
      }
    }

    // F&I Demo mode with specialized objection handling
    const userMessage = fiChatRequest.messages.find(m => m.role === "user")?.content?.toLowerCase() || "";
    const objectionType = fiChatRequest.objection_type;
    const product = fiChatRequest.product || "VSC";

    let fiResponse = "I understand your concern. Let me help address that.";

    // Specialized responses based on objection type
    switch (objectionType) {
      case "brand_reliability":
        fiResponse = "I appreciate that you trust your vehicle's reliability. However, even the most reliable brands can have unexpected failures. Our extended warranty specifically covers the components that typically fail after the factory warranty expires, regardless of the brand's reputation.";
        break;
      case "price_affordability":
        fiResponse = "Budget is important to consider. Think of warranty coverage as insurance against unexpected repair bills. The monthly cost is often less than what you'd pay for one major repair. We also offer flexible payment terms that can work with your budget.";
        break;
      case "belief_skepticism":
        fiResponse = "I understand your skepticism - many people feel that way initially. The key is understanding that warranties aren't about the likelihood of needing repairs, but about financial protection when they do occur. Our claims data shows that most customers save significantly over the life of their coverage.";
        break;
      default:
        if (userMessage.includes("expensive") || userMessage.includes("cost")) {
          fiResponse = "Cost is definitely a valid concern. Let's look at it from a different angle - what would a major transmission or engine repair cost you out of pocket? Often that single repair would exceed the entire cost of warranty coverage. We're essentially spreading that risk over manageable monthly payments.";
        } else if (userMessage.includes("don't need") || userMessage.includes("waste")) {
          fiResponse = "Many customers initially feel they don't need coverage, especially with newer vehicles. However, today's vehicles are more complex than ever - with advanced electronics, computerized systems, and precision engineering that can be expensive to repair. Even a small electronic component failure can result in a costly repair bill.";
        }
    }

    res.json({
      response: fiResponse,
      provider: "demo",
      model: "b4usign-fi-demo",
      objection_type: objectionType,
      scenario: fiChatRequest.scenario,
      product: product,
      service: "B4uSign F&I Demo",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("F&I proxy chat error:", error);
    res.status(500).json({
      error: "Internal F&I proxy error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Provider status endpoint
router.get("/providers", async (req, res) => {
  const providers = ["groq", "openrouter", "fireworks"];
  const status = await Promise.all(
    providers.map(async (provider) => {
      try {
        const response = await fetch(`${LLM_ROUTER_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            messages: [{ role: "user", content: "test" }]
          })
        });
        return {
          provider,
          status: response.ok ? "available" : "error",
          latency: response.ok ? "fast" : "unavailable"
        };
      } catch {
        return {
          provider,
          status: "unavailable",
          latency: "timeout"
        };
      }
    })
  );

  res.json({
    providers: status,
    router_url: LLM_ROUTER_URL,
    proxy: "B4uSign LLM Proxy"
  });
});

export { router as default };