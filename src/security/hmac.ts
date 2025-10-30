/**
 * HMAC-based API Key Management & Request Signing
 * Ensures integrity and authenticity of API requests
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/common/logger.js';
import { secretsBridge } from './secrets_bridge.js';

export interface ApiKey {
  id: string;
  key: string;
  secret: string;
  tenantId: string;
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Generate new API key pair
 */
export function generateApiKey(tenantId: string, scopes: string[] = []): ApiKey {
  const id = `key_${crypto.randomBytes(16).toString('hex')}`;
  const key = `orca_${crypto.randomBytes(24).toString('base64url')}`;
  const secret = crypto.randomBytes(32).toString('base64url');

  return {
    id,
    key,
    secret,
    tenantId,
    scopes,
    createdAt: new Date(),
  };
}

/**
 * Compute HMAC signature for request
 */
export function computeSignature(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  body?: string
): string {
  const payload = [method.toUpperCase(), path, timestamp, body || ''].join('\n');

  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
}

/**
 * Verify request signature
 */
export function verifySignature(
  secret: string,
  signature: string,
  method: string,
  path: string,
  timestamp: string,
  body?: string
): boolean {
  const expected = computeSignature(secret, method, path, timestamp, body);
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Express middleware to enforce HMAC authentication
 */
export function requireHMAC() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract signature headers
      const apiKey = req.headers['x-api-key'] as string;
      const signature = req.headers['x-signature'] as string;
      const timestamp = req.headers['x-timestamp'] as string;

      if (!apiKey || !signature || !timestamp) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing HMAC authentication headers',
          required: ['x-api-key', 'x-signature', 'x-timestamp'],
        });
        return;
      }

      // Check timestamp freshness (prevent replay attacks)
      const requestTime = parseInt(timestamp, 10);
      const now = Date.now();
      const maxAge = 300_000; // 5 minutes

      if (Math.abs(now - requestTime) > maxAge) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Request timestamp too old or invalid',
        });
        return;
      }

      // Lookup API key and get secret
      const keyData = await lookupApiKey(apiKey);
      if (!keyData) {
        logger.warn('Invalid API key', { apiKey: apiKey.substring(0, 12) });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key',
        });
        return;
      }

      // Check expiration
      if (keyData.expiresAt && keyData.expiresAt < new Date()) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'API key expired',
        });
        return;
      }

      // Verify signature
      const body = req.body ? JSON.stringify(req.body) : undefined;
      const isValid = verifySignature(
        keyData.secret,
        signature,
        req.method,
        req.path,
        timestamp,
        body
      );

      if (!isValid) {
        logger.warn('Invalid HMAC signature', {
          apiKey: apiKey.substring(0, 12),
          path: req.path,
        });
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid signature',
        });
        return;
      }

      // Attach API key data to request
      (req as any).apiKey = keyData;
      (req as any).tenantId = keyData.tenantId;

      // Update last used timestamp (async, don't block)
      updateLastUsed(keyData.id).catch((err) => {
        logger.error('Failed to update API key last used', { error: err });
      });

      logger.info('HMAC authentication successful', {
        keyId: keyData.id,
        tenantId: keyData.tenantId,
      });

      next();
    } catch (err) {
      logger.error('HMAC authentication error', { error: err });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  };
}

/**
 * Lookup API key from storage
 * TODO: Implement actual database lookup
 */
async function lookupApiKey(key: string): Promise<ApiKey | null> {
  // In production, query from database:
  // const result = await db.query('SELECT * FROM api_keys WHERE key = $1', [key])
  
  // For now, check environment for test keys
  const testKey = secretsBridge.get('TEST_API_KEY', '');
  const testSecret = secretsBridge.get('TEST_API_SECRET', '');

  if (key === testKey && testSecret) {
    return {
      id: 'test-key-1',
      key,
      secret: testSecret,
      tenantId: 'tenant-test',
      scopes: ['*'],
      createdAt: new Date(),
    };
  }

  return null;
}

/**
 * Update last used timestamp
 */
async function updateLastUsed(keyId: string): Promise<void> {
  // In production: await db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyId])
  logger.debug('Updated API key last used', { keyId });
}

/**
 * Rotate API key (generate new secret, invalidate old)
 */
export async function rotateApiKey(keyId: string): Promise<ApiKey> {
  // Lookup existing key
  // Generate new secret
  // Update in database
  // Return new credentials

  throw new Error('Not implemented - requires database integration');
}

/**
 * Revoke API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  // In production: await db.query('DELETE FROM api_keys WHERE id = $1', [keyId])
  logger.info('API key revoked', { keyId });
}
