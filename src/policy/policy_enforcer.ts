import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PolicyRule {
  name: string;
  type: 'rbac' | 'data_classification' | 'rate_limit' | 'hmac_verification';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface PolicyConfig {
  rules: PolicyRule[];
  pii_fields: string[];
  allowed_adapters: string[];
  public_routes: string[];
  privileged_routes: string[];
}

let policyConfig: PolicyConfig | null = null;

export function loadPolicyConfig(): PolicyConfig {
  if (policyConfig) return policyConfig;

  const configPath = path.join(process.cwd(), 'src', 'policy', 'policy_rules.yaml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  policyConfig = yaml.load(fileContents) as PolicyConfig;
  return policyConfig;
}

export function verifyHMAC(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export function hmacMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only verify HMAC for adapter webhook routes
  if (!req.path.includes('/adapters/') || !req.path.includes('/webhook')) {
    next();
    return;
  }

  const signature = req.headers['x-signature'] as string;
  const secret = process.env.ADAPTER_SECRET || process.env.HMAC_SECRET || '';

  if (!signature) {
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const payload = JSON.stringify(req.body);
  
  if (!verifyHMAC(payload, signature, secret)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}

export function rbacMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = loadPolicyConfig();
  
  // Check if route is public
  if (config.public_routes.some(route => req.path.startsWith(route))) {
    next();
    return;
  }

  // Check if route requires privileged access
  if (config.privileged_routes.some(route => req.path.startsWith(route))) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    // In production, verify JWT here
    // For now, just check if token exists
    const token = authHeader.substring(7);
    if (!token || token.length < 10) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }
  }

  next();
}

export function maskPII(data: Record<string, unknown>): Record<string, unknown> {
  const config = loadPolicyConfig();
  const masked = { ...data };

  for (const field of config.pii_fields) {
    if (field in masked) {
      masked[field] = '***REDACTED***';
    }
  }

  return masked;
}

export function dataClassificationMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to mask PII
  res.json = function (body: unknown): Response {
    if (typeof body === 'object' && body !== null) {
      body = maskPII(body as Record<string, unknown>);
    }
    return originalJson(body);
  };

  next();
}

export function policyEnforcerMiddleware() {
  return [
    rbacMiddleware,
    hmacMiddleware,
    dataClassificationMiddleware,
  ];
}

export function generateHMAC(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}
