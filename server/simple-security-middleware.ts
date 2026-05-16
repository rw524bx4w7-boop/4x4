import type { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';

// Simple but effective security middleware focused on geo-blocking
export interface SecurityRequest extends Request {
  clientIP?: string;
  geoInfo?: any;
  isBlocked?: boolean;
}

// Countries to block - Russia, China, and other high-risk countries
const BLOCKED_COUNTRIES = ['RU', 'CN', 'KP', 'IR', 'BY', 'SY', 'AF'];

// Known attack patterns
const ATTACK_PATTERNS = [
  /\.\./,
  /\/admin/i,
  /\/wp-admin/i,
  /\.php$/i,
  /\/etc\/passwd/i,
  /select.*from/i,
  /<script/i,
];

export function createSimpleSecurityMiddleware() {
  
  // Basic security headers
  const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    if (req.hostname === 'www.b4usign.net' || req.hostname === 'b4usign.net') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  };

  // Geo-blocking and threat detection
  const geoBlockingMiddleware = (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Skip security checks for health endpoints
    if (req.path === '/health' || 
        req.path === '/ready' || 
        req.path === '/api/health' ||
        req.path === '/metrics') {
      return next();
    }

    // Get client IP and analyze
    const clientIP = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    req.clientIP = clientIP;

    // Skip geo-blocking only for local IPs
    if (clientIP === '127.0.0.1' || clientIP === '::1' || 
        clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
      return next();
    }

    // Get geolocation info
    const geo = geoip.lookup(clientIP);
    req.geoInfo = geo;

    // Check if country is blocked
    if (geo && geo.country && BLOCKED_COUNTRIES.includes(geo.country)) {
      console.log(`[SECURITY] BLOCKED ACCESS from ${geo.country} (${clientIP}) - ${req.method} ${req.path}`);
      
      // Log security event
      logSecurityEvent('geo_block', {
        ip: clientIP,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      req.isBlocked = true;
      
      // In development, log but allow through for testing
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SECURITY] Development mode: allowing blocked country ${geo.country} for testing`);
        return next();
      }
      
      // In production, actually block the request
      return res.status(403).json({ 
        error: 'Access denied from your location',
        code: 'GEO_RESTRICTED',
        country: geo.country
      });
    }

    // Check for attack patterns
    const hasAttackPattern = ATTACK_PATTERNS.some(pattern => 
      pattern.test(req.path) || pattern.test(req.url)
    );

    if (hasAttackPattern) {
      console.log(`[SECURITY] Attack pattern detected from ${clientIP} - ${req.method} ${req.path}`);
      
      logSecurityEvent('attack_pattern', {
        ip: clientIP,
        country: geo?.country,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      return res.status(403).json({ 
        error: 'Request blocked',
        code: 'SECURITY_VIOLATION'
      });
    }

    // Log all foreign access for monitoring
    if (geo && geo.country && geo.country !== 'US') {
      console.log(`[SECURITY] Foreign access: ${clientIP} (${geo.country}/${geo.region}) - ${req.method} ${req.path}`);
      
      // Log security event for monitoring
      logSecurityEvent('foreign_access', {
        ip: clientIP,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }

    next();
  };

  // Simple rate limiting in memory
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  const simpleRateLimit = (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Skip rate limiting for health checks and development
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('GoogleHC') || 
        userAgent.includes('kube-probe') ||
        req.path === '/health' ||
        req.path === '/ready' ||
        req.path === '/api/health' ||
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/@') ||
        process.env.NODE_ENV !== 'production') {
      return next();
    }

    const clientIP = req.clientIP || req.ip || '127.0.0.1';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = req.session?.authenticated ? 1000 : 500;

    const record = requestCounts.get(clientIP);
    
    if (!record || now > record.resetTime) {
      // New window
      requestCounts.set(clientIP, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    
    if (record.count > maxRequests) {
      console.log(`[SECURITY] Rate limit exceeded: ${clientIP} (${record.count} requests)`);
      
      logSecurityEvent('rate_limit', {
        ip: clientIP,
        count: record.count,
        timestamp: new Date().toISOString()
      });

      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    next();
  };

  return {
    securityHeaders,
    geoBlockingMiddleware,
    simpleRateLimit
  };
}

// Security event logging
function logSecurityEvent(eventType: string, details: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    ...details
  };
  
  console.log(`[SECURITY_EVENT] ${JSON.stringify(logEntry)}`);
  
  // Store event for monitoring (import addSecurityEvent if available)
  try {
    const { addSecurityEvent } = require('./routes/security-monitor');
    addSecurityEvent(logEntry);
  } catch (error) {
    // Monitoring not available, just log
  }
}

// Utility functions
export function isBlockedCountry(ip: string): boolean {
  const geo = geoip.lookup(ip);
  return geo?.country ? BLOCKED_COUNTRIES.includes(geo.country) : false;
}

export function getSecurityStatus() {
  return {
    blockedCountries: BLOCKED_COUNTRIES,
    rateLimiting: true,
    geoBlocking: true,
    threatDetection: true,
    securityHeaders: true
  };
}