import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import { createSimpleSecurityMiddleware } from "./simple-security-middleware";

const app = express();

// CORS configuration for external access - MUST be before other middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://www.b4usign.net',
    'https://b4usign.net',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ];
  
  // Add Replit domains for development
  if (process.env.REPL_ID) {
    allowedOrigins.push(`https://${process.env.REPL_ID}.replit.app`);
    allowedOrigins.push(`https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.app`);
  }
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin || '') || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Add performance and security headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Custom domain security headers
  if (req.hostname === 'www.b4usign.net' || req.hostname === 'b4usign.net') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  
  // Performance headers for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Cloud Run compatible graceful shutdown
let isShuttingDown = false;

process.on('SIGINT', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log("Received SIGINT, shutting down gracefully...");
  
  // Allow ongoing requests to complete
  setTimeout(() => {
    log("Graceful shutdown complete");
    process.exit(0);
  }, 2000);
});

process.on('SIGTERM', () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log("Received SIGTERM, shutting down gracefully...");
  
  // Allow ongoing requests to complete
  setTimeout(() => {
    log("Graceful shutdown complete");
    process.exit(0);
  }, 2000);
});

// Unhandled error handlers
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, "error");
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error}`, "error");
  log(error.stack || '', "error");
  // Don't exit the process, just log the error
});

// Removed complex keep-alive mechanism for Cloud Run compatibility

async function startServer() {
  try {
    // Add immediate health check endpoints before any other routes - NEVER REQUIRE AUTH
    
    // Root health check endpoint for Cloud Run deployment health checks
    app.get('/', (req, res, next) => {
      // Check if this is a health check request (Cloud Run, load balancer, etc.)
      const userAgent = req.get('User-Agent') || '';
      const acceptHeader = req.get('Accept') || '';
      
      const isHealthCheck = userAgent.includes('GoogleHC') || 
                           userAgent.includes('kube-probe') ||
                           userAgent.includes('health') ||
                           userAgent.includes('curl') ||
                           req.query.healthcheck ||
                           !acceptHeader.includes('text/html'); // Not a browser request
      
      if (isHealthCheck) {
        return res.status(200).json({ status: 'ok', service: 'b4usign', timestamp: Date.now() });
      }
      
      // For regular browser requests, continue to normal routing (Vite will handle this)
      next();
    });
    
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: Date.now() });
    });
    
    app.get('/ready', (req, res) => {
      res.status(200).json({ status: 'ready', timestamp: Date.now() });
    });
    
    app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'ok', service: 'b4usign-api', timestamp: Date.now() });
    });
    
    // Root route handling will be done by Vite in development

    // Configure trust proxy for production deployments
    if (process.env.NODE_ENV === 'production') {
      app.set('trust proxy', 1);
    }
    
    // Add simple but effective security middleware
    const { 
      securityHeaders,
      geoBlockingMiddleware,
      simpleRateLimit
    } = createSimpleSecurityMiddleware();
    
    // Apply security layers
    app.use(securityHeaders);
    app.use(geoBlockingMiddleware);
    app.use(simpleRateLimit);

    // Add authentication middleware AFTER security but BEFORE application routes
    const { sessionMiddleware, passwordProtection, loginHandler } = await import("./auth-middleware").then(m => m.createAuthMiddleware());
    
    // Apply session middleware to all routes
    app.use(sessionMiddleware);
    
    // Apply password protection (this will skip health checks and critical APIs)
    app.use(passwordProtection);
    
    // Add login handler
    app.post('/api/login', loginHandler);

    const server = await registerRoutes(app);

    // Set up Vite development server AFTER routes but BEFORE error handlers
    if (process.env.NODE_ENV !== "production") {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } else {
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    }

    // Error handling middleware - prevent server crashes
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error on ${req.method} ${req.path}: ${message}`, "error");
      
      // Always send a response to prevent hanging
      if (!res.headersSent) {
        res.status(status).json({ 
          status: "error",
          message,
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    });

    // Catch-all 404 handler - ONLY for API routes that don't exist
    app.use("/api/*", (req: Request, res: Response) => {
      log(`404 - API endpoint not found: ${req.method} ${req.originalUrl}`, "warn");
      res.status(404).json({
        status: "not_found",
        message: "API endpoint not found",
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });

    // Remove the duplicate Vite setup - already handled above

    // Cloud Run compatible port configuration
    // In production, use Cloud Run's PORT (defaults to 8080), in development use 5000
    const port = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '8080' : '5000'), 10);
    
    // Validate port number
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port: ${process.env.PORT}. Port must be a number between 1 and 65535.`);
    }
    
    return new Promise<void>((resolve, reject) => {
      server.listen(port, '0.0.0.0', (err?: Error) => {
        if (err) {
          log(`Failed to start server: ${err}`, "error");
          reject(err);
        } else {
          log(`Server listening on port ${port}`);
          log(`Server accessible at http://0.0.0.0:${port}`);
          log(`Environment: ${process.env.NODE_ENV || 'development'}`);
          log(`Server ready - PORT=${port} (${process.env.PORT ? 'from environment' : 'default'})`);
          
          // Server is now listening and ready for health checks
          log("Health check endpoints active and ready");
          log("Server startup complete - ready to handle requests");
          
          // Server is ready for Cloud Run health checks
          
          // Server is ready - resolve immediately for Cloud Run health checks
          resolve();
          
          // Only initialize database in development mode
          if (process.env.NODE_ENV !== 'production') {
            setImmediate(() => {
              log("Starting background database initialization...");
              initializeDatabaseAsync().catch(error => {
                log(`Background database initialization error: ${error}`, "warn");
                // Continue running even if database initialization fails
              });
            });
          } else {
            log("Production mode: skipping automatic database initialization");
            log("Database will be initialized on first API request if needed");
          }
        }
      });
    });
  } catch (error) {
    log(`Server startup error: ${error}`, "error");
    throw error;
  }
}

// Async database initialization that runs after server starts
async function initializeDatabaseAsync() {
  try {
    log("Initializing database...");
    
    // Import and use the database setup module
    const { setupDatabase } = await import('./db-setup');
    const success = await setupDatabase();
    
    if (success) {
      // Update database schema with new tables and columns
      try {
        const { updateSchema } = await import('./scripts/update-schema');
        await updateSchema();
      } catch (updateError) {
        log(`Schema update error: ${updateError}`, "warn");
      }
      
      // Initialize sample data
      await storage.initializeSampleData();
      log("Database initialization complete");
      
      // Run non-critical services in parallel to avoid blocking
      const servicePromises = [
        // Location service initialization (with timeout)
        (async () => {
          try {
            log("Setting up location service...");
            const { initializeLocationTables, initializeWithMajorCities } = await import('./services/location-service');
            
            const locationPromise = Promise.all([
              initializeLocationTables(),
              initializeWithMajorCities()
            ]);
            
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Location service initialization timeout')), 5000)
            );
            
            await Promise.race([locationPromise, timeoutPromise]);
            log("Location service initialized");
          } catch (locationError) {
            log(`Location service initialization error: ${locationError}`, "warn");
          }
        })(),
        
        // DMV fees service initialization (run with timeout)
        (async () => {
          try {
            log("Setting up DMV fees service...");
            const { initializeDmvFeeTables, initializeWithDefaultFees } = await import('./services/dmv-fees-service');
            await initializeDmvFeeTables();
            
            // Add timeout for external API calls - shorter timeout for Cloud Run
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('DMV fees initialization timeout')), 3000)
            );
            
            await Promise.race([
              initializeWithDefaultFees(),
              timeoutPromise
            ]);
            
            log("DMV fees service initialized");
          } catch (dmvError) {
            log(`DMV fees service initialization error: ${dmvError}`, "warn");
            // Service will continue with default data
          }
        })()
      ];
      
      // Don't await all services - let them run in background
      Promise.allSettled(servicePromises).then(() => {
        log("All background services initialized");
      });
      
    } else {
      log("Database setup failed, but server will continue running", "warn");
    }
  } catch (error) {
    log(`Database initialization error: ${error}`, "error");
    // Don't exit the process, just log the error and continue
  }
}

// Start the server with Cloud Run compatible error handling
startServer().catch((error) => {
  log(`Failed to start server: ${error}`, "error");
  log(`Error details: ${error.stack}`, "error");
  
  // In production, let Cloud Run handle process restarts
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    // In development, keep trying
    setTimeout(() => {
      log("Retrying server startup...");
      startServer().catch(console.error);
    }, 5000);
  }
});
