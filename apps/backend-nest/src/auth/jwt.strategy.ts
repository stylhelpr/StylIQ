// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

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
    return payload; // payload.sub will contain auth0|... user ID
  }
}

////////

// // src/auth/jwt.strategy.ts
// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import * as jwksRsa from 'jwks-rsa';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor() {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKeyProvider: jwksRsa.passportJwtSecret({
//         cache: true,
//         rateLimit: true,
//         jwksRequestsPerMinute: 5,
//         jwksUri: `${process.env.AUTH0_ISSUER}.well-known/jwks.json`,
//       }),
//       issuer: process.env.AUTH0_ISSUER,
//       audience: process.env.AUTH0_AUDIENCE,
//       algorithms: ['RS256'],
//     });
//   }

//   async validate(payload: any) {
//     return payload; // payload.sub will contain auth0|... user ID
//   }
// }
