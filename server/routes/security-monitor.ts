import type { Express, Request, Response } from "express";
import geoip from 'geoip-lite';

// In-memory storage for recent security events (in production, use Redis or database)
const securityEvents: any[] = [];
const MAX_EVENTS = 1000;

export function addSecurityEvent(event: any) {
  securityEvents.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...event
  });
  
  // Keep only recent events
  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.splice(MAX_EVENTS);
  }
}

export function registerSecurityMonitorRoutes(app: Express) {
  
  // Real-time security events endpoint
  app.get("/api/security/events", (req: Request, res: Response) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const recentEvents = securityEvents.slice(0, limit);
    
    const summary = {
      totalEvents: securityEvents.length,
      blockedRequests: securityEvents.filter(e => e.event === 'geo_block' || e.event === 'attack_pattern').length,
      suspiciousActivity: securityEvents.filter(e => e.event === 'rate_limit' || e.event === 'suspicious_bot').length,
      foreignAccess: securityEvents.filter(e => e.event === 'foreign_access').length,
      countriesDetected: [...new Set(securityEvents
        .filter(e => e.country && e.country !== 'US')
        .map(e => e.country)
      )],
      topCountries: getTopCountries(),
      lastHour: securityEvents.filter(e => 
        new Date(e.timestamp).getTime() > Date.now() - 3600000
      ).length
    };
    
    res.json({ events: recentEvents, summary });
  });

  // Test IP endpoint for security testing
  app.post("/api/security/test-ip", (req: Request, res: Response) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ error: "IP address required" });
    }
    
    const geo = geoip.lookup(ip);
    const isBlocked = geo?.country ? ['RU', 'CN', 'KP', 'IR', 'BY', 'SY', 'AF'].includes(geo.country) : false;
    
    res.json({ 
      ip, 
      blocked: isBlocked,
      country: geo?.country,
      city: geo?.city,
      region: geo?.region,
      timezone: geo?.timezone
    });
  });

  // Clear security events (admin only)
  app.post("/api/security/clear-events", (req: Request, res: Response) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const count = securityEvents.length;
    securityEvents.length = 0;
    
    res.json({ 
      success: true, 
      message: `Cleared ${count} security events` 
    });
  });

  // Security statistics endpoint
  app.get("/api/security/stats", (req: Request, res: Response) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const now = Date.now();
    const oneHour = 3600000;
    const oneDay = 86400000;
    
    const stats = {
      total: securityEvents.length,
      lastHour: securityEvents.filter(e => new Date(e.timestamp).getTime() > now - oneHour).length,
      lastDay: securityEvents.filter(e => new Date(e.timestamp).getTime() > now - oneDay).length,
      byType: getEventsByType(),
      byCountry: getTopCountries(10),
      recentBlocked: securityEvents
        .filter(e => e.event === 'geo_block')
        .slice(0, 10)
        .map(e => ({
          timestamp: e.timestamp,
          country: e.country,
          city: e.city,
          ip: e.ip,
          path: e.path
        }))
    };
    
    res.json(stats);
  });
}

function getTopCountries(limit = 5) {
  const countryCounts: Record<string, number> = {};
  
  securityEvents
    .filter(e => e.country && e.country !== 'US')
    .forEach(e => {
      countryCounts[e.country] = (countryCounts[e.country] || 0) + 1;
    });
  
  return Object.entries(countryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([country, count]) => ({ country, count }));
}

function getEventsByType() {
  const typeCounts: Record<string, number> = {};
  
  securityEvents.forEach(e => {
    typeCounts[e.event] = (typeCounts[e.event] || 0) + 1;
  });
  
  return typeCounts;
}