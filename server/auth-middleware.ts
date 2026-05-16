import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import crypto from 'crypto';
import connectPgSimple from 'connect-pg-simple';
import MemoryStore from 'memorystore';

// Simple password protection middleware
export interface AuthRequest extends Request {
  session: any;
}

export function createAuthMiddleware() {
  // Use a simple password from environment variable
  const APP_PASSWORD = process.env.APP_PASSWORD || 'B4uSign2024!';
  const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

  // Configure production-ready session store
  let sessionStore;
  
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    // Use PostgreSQL session store for production
    const PgSession = connectPgSimple(session);
    sessionStore = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Clean up every 15 minutes
      ttl: 24 * 60 * 60 // 24 hours in seconds
    });
  } else {
    // Use enhanced MemoryStore for development or fallback
    const MemoryStoreSession = MemoryStore(session);
    sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000, // Clean up expired sessions every 24 hours
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      dispose: function(key, sess) {
        // Optional cleanup when session is disposed
      }
    });
  }

  // Configure session middleware with production-ready settings
  const sessionMiddleware = session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax'
    },
    name: 'b4usign.sid', // Custom session name for security
    proxy: process.env.NODE_ENV === 'production' // Trust proxy in production
  });

  // Password check middleware
  const passwordProtection = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Skip auth for login page, static assets, Vite dev assets, core API endpoints, and deployment health checks
    if (req.path === '/login' || 
        req.path === '/api/login' || 
        req.path === '/api/auth/status' ||
        req.path === '/api/vin/decode' ||
        req.path === '/api/location/decode' ||
        req.path === '/health' ||
        req.path === '/ready' ||
        req.path === '/api/health' ||
        req.path === '/metrics' ||
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/src/') ||
        req.path.startsWith('/@') ||
        req.path.includes('.') && !req.path.startsWith('/api/')) {
      return next();
    }

    // Additional check for health check user agents (Cloud Run, Kubernetes probes, load balancers)
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('GoogleHC') || 
        userAgent.includes('kube-probe') ||
        userAgent.includes('health') ||
        userAgent.includes('curl') ||
        req.get('X-Forwarded-For') === '127.0.0.1' ||
        req.query.healthcheck) {
      return next();
    }

    // Skip auth for root path health checks (Cloud Run deployment health checks)
    if (req.path === '/') {
      const isHealthCheck = userAgent.includes('GoogleHC') || 
                           userAgent.includes('kube-probe') ||
                           userAgent.includes('health') ||
                           userAgent.includes('curl') ||
                           req.query.healthcheck;
      if (isHealthCheck) {
        return next();
      }
    }

    // Check if user is already authenticated
    if (req.session?.authenticated) {
      return next();
    }

    // If not authenticated, redirect to login page
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // For web pages, let Vite handle frontend routing
    // The frontend will check authentication status via /api/auth/status
    return next();
  };

  // Login endpoint
  const loginHandler = (req: AuthRequest, res: Response) => {
    const { password } = req.body;

    if (password === APP_PASSWORD) {
      req.session.authenticated = true;
      res.json({ success: true, redirect: '/' });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  };

  return {
    sessionMiddleware,
    passwordProtection,
    loginHandler
  };
}