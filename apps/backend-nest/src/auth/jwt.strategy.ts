// src/auth/jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { pool } from '../db/pool';
import { getSecret } from '../config/secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private request: any;

  constructor() {
    const issuer = getSecret('AUTH0_ISSUER');
    const audience = getSecret('AUTH0_AUDIENCE');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}.well-known/jwks.json`,
      }),
      issuer,
      audience,
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
  }

  private logAuthFailure(reason: string): void {
    this.logger.warn({
      event: 'AUTH_FAILURE',
      reason,
      ip: this.request?.ip || this.request?.connection?.remoteAddress,
      userAgent: this.request?.headers?.['user-agent'],
    });
  }

  async validate(req: any, payload: any) {
    this.request = req;
    const auth0Sub = payload.sub;
    if (!auth0Sub) {
      this.logAuthFailure('Invalid token: missing subject');
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    try {
      // Resolve Auth0 sub → internal UUID (ONCE, at auth boundary)
      const result = await pool.query(
        'SELECT id FROM users WHERE auth0_sub = $1',
        [auth0Sub],
      );

      if (result.rows.length === 0) {
        this.logAuthFailure('User not found');
        throw new UnauthorizedException('User not found');
      }

      // Return ONLY internal UUID - Auth0 sub never leaves auth layer
      return {
        userId: result.rows[0].id,
      };
    } catch (err) {
      // Wrap DB errors as UnauthorizedException to prevent pg errors from bubbling up
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      console.error('JWT validation DB error:', err);
      this.logAuthFailure('Authentication failed');
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
