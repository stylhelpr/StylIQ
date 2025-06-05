import { Injectable, NestMiddleware } from '@nestjs/common';
import { IncomingMessage, ServerResponse } from 'http';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(
    req: IncomingMessage & { user?: any },
    res: ServerResponse,
    next: () => void,
  ): void {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Unauthorized' }));
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = { sub: 'user123' }; // placeholder for real decoding logic
      req.user = { sub: decoded.sub };
      next();
    } catch {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Invalid token' }));
    }
  }
}
