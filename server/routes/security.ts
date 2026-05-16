import type { Express, Request, Response } from "express";
import { getSecurityStatus, isBlockedCountry } from "../simple-security-middleware";

export function registerSecurityRoutes(app: Express) {
  
  // Security status endpoint for admin monitoring
  app.get("/api/security/status", (req: Request, res: Response) => {
    // Only authenticated users can view security status
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    res.json(getSecurityStatus());
  });

  // IP check endpoint for testing
  app.post("/api/security/check-ip", (req: Request, res: Response) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ error: "IP address required" });
    }
    
    const blocked = isBlockedCountry(ip);
    res.json({ ip, blocked });
  });

  // Recent security events endpoint
  app.get("/api/security/events", (req: Request, res: Response) => {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // In a real application, this would fetch from a database or log service
    // For now, return a placeholder
    res.json({
      events: [
        {
          timestamp: new Date().toISOString(),
          type: "info",
          message: "Security monitoring active",
          ip: "127.0.0.1"
        }
      ],
      summary: {
        totalEvents: 0,
        blockedRequests: 0,
        suspiciousActivity: 0
      }
    });
  });
}