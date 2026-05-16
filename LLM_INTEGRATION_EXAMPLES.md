# B4uSign LLM Integration Examples

## Package.json for LLM Router

```json
{
  "name": "b4usign-llm-router",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/llm-router.js",
    "dev": "node --watch server/llm-router.js",
    "health": "curl http://localhost:3001/health"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "undici": "^6.19.8"
  }
}
```

## JavaScript Client Usage Examples

### 1. Basic LLM Chat
```javascript
// Import the B4uSign LLM client
import { ask } from '/src/lib/llm-client.ts';

// General purpose AI assistance
const response1 = await ask("Give me 3 headline options for our warranty upsell page.", "groq");

// Using specific provider and model
const response2 = await ask(
  "Rewrite this objection handling script to be friendlier.",
  "openrouter", 
  "meta-llama/llama-3.1-8b-instruct"
);

// Quick content generation
const response3 = await ask("Summarize this page in 5 bullets.", "fireworks");
```

### 2. F&I Specialized Chat
```javascript
import { handleFIObjection, generateFIResponse } from '/src/lib/llm-client.ts';

// Handle specific F&I objections with context
const objectionResponse = await handleFIObjection(
  "I don't think I need a warranty since this car is reliable.",
  "brand_reliability",
  "cash_buyer",
  "VSC"
);

// Generate contextual F&I responses
const contextualResponse = await generateFIResponse(
  "The monthly payment is too high for me.",
  {
    objectionType: "price_affordability",
    scenario: "budget_focused",
    product: "VSC",
    provider: "groq"
  }
);
```

### 3. Warranty-Specific Questions
```javascript
import { askWarrantyQuestion } from '/src/lib/llm-client.ts';

// Warranty-focused responses with B4uSign context
const warrantyInfo = await askWarrantyQuestion(
  "What's the difference between powertrain and bumper-to-bumper coverage?",
  "groq"
);

const providerComparison = await askWarrantyQuestion(
  "Compare EnduranceGuard vs CarShield Plus for high-mileage vehicles",
  "openrouter"
);
```

## API Endpoints

### Health Check
```bash
curl http://localhost:5000/api/llm/health
```

### General Chat
```bash
curl -X POST http://localhost:5000/api/llm/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "model": "llama-3.1-8b-instant",
    "messages": [
      {"role": "user", "content": "Explain vehicle warranties in simple terms"}
    ]
  }'
```

### F&I Specialized Chat
```bash
curl -X POST http://localhost:5000/api/llm/fi-chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "I think warranties are a waste of money"}
    ],
    "objection_type": "belief_skepticism",
    "scenario": "online_buyer",
    "product": "VSC"
  }'
```

### Provider Status
```bash
curl http://localhost:5000/api/llm/providers
```

## React Component Integration

### F&I Chat Component
```typescript
import { useState } from 'react';
import { handleFIObjection } from '@/lib/llm-client';

function FIObjectionHandler({ dealId }: { dealId: number }) {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleObjection = async (customerMessage: string, objectionType: string) => {
    setLoading(true);
    try {
      const aiResponse = await handleFIObjection(
        customerMessage,
        objectionType,
        'financing', // scenario
        'VSC'       // product
      );
      setResponse(aiResponse);
    } catch (error) {
      console.error('F&I AI error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="fi-objection-handler">
      <button 
        onClick={() => handleObjection(
          "I don't believe in extended warranties",
          "belief_skepticism"
        )}
        disabled={loading}
      >
        {loading ? 'Generating Response...' : 'Handle Warranty Objection'}
      </button>
      {response && (
        <div className="ai-response">
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
```

## Environment Variables

```bash
# LLM Router Configuration
LLM_ROUTER_URL=http://localhost:3001
LLM_PROVIDER=groq  # groq | openrouter | fireworks

# Provider API Keys (add to Replit Secrets)
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_KEY=your_openrouter_api_key_here
FIREWORKS_API_KEY=your_fireworks_api_key_here
```

## Training Data Integration

The system is pre-configured to work with your F&I training data structure:

**Objection Types**:
- `brand_reliability`
- `past_experience`
- `belief_skepticism`
- `timing_think`, `timing_spouse`, `timing_later`
- `price_affordability`, `price_level`
- `coverage_confusion_insurance`, `coverage_factory_enough`

**Cross-sell Products**:
- `roadside_assistance`
- `GAP`
- `tire_wheel`
- `maintenance_plan`
- `rental_car`

**Scenarios**:
- `cash_buyer`, `financing`
- `budget_focused`, `first_time_buyer`
- `urban_driver`, `suburban_family`
- `rideshare_driver`, `long_commute`

## Performance Optimization

**Provider Selection Strategy**:
1. **Groq**: Fastest responses for real-time chat (primary)
2. **OpenRouter**: Model variety for complex reasoning
3. **Fireworks**: Custom models and specialized tasks
4. **Fallback**: Local AI models and OpenAI

**Cost Optimization**:
- Groq: ~$10-50/year for F&I volume
- Total multi-provider cost: $82-480/year maximum
- 98-99.8% savings vs OpenAI-only approach

## Custom Model Deployment Ready

When your GPT-5 distilled model is ready:

1. Deploy via Fireworks hosting
2. Update provider configuration
3. Route F&I queries to custom model
4. Maintain fallbacks for reliability

The architecture is designed to seamlessly integrate your specialized F&I model while maintaining cost efficiency and performance.