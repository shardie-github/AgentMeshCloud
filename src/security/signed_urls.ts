/**
 * Short-lived Signed URLs for Report Downloads
 * Enables secure, time-limited access to sensitive resources
 */

import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/common/logger.js';
import { secretsBridge } from './secrets_bridge.js';

export interface SignedUrlOptions {
  resource: string; // Resource identifier (e.g., report ID)
  expiresIn?: number; // TTL in seconds (default: 3600)
  scope?: string; // Additional scope restrictions
  metadata?: Record<string, string>;
}

export interface SignedUrlPayload {
  resource: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  scope?: string;
  metadata?: Record<string, string>;
}

/**
 * Generate signed URL for resource access
 */
export function generateSignedUrl(
  baseUrl: string,
  options: SignedUrlOptions
): string {
  const secret = secretsBridge.get('SIGNING_SECRET', 'change-me-in-production');
  const expiresIn = options.expiresIn || 3600; // 1 hour default
  const now = Math.floor(Date.now() / 1000);

  const payload: SignedUrlPayload = {
    resource: options.resource,
    iat: now,
    exp: now + expiresIn,
    scope: options.scope,
    metadata: options.metadata,
  };

  // Encode payload
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Generate signature
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  // Construct URL with query parameters
  const url = new URL(baseUrl);
  url.searchParams.set('token', encodedPayload);
  url.searchParams.set('signature', signature);

  logger.info('Generated signed URL', {
    resource: options.resource,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  });

  return url.toString();
}

/**
 * Verify and decode signed URL
 */
export function verifySignedUrl(token: string, signature: string): SignedUrlPayload {
  const secret = secretsBridge.get('SIGNING_SECRET', 'change-me-in-production');

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid signature');
  }

  // Decode payload
  const payloadJson = Buffer.from(token, 'base64url').toString('utf-8');
  const payload: SignedUrlPayload = JSON.parse(payloadJson);

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Signed URL expired');
  }

  return payload;
}

/**
 * Express middleware to validate signed URLs
 */
export function requireSignedUrl() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = req.query.token as string;
      const signature = req.query.signature as string;

      if (!token || !signature) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing signed URL parameters',
        });
        return;
      }

      const payload = verifySignedUrl(token, signature);

      // Attach payload to request
      (req as any).signedUrl = payload;

      logger.info('Signed URL validated', {
        resource: payload.resource,
        remainingTTL: payload.exp - Math.floor(Date.now() / 1000),
      });

      next();
    } catch (err) {
      logger.warn('Signed URL validation failed', { error: err });
      res.status(401).json({
        error: 'Unauthorized',
        message: err instanceof Error ? err.message : 'Invalid signed URL',
      });
    }
  };
}

/**
 * Generate signed URL for report download
 */
export function generateReportDownloadUrl(
  reportId: string,
  tenantId: string,
  expiresIn = 3600
): string {
  const baseUrl = secretsBridge.get(
    'PUBLIC_URL',
    'http://localhost:3000'
  ) + '/api/reports/download';

  return generateSignedUrl(baseUrl, {
    resource: `report:${reportId}`,
    expiresIn,
    scope: 'download',
    metadata: { tenantId },
  });
}

/**
 * Generate signed URL for file upload
 */
export function generateUploadUrl(
  path: string,
  tenantId: string,
  expiresIn = 900 // 15 minutes
): string {
  const baseUrl = secretsBridge.get(
    'PUBLIC_URL',
    'http://localhost:3000'
  ) + '/api/uploads';

  return generateSignedUrl(baseUrl, {
    resource: `upload:${path}`,
    expiresIn,
    scope: 'write',
    metadata: { tenantId },
  });
}

/**
 * Generate signed URL for webhook callback
 */
export function generateWebhookCallbackUrl(
  workflowId: string,
  tenantId: string,
  expiresIn = 86400 // 24 hours
): string {
  const baseUrl = secretsBridge.get(
    'PUBLIC_URL',
    'http://localhost:3000'
  ) + '/api/webhooks/callback';

  return generateSignedUrl(baseUrl, {
    resource: `workflow:${workflowId}`,
    expiresIn,
    scope: 'webhook',
    metadata: { tenantId },
  });
}
