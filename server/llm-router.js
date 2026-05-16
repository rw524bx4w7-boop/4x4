// server/llm-router.js
// Multi-provider LLM router for B4uSign AI services
// Supports Groq, OpenRouter, and Fireworks for cost-effective local AI
import express from "express";
import cors from "cors";
import { fetch } from "undici";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Read API keys from Replit Secrets / env
const {
  GROQ_API_KEY,
  OPENROUTER_KEY,
  FIREWORKS_API_KEY,
  PORT = 3001  // Different port from main B4uSign server
} = process.env;

app.get("/health", (_req, res) => res.json({ ok: true, service: "B4uSign LLM Router" }));

app.post("/chat", async (req, res) => {
  try {
    const {
      provider = "groq",                         // groq | openrouter | fireworks
      model,                                     // optional override
      messages = [],                             // [{role:"user"/"assistant"/"system", content:"..."}]
      temperature = 0.3,
      stream = false
    } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] required" });
    }

    let url, headers, payload;

    if (provider === "groq") {
      if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");
      url = "https://api.groq.com/openai/v1/chat/completions";
      headers = {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      };
      payload = {
        model: model || "llama-3.1-8b-instant",
        messages,
        temperature,
        stream
      };

    } else if (provider === "openrouter") {
      if (!OPENROUTER_KEY) throw new Error("Missing OPENROUTER_KEY");
      url = "https://openrouter.ai/api/v1/chat/completions";
      headers = {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      };
      payload = {
        model: model || "meta-llama/llama-3.1-8b-instruct",
        messages,
        temperature,
        stream
      };

    } else if (provider === "fireworks") {
      if (!FIREWORKS_API_KEY) throw new Error("Missing FIREWORKS_API_KEY");
      url = "https://api.fireworks.ai/inference/v1/chat/completions";
      headers = {
        "Authorization": `Bearer ${FIREWORKS_API_KEY}`,
        "Content-Type": "application/json"
      };
      payload = {
        model: model || "accounts/fireworks/models/llama-v3p1-8b-instruct",
        messages,
        temperature
      };

    } else {
      return res.status(400).json({ error: "Unknown provider" });
    }

    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({ error: "Upstream error", status: r.status, body: text });
    }
    const data = await r.json();

    // Normalize response text across providers
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      null;

    if (!content) {
      return res.status(500).json({ error: "No content from model", raw: data });
    }
    
    // Add B4uSign-specific response formatting
    res.json({ 
      provider, 
      model: payload.model, 
      temperature, 
      content,
      service: "B4uSign AI",
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error(`[B4uSign LLM Router Error]: ${err}`);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// B4uSign-specific F&I endpoint
app.post("/fi-chat", async (req, res) => {
  try {
    const { messages, objection_type, scenario, product } = req.body;
    
    // Enhanced system prompt for F&I objection handling
    const systemPrompt = {
      role: "system",
      content: `You are an expert F&I (Finance & Insurance) sales assistant for B4uSign vehicle warranty marketplace. 
      
Use consultative tone and focus on:
- Addressing customer objections professionally
- Recommending appropriate cross-sell products (GAP, roadside assistance, tire/wheel, maintenance plans, rental car)
- Providing value-based responses that acknowledge concerns while explaining benefits
- Using specific scenarios: ${scenario || 'general'}
- Handling objection type: ${objection_type || 'general'}
- Primary product focus: ${product || 'VSC (Vehicle Service Contract)'}

Keep responses concise, helpful, and focused on customer value.`
    };

    const enhancedMessages = [systemPrompt, ...messages];

    // Use Groq for fastest F&I responses (optimized for real-time chat)
    const provider = "groq";
    const model = "llama-3.1-8b-instant";

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY required for F&I chat");
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";
    const headers = {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    };
    const payload = {
      model,
      messages: enhancedMessages,
      temperature: 0.3,
      max_tokens: 500
    };

    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(502).json({ error: "F&I AI service error", status: r.status, body: text });
    }
    
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No F&I response generated", raw: data });
    }

    res.json({
      response: content,
      provider,
      model,
      objection_type,
      scenario,
      product,
      service: "B4uSign F&I AI",
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error(`[B4uSign F&I Error]: ${err}`);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`B4uSign LLM Router listening on :${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Chat endpoint: http://localhost:${PORT}/chat`);
    console.log(`F&I Chat endpoint: http://localhost:${PORT}/fi-chat`);
  });
}