// src/auth/auth.middleware.ts
import { FastifyInstance } from 'fastify';

export function applyAuthMiddleware(fastify: FastifyInstance) {
  // No-op: JWT handled by JwtAuthGuard
}

export {}; // 👈 This keeps it recognized as a module even if nothing is used
