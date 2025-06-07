// src/auth/auth.middleware.ts
import { FastifyInstance } from 'fastify';

export function applyAuthMiddleware(fastify: FastifyInstance) {
  // No-op: JWT handled by JwtAuthGuard
}

export {}; // 👈 This keeps it recognized as a module even if nothing is used

///////////

// src/auth/auth.middleware.ts
// import { FastifyInstance } from 'fastify';

// export function applyAuthMiddleware(fastify: FastifyInstance) {
//   fastify.addHook('onRequest', async (req, reply) => {
//     // ✅ TEMPORARY DEV MODE: bypass JWT and hardcode user
//     (req as any).user = { sub: 'mock-user-id' };
//     return;
//   });
// }

// ///////////////

// // src/auth/auth.middleware.ts
// import { FastifyInstance } from 'fastify';
// import * as jwt from 'jsonwebtoken';

// export function applyAuthMiddleware(fastify: FastifyInstance) {
//   fastify.addHook('onRequest', async (req, reply) => {
//     const openPaths = ['/upload', '/ai/prompt', '/feedback/rate'];
//     if (openPaths.some((path) => req.url?.startsWith(path))) return;

//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       reply.status(401).send({ message: 'Missing token' });
//       return;
//     }

//     try {
//       const token = authHeader.split(' ')[1];
//       const decoded = jwt.decode(token) as any;
//       (req as any).user = { sub: decoded.sub };
//     } catch {
//       reply.status(401).send({ message: 'Invalid token' });
//     }
//   });
// }

////////////

// // auth/auth.middleware.ts
// import {
//   Injectable,
//   NestMiddleware,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { FastifyRequest } from 'fastify';
// import * as jwt from 'jsonwebtoken';

// @Injectable()
// export class AuthMiddleware implements NestMiddleware {
//   use(req: FastifyRequest & { user?: any }, _res: any, next: () => void) {
//     const authHeader = req.headers['authorization'];

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       throw new UnauthorizedException('Missing token');
//     }

//     const token = authHeader.split(' ')[1];

//     try {
//       const decoded = jwt.decode(token) as any;
//       if (!decoded?.sub) {
//         throw new UnauthorizedException('Invalid token payload');
//       }

//       req.user = { sub: decoded.sub };
//       next();
//     } catch (err) {
//       throw new UnauthorizedException('Invalid token');
//     }
//   }
// }
