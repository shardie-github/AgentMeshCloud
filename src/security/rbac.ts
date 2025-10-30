/**
 * Role-Based Access Control (RBAC)
 * Defines permissions and enforces access policies
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/common/logger.js';
import type { UserToken, Role } from './auth_oidc.js';

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

/**
 * Role hierarchy and permissions matrix
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    { resource: '*', action: 'admin' }, // Full access
  ],
  admin: [
    { resource: 'workflows', action: 'admin' },
    { resource: 'agents', action: 'admin' },
    { resource: 'reports', action: 'admin' },
    { resource: 'settings', action: 'write' },
    { resource: 'users', action: 'write' },
    { resource: 'billing', action: 'read' },
  ],
  analyst: [
    { resource: 'workflows', action: 'read' },
    { resource: 'agents', action: 'read' },
    { resource: 'reports', action: 'write' },
    { resource: 'dashboards', action: 'write' },
    { resource: 'settings', action: 'read' },
  ],
  viewer: [
    { resource: 'workflows', action: 'read' },
    { resource: 'agents', action: 'read' },
    { resource: 'reports', action: 'read' },
    { resource: 'dashboards', action: 'read' },
  ],
};

/**
 * Check if user has permission for resource/action
 */
export function hasPermission(
  user: UserToken,
  resource: string,
  action: Permission['action']
): boolean {
  for (const role of user.roles) {
    const permissions = ROLE_PERMISSIONS[role as Role];
    if (!permissions) continue;

    for (const perm of permissions) {
      // Wildcard resource grants all permissions
      if (perm.resource === '*') {
        return true;
      }

      // Exact resource match
      if (perm.resource === resource) {
        // Admin action grants all sub-actions
        if (perm.action === 'admin') return true;

        // Hierarchical actions: delete > write > read
        const actionLevels = { read: 1, write: 2, delete: 3, admin: 4 };
        if (actionLevels[perm.action] >= actionLevels[action]) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get highest role from user's roles
 */
export function getPrimaryRole(user: UserToken): Role {
  const roleHierarchy: Role[] = ['owner', 'admin', 'analyst', 'viewer'];

  for (const role of roleHierarchy) {
    if (user.roles.includes(role)) {
      return role;
    }
  }

  return 'viewer';
}

/**
 * Express middleware to enforce authentication
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserToken | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    next();
  };
}

/**
 * Express middleware to enforce role-based access
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserToken | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const hasRole = user.roles.some((role) => allowedRoles.includes(role as Role));

    if (!hasRole) {
      logger.warn('Access denied - insufficient role', {
        userId: user.sub,
        userRoles: user.roles,
        requiredRoles: allowedRoles,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: allowedRoles,
      });
      return;
    }

    next();
  };
}

/**
 * Express middleware to enforce resource-level permissions
 */
export function requirePermission(resource: string, action: Permission['action']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as UserToken | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!hasPermission(user, resource, action)) {
      logger.warn('Access denied - insufficient permission', {
        userId: user.sub,
        resource,
        action,
        userRoles: user.roles,
      });

      res.status(403).json({
        error: 'Forbidden',
        message: `Insufficient permissions for ${action} on ${resource}`,
      });
      return;
    }

    next();
  };
}

/**
 * Multi-tenant ownership check
 */
export function requireOwnership(getOwnerId: (req: Request) => string | Promise<string>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user as UserToken | undefined;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    try {
      const ownerId = await getOwnerId(req);

      // Owner role bypasses ownership checks
      if (user.roles.includes('owner')) {
        next();
        return;
      }

      // Check if user owns the resource
      if (user.sub !== ownerId) {
        logger.warn('Access denied - not resource owner', {
          userId: user.sub,
          resourceOwnerId: ownerId,
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'You do not own this resource',
        });
        return;
      }

      next();
    } catch (err) {
      logger.error('Ownership check failed', { error: err });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify resource ownership',
      });
    }
  };
}
