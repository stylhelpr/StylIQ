// auth/auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).send({ message: 'Missing token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token) as any;
      req.user = { sub: decoded.sub };
      next();
    } catch {
      res.status(401).send({ message: 'Invalid token' });
    }
  }
}
