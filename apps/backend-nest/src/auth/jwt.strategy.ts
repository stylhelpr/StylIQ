// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { pool } from '../db/pool';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.AUTH0_ISSUER}.well-known/jwks.json`,
      }),
      issuer: process.env.AUTH0_ISSUER,
      audience: process.env.AUTH0_AUDIENCE,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    const auth0Sub = payload.sub;
    if (!auth0Sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    // Resolve Auth0 sub → internal UUID (ONCE, at auth boundary)
    const result = await pool.query(
      'SELECT id FROM users WHERE auth0_sub = $1',
      [auth0Sub],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    // Return ONLY internal UUID - Auth0 sub never leaves auth layer
    return {
      userId: result.rows[0].id,
    };
  }
}
