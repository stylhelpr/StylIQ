/**
 * Authenticated user object attached to req.user after JWT validation.
 * Contains ONLY the internal UUID - Auth0 identifiers never leave auth boundary.
 */
export interface AuthUser {
  userId: string; // internal users.id UUID
}

/**
 * Express request with typed user property.
 * Use this instead of `any` for req parameter in controllers.
 */
export interface AuthenticatedRequest {
  user: AuthUser;
}
