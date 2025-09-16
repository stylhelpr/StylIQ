import * as dotenv from 'dotenv';
dotenv.config();
// 🔹 Load environment variables from .env before anything else (DB URL, API keys, etc.)

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import cors from '@fastify/cors';
import * as passport from 'passport';
import fastifyExpress from '@fastify/express';

async function bootstrap() {
  // 🔹 Create a Fastify adapter for NestJS instead of default Express
  const adapter = new FastifyAdapter();

  // 🔹 Initialize NestJS app with the Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // ✅ Ensure Fastify can use Express-style middleware (needed for Passport)
  if (typeof (adapter.getInstance() as any).use !== 'function') {
    await adapter.getInstance().register(fastifyExpress);
  }

  // ✅ Initialize Passport authentication middleware
  adapter.getInstance().use(passport.initialize());

  // ✅ Enable CORS (allow cross-origin requests)
  await app.register(cors, {
    origin: '*', // allow all origins (change this in production!)
    credentials: true, // include cookies/headers for auth
  });

  // ✅ Set a global API prefix → all routes start with `/api/...`
  app.setGlobalPrefix('api');

  // ✅ Start the server on port 3001 (listen on all interfaces)
  await app.listen(3001, '0.0.0.0');
}
bootstrap();

//////////////

// import * as dotenv from 'dotenv';
// dotenv.config();

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import cors from '@fastify/cors';
// import * as passport from 'passport';
// import fastifyExpress from '@fastify/express';

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   // ✅ Register @fastify/express ONLY if not already registered
//   if (typeof (adapter.getInstance() as any).use !== 'function') {
//     await adapter.getInstance().register(fastifyExpress);
//   }

//   // ✅ Apply middleware AFTER express support is in place
//   adapter.getInstance().use(passport.initialize());

//   await app.register(cors, {
//     origin: '*',
//     credentials: true,
//   });

//   app.setGlobalPrefix('api');
//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();
