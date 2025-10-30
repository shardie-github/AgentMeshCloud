/**
 * OIDC SSO Authentication Provider
 * Supports generic OIDC providers (Auth0, Okta, Azure AD, etc.)
 * Issues JWTs with role claims for RBAC enforcement
 */

import crypto from 'node:crypto';
import { logger } from '@/common/logger.js';
import { secretsBridge } from './secrets_bridge.js';

export interface OIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  roleClaim?: string; // Claim path for roles, default: 'roles'
}

export interface UserToken {
  sub: string; // User ID
  email: string;
  name?: string;
  roles: string[];
  iss: string;
  exp: number;
  iat: number;
}

export type Role = 'owner' | 'admin' | 'analyst' | 'viewer';

export class OIDCAuthProvider {
  private config: OIDCConfig;
  private jwksCache: Map<string, crypto.JsonWebKey> = new Map();
  private jwksCacheExpiry = 0;

  constructor(config?: OIDCConfig) {
    this.config = config || this.loadConfigFromSecrets();
  }

  private loadConfigFromSecrets(): OIDCConfig {
    return {
      issuer: secretsBridge.get('OIDC_ISSUER', 'https://auth.example.com'),
      clientId: secretsBridge.get('OIDC_CLIENT_ID', 'orca-platform'),
      clientSecret: secretsBridge.get('OIDC_CLIENT_SECRET', 'change-me-in-production'),
      redirectUri: secretsBridge.get('OIDC_REDIRECT_URI', 'http://localhost:3000/auth/callback'),
      scopes: ['openid', 'profile', 'email'],
      roleClaim: secretsBridge.get('OIDC_ROLE_CLAIM', 'roles'),
    };
  }

  /**
   * Generate authorization URL for SSO redirect
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    return `${this.config.issuer}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  }> {
    // In production, this would make actual HTTP request to token endpoint
    // For now, return stub tokens for testing
    logger.info('Exchanging authorization code for tokens', { code: code.substring(0, 8) });

    // Stub implementation - replace with actual OIDC flow
    return {
      accessToken: this.generateStubToken('access'),
      idToken: this.generateStubToken('id'),
      refreshToken: this.generateStubToken('refresh'),
    };
  }

  /**
   * Verify and decode ID token
   */
  async verifyIdToken(idToken: string): Promise<UserToken> {
    // In production, verify signature against JWKS endpoint
    // For now, decode and validate basic structure
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(
        Buffer.from(parts[1]!, 'base64url').toString('utf-8')
      );

      // Validate issuer
      if (payload.iss !== this.config.issuer) {
        throw new Error(`Invalid issuer: expected ${this.config.issuer}, got ${payload.iss}`);
      }

      // Validate expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Token expired');
      }

      // Extract roles from configured claim path
      const roles = this.extractRoles(payload);

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        roles,
        iss: payload.iss,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (err) {
      logger.error('ID token verification failed', { error: err });
      throw new Error('Invalid ID token');
    }
  }

  /**
   * Extract roles from token payload
   */
  private extractRoles(payload: Record<string, unknown>): string[] {
    const roleClaim = this.config.roleClaim || 'roles';
    const roles = payload[roleClaim];

    if (Array.isArray(roles)) {
      return roles.filter((r): r is string => typeof r === 'string');
    }

    if (typeof roles === 'string') {
      return [roles];
    }

    // Default role if none specified
    return ['viewer'];
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    idToken: string;
  }> {
    logger.info('Refreshing access token');

    // Stub implementation
    return {
      accessToken: this.generateStubToken('access'),
      idToken: this.generateStubToken('id'),
    };
  }

  /**
   * Logout user (revoke tokens)
   */
  async logout(token: string): Promise<void> {
    logger.info('Logging out user');
    // In production, call revocation endpoint
  }

  /**
   * Generate stub JWT for development/testing
   */
  private generateStubToken(type: 'access' | 'id' | 'refresh'): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' })
    ).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        iss: this.config.issuer,
        sub: 'user-' + crypto.randomBytes(8).toString('hex'),
        aud: this.config.clientId,
        email: 'user@example.com',
        name: 'Test User',
        roles: ['admin', 'analyst'],
        iat: now,
        exp: now + (type === 'refresh' ? 86400 * 30 : 3600),
        token_type: type,
      })
    ).toString('base64url');

    const signature = Buffer.from(crypto.randomBytes(32)).toString('base64url');

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Fetch JWKS for token verification (production)
   */
  private async fetchJWKS(): Promise<void> {
    const now = Date.now();
    if (this.jwksCacheExpiry > now) {
      return; // Cache still valid
    }

    // In production, fetch from ${this.config.issuer}/.well-known/jwks.json
    logger.info('Fetching JWKS from issuer', { issuer: this.config.issuer });

    this.jwksCacheExpiry = now + 3600 * 1000; // Cache for 1 hour
  }
}

// Export singleton instance
export const oidcProvider = new OIDCAuthProvider();
