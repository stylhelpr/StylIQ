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
      // CRITICAL: This is the ONLY place where auth0_sub is used to identify a user
      // NO fallback to email, NO caching, NO merging - strict auth0_sub lookup only
      const result = await pool.query(
        'SELECT id, auth0_sub FROM users WHERE auth0_sub = $1',
        [auth0Sub],
      );

      if (result.rows.length === 0) {
        this.logAuthFailure('User not found');
        throw new UnauthorizedException('User not found');
      }

      const userId = result.rows[0].id;
      const dbAuth0Sub = result.rows[0].auth0_sub;

      // VERIFICATION: Log that JWT sub matches DB auth0_sub (they MUST be identical)
      this.logger.log({
        event: 'AUTH_SUCCESS',
        jwtSub: auth0Sub,
        dbAuth0Sub: dbAuth0Sub,
        userId: userId,
        match: auth0Sub === dbAuth0Sub,
      });

      // Sanity check - these MUST match
      if (auth0Sub !== dbAuth0Sub) {
        this.logger.error({
          event: 'AUTH_MISMATCH',
          message:
            'JWT sub does not match DB auth0_sub - this should never happen',
          jwtSub: auth0Sub,
          dbAuth0Sub: dbAuth0Sub,
        });
        throw new UnauthorizedException('Authentication integrity error');
      }

      // Return ONLY internal UUID - Auth0 sub never leaves auth layer
      return {
        userId: userId,
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
