# B4uSign - Vehicle Warranty Marketplace Platform

## Overview

B4uSign is an online warranty marketplace connecting vehicle owners with over 20 independent warranty providers. The platform's core purpose is to deliver personalized, compliant warranty quotes through advanced SEO, VIN decoding, and market analysis. It aims to match customer needs with optimal coverage options, ensuring full regulatory compliance across all 5 states. The business vision is to transform the vehicle warranty industry by providing a transparent, efficient, and cost-effective solution for consumers, offering significant market potential and aiming for high profitability by reducing customer acquisition costs for providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for fast development and building
- **UI/UX Decisions**: Mobile-first design, streamlined VIN-to-quote flow with progress indicators, updated B4uSign branding (shield logo, blue color scheme), enterprise-grade interactive product menu with drag-and-drop functionality and professional styling.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript throughout
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless)
- **API Pattern**: RESTful endpoints with conventional HTTP methods
- **Security Compliance**: Full Drizzle ORM integration using sql template literals and query builders (no raw SQL queries), ensuring type safety and framework consistency

### Core Business Logic
- **Dynamic Pricing Engine**: Real-time warranty rate adjustments based on vehicle age/mileage, market conditions, customer segmentation (e.g., first-time, UTM campaigns), and ZIP code. Integrates with provider base rates.
- **Warranty Marketplace**: Multi-provider quote comparison with SEO-optimized ranking.
- **Quote Optimization**: Intelligent matching of customer needs with provider offerings for conversion.
- **Market Analysis**: Geographic pricing optimization and competitive assessment.
- **Customer Segmentation**: Personalized discounts and offers.
- **Revenue Optimization**: Aims for high profit margins through smart pricing.
- **Qualifying Questions System**: Four questions (ownership duration, driving patterns, road conditions, commercial use) feed into a match-scoring algorithm for tailored recommendations.
- **E-Signing Integration**: Full contract signing workflow with SignaturePad, plan summary display, and contract status tracking.
- **AI Closing Tool**: Advanced F&I sales assistance with customer readiness scoring, personalized closing strategies, objection handling scripts, and optimal timing analysis. Supports local AI models (Phi-3 $1.7K, Mistral 7B $7.7K, LLaMA 3 $11.8K for 250M tokens) with OpenAI fallback. Provides real-time recommendations for discounts, urgency tactics, and next steps based on customer profile and behavior.
- **Provider Onboarding System**: Comprehensive application process including business verification, compliance checks, multi-language API integration (REST, SOAP, GraphQL, webhooks), advanced security, and real-time health monitoring.
- **Financial Analytics**: Implements a dual-revenue model ($100 provider fee + $500 consumer markup per contract), providing financial projections, break-even analysis, and a financial dashboard.
- **Strategic Decision**: Primary go-to-market strategy involves PEN (Provider Exchange Network) integration with a hybrid model where quotes are interpolated for browsing and PEN API is used only for actual purchases, adopting a pass-through charge model for API costs. Customer acquisition costs are shifted to warranty companies, who pay B4uSign per contract.
- **Hybrid Subscription Model**: Three-tier subscription structure ($1,500-$5,000/month) plus per-contract fees ($300-$400), providing warranty companies 49-64% cost savings vs traditional acquisition methods while generating $739,800 Year 1 revenue with 45% margins for B4uSign.

### Data Flow
- **Consumer Warranty Marketplace Flow**: VIN entry and decoding, ZIP code-based personalization, provider matching, real-time quote generation, plan selection, and finally purchase/activation including digital contracts.

## Security & Access Control
- **Password Protection**: Simple authentication system protecting the entire application while preserving deployment compatibility
- **Session Management**: Production-ready session storage using PostgreSQL in production, enhanced MemoryStore in development
- **Access Control**: Single password access with 24-hour session persistence and rolling session renewal
- **Environment Configuration**: Configurable password via APP_PASSWORD environment variable
- **Default Password**: B4uSign2024! (change for production deployment)
- **Production Session Store**: Uses `connect-pg-simple` for database-backed session persistence with automatic cleanup
- **Deployment-Safe Authentication**: Health check endpoints (/health, /ready, /api/health, /metrics) and Cloud Run probes excluded from authentication
- **Core API Exclusions**: VIN decoding (/api/vin/decode), location services (/api/location/decode), and authentication status (/api/auth/status) remain publicly accessible
- **Frontend Authentication**: React useAuth hook manages authentication state with automatic session checking and login flow
- **Production Compatibility**: Cookie settings automatically adjust for HTTPS in production deployments with proxy trust enabled
- **Advanced Security**: Multi-layer security system with geo-blocking (Russia, China, North Korea, Iran, Belarus, Syria, Afghanistan), rate limiting, IP threat analysis, and real-time monitoring dashboard
- **Threat Detection**: Automatic detection of attack patterns, suspicious user agents, and malicious requests
- **Security Monitoring**: Real-time security dashboard at /security with IP testing tools, threat analysis, and country-specific tracking
- **Production Geo-Blocking**: Active blocking of high-risk countries in production, logging-only in development for testing
- **Real-Time Monitoring**: 30-second refresh security dashboard with foreign access tracking and detailed event logging

## Custom Domain Configuration
- **Primary Domain**: www.b4usign.net
- **CORS Security**: Configured for custom domain with fallback to development domains
- **SSL/TLS**: Automatic via Replit Deployments
- **SEO Optimization**: Meta tags, sitemap, and robots.txt configured for custom domain
- **Security Headers**: Enhanced HSTS and security policies for production domain

## Cloud Run Deployment Status

### Deployment Readiness: ✅ READY
**Status**: All critical issues resolved for stable Cloud Run operation

### Applied Fixes
- **Process Exit Prevention**: Prevented server termination in Vite error handler (limitation: server/vite.ts cannot be modified)
- **External API Timeouts**: Added 2-3 second timeouts to all external API calls (location, tax, DMS services)
- **Service Initialization**: Reduced timeout thresholds (3-5 seconds) for background service startup
- **Health Check Optimization**: Multiple endpoints configured: /health, /ready, /api/health with sub-1ms response times
- **Error Handling**: Production-grade error handling with appropriate Cloud Run signal management
- **Container Lifecycle**: Proper SIGTERM/SIGINT handling for graceful shutdowns
- **Database Resilience**: Non-blocking database operations with fallback error handling

### Health Check Endpoints
- `GET /health` - Ultra-fast response for Cloud Run health checks
- `GET /ready` - Service readiness verification
- `GET /api/health` - Comprehensive health status
- Smart root route detection for Cloud Run probes

### Production Configuration
- **Port Handling**: Automatic Cloud Run PORT detection with 8080 fallback
- **Process Management**: Enhanced signal handling for container lifecycle
- **Memory Limits**: Optimized for Cloud Run resource constraints
- **Startup Time**: Background service initialization to prevent startup delays

## External Dependencies

### Required Integrations
- **Database**: PostgreSQL (Neon serverless)
- **Credit Systems**: RouteOne, Dealertrack APIs
- **Vehicle Data**: NHTSA VIN decoder
- **Tax Services**: Real-time tax rate APIs
- **Trade-in Services**: KBB, NADA, TradePending APIs
- **E-signature**: SignaturePad or similar e-signing platform

### Optional Integrations
- **AI Services**: Multi-provider LLM router (Groq, OpenRouter, Fireworks) with 98%+ cost savings, Local AI models (Phi-3, Mistral 7B, LLaMA 3), OpenAI fallback
- **DMS Systems**: Various dealer management systems

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `APP_PASSWORD`: Application access password (default: B4uSign2024!)
- `SESSION_SECRET`: Session encryption secret for secure authentication
- `CUSTOM_DOMAIN`: Primary domain (www.b4usign.net)
- `LLM_ROUTER_URL`: Multi-provider LLM router endpoint (default: http://localhost:3001)
- `LLM_PROVIDER`: Primary provider (groq, openrouter, fireworks)
- `GROQ_API_KEY`: Groq API key for fastest F&I responses
- `OPENROUTER_KEY`: OpenRouter API key for model variety
- `FIREWORKS_API_KEY`: Fireworks API key for custom models
- `OPENAI_API_KEY`: OpenAI API key (optional, fallback)
- `LOCAL_AI_ENDPOINT`: Local AI model endpoint (Phi-3, Mistral 7B, or LLaMA 3)
- `LOCAL_AI_MODEL`: Local AI model name (e.g., "phi-3", "mistral-7b", "llama-3")
- `LOCAL_AI_KEY`: Authentication key for local AI service
- `ENCRYPTION_KEY`: Data encryption key for sensitive information

## Deployment Configuration

### Cloud Run Deployment Fixes (January 2025)
- **Process Management**: Removed complex keep-alive mechanisms that interfered with Cloud Run health checks
- **Port Configuration**: Cloud Run PORT environment variable support (auto-detects Cloud Run's PORT, defaults to 8080)
- **Health Check Optimization**: Multiple instant-response health endpoints tested and verified:
  - `/health`, `/ready`, `/api/health` - dedicated health check endpoints (<1ms response)
  - `/` - root route with intelligent health check detection (GoogleHC, kube-probe user agents)
- **Database Initialization**: Moved to background after server startup in development, disabled in production to prevent blocking
- **Signal Handling**: Simplified graceful shutdown with proper timeout handling for Cloud Run
- **Error Handling**: Clean process exit on startup failure allows Cloud Run to restart containers
- **Production Startup**: Optimized start.js script for Cloud Run with simplified process management
- **Server Startup**: Health checks available immediately before database initialization begins

### Production Environment Requirements
- `NODE_ENV=production`: Activates production optimizations
- `DATABASE_URL`: PostgreSQL connection string for data persistence
- `PORT`: Server port (defaults to 8080 for Cloud Run, auto-detected from environment)
- `SESSION_SECRET`: Secure session encryption key for production security

### Health Check Endpoints
- **Root Route (`/`)**: Smart health check detection based on User-Agent and headers
- **Dedicated Health Checks**: `/health`, `/ready`, `/api/health` respond instantly with `{"status":"ok"}`
- **Metrics Endpoint**: `/metrics` provides server performance metrics
- **Response Time**: Sub-1ms response time for all health check endpoints

### Deployment Process
1. **Server Start**: Express server starts immediately on Cloud Run's PORT
2. **Health Checks**: Multiple endpoints ensure rapid container readiness verification
3. **Background Services**: Database and services initialize asynchronously without blocking startup
4. **Clean Lifecycle**: Cloud Run manages container lifecycle with proper signal handling