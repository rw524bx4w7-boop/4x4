import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import geoip from 'geoip-lite';

// Extend Express Request type with session
declare module 'express' {
  interface Request {
    session?: any;
  }
}

// Enhanced security middleware with geo-blocking and threat detection
export interface SecurityRequest extends Request {
  clientIP?: string;
  geoInfo?: any;
  isBot?: boolean;
  threatLevel?: 'low' | 'medium' | 'high';
}

// Blocked countries - can be configured via environment variables
const BLOCKED_COUNTRIES = (process.env.BLOCKED_COUNTRIES || 'RU,CN,KP,IR').split(',');

// Suspicious patterns to detect bots and attackers
const SUSPICIOUS_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /python-requests/i,
  /curl/i,
  /wget/i,
  /scanner/i,
  /exploit/i,
  /hack/i,
  /inject/i
];

// Known attack patterns in URLs
const ATTACK_PATTERNS = [
  /\.\./,  // Directory traversal
  /\/admin/i,
  /\/wp-admin/i,
  /\/phpmyadmin/i,
  /\.php$/i,
  /\.asp$/i,
  /\.jsp$/i,
  /\/cgi-bin/i,
  /\/etc\/passwd/i,
  /\/proc\//i,
  /\/var\/log/i,
  /select.*from/i,  // SQL injection attempts
  /union.*select/i,
  /<script/i,  // XSS attempts
  /javascript:/i,
  /eval\(/i,
  /document\.cookie/i
];

export function createSecurityMiddleware() {
  
  // Helmet for basic security headers
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite dev
        connectSrc: ["'self'", "ws:", "wss:"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });

  // Rate limiting - stricter for unknown IPs
  const createRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req: SecurityRequest) => {
      // More lenient for authenticated users
      if (req.session?.authenticated) return 200;
      
      // Stricter for high-threat IPs
      if (req.threatLevel === 'high') return 5;
      if (req.threatLevel === 'medium') return 20;
      
      return 100; // Default limit
    },
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: process.env.NODE_ENV === 'production' ? 1 : false, // Trust first proxy in production only
    // Skip rate limiting for health checks and static assets
    skip: (req: Request) => {
      const userAgent = req.get('User-Agent') || '';
      const isHealthCheck = userAgent.includes('GoogleHC') || 
                           userAgent.includes('kube-probe') ||
                           req.path === '/health' ||
                           req.path === '/ready' ||
                           req.path === '/api/health';
      
      return isHealthCheck || req.path.startsWith('/assets/');
    }
  });

  // Slow down suspicious requests instead of blocking them outright
  const slowDownMiddleware = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per windowMs without delay
    delayMs: (hits: number) => hits * 100, // Add 100ms delay per request after delayAfter
    maxDelayMs: 5000, // Max delay of 5 seconds
    skip: (req: SecurityRequest) => {
      const userAgent = req.get('User-Agent') || '';
      return req.session?.authenticated || 
             userAgent.includes('GoogleHC') || 
             userAgent.includes('kube-probe');
    }
  });

  // IP analysis and threat assessment
  const ipAnalysisMiddleware = (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Get client IP (handle proxy headers carefully in development)
    let clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection as any)?.socket?.remoteAddress ||
                   '127.0.0.1';
    
    // In development, override with actual remote IP if available for testing
    if (process.env.NODE_ENV !== 'production' && req.headers['x-forwarded-for']) {
      const forwardedIps = (req.headers['x-forwarded-for'] as string).split(',');
      clientIP = forwardedIps[0].trim();
    }
    
    req.clientIP = clientIP;
    
    // Skip analysis for local/development IPs
    if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
      req.threatLevel = 'low';
      return next();
    }

    // Get geolocation info
    const geo = geoip.lookup(clientIP);
    req.geoInfo = geo;

    // Check if IP is from blocked country
    if (geo && geo.country && BLOCKED_COUNTRIES.includes(geo.country)) {
      console.log(`[SECURITY] Blocked access from ${geo.country} (${clientIP}) - ${req.method} ${req.path}`);
      
      // Log the attempt for monitoring
      logSecurityEvent('geo_block', {
        ip: clientIP,
        country: geo.country,
        city: geo.city,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({ 
        error: 'Access denied',
        code: 'GEO_RESTRICTED' 
      });
    }

    // Analyze user agent for bot detection
    const userAgent = req.get('User-Agent') || '';
    req.isBot = SUSPICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent));

    // Check for attack patterns in the URL
    const hasAttackPattern = ATTACK_PATTERNS.some(pattern => 
      pattern.test(req.path) || pattern.test(req.url)
    );

    // Assess threat level
    let threatLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (hasAttackPattern) {
      threatLevel = 'high';
      console.log(`[SECURITY] Attack pattern detected from ${clientIP} - ${req.method} ${req.path}`);
      logSecurityEvent('attack_pattern', {
        ip: clientIP,
        country: geo?.country,
        path: req.path,
        userAgent,
        timestamp: new Date().toISOString()
      });
    } else if (req.isBot && !userAgent.includes('GoogleHC') && !userAgent.includes('kube-probe')) {
      threatLevel = 'medium';
      console.log(`[SECURITY] Suspicious bot detected from ${clientIP} - ${userAgent}`);
      logSecurityEvent('suspicious_bot', {
        ip: clientIP,
        country: geo?.country,
        userAgent,
        timestamp: new Date().toISOString()
      });
    }

    req.threatLevel = threatLevel;
    next();
  };

  // Request logging for security monitoring
  const securityLoggingMiddleware = (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Skip logging for health checks and static assets
    if (req.path === '/health' || req.path === '/ready' || req.path.startsWith('/assets/')) {
      return next();
    }

    // Log high-threat requests
    if (req.threatLevel === 'high') {
      console.log(`[SECURITY] HIGH THREAT: ${req.clientIP} (${req.geoInfo?.country || 'unknown'}) - ${req.method} ${req.path}`);
    }

    // Log all non-authenticated API requests from foreign IPs for monitoring
    if (req.path.startsWith('/api/') && !req.session?.authenticated && req.geoInfo?.country && req.geoInfo.country !== 'US') {
      console.log(`[SECURITY] Foreign API access: ${req.clientIP} (${req.geoInfo.country}) - ${req.method} ${req.path}`);
    }

    next();
  };

  return {
    helmetMiddleware,
    createRateLimit,
    slowDownMiddleware,
    ipAnalysisMiddleware,
    securityLoggingMiddleware
  };
}

// Security event logging (can be extended to send to external services)
function logSecurityEvent(eventType: string, details: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ...details
  };
  
  // Log to console (in production, this could be sent to external monitoring)
  console.log(`[SECURITY_EVENT] ${JSON.stringify(logEntry)}`);
  
  // TODO: In production, send to security monitoring service
  // Example: sendToSentryOrDatadog(logEntry);
}

// Utility function to check if IP is from blocked country
export function isBlockedCountry(ip: string): boolean {
  const geo = geoip.lookup(ip);
  return geo?.country ? BLOCKED_COUNTRIES.includes(geo.country) : false;
}

// Get security status for admin dashboard
export function getSecurityStatus() {
  return {
    blockedCountries: BLOCKED_COUNTRIES,
    rateLimiting: true,
    geoBlocking: true,
    threatDetection: true,
    securityHeaders: true
  };
}