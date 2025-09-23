import * as dotenv from 'dotenv';
dotenv.config(); // Load env variables first

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import cors from '@fastify/cors';
import * as passport from 'passport';
import fastifyExpress from '@fastify/express';
import { ScheduledOutfitNotifier } from './scheduled-outfit/scheduled-outfit.notifier';

async function bootstrap() {
  try {
    // Keep logs quiet by default; override with FASTIFY_LOG_LEVEL
    const adapter = new FastifyAdapter({
      logger: { level: process.env.FASTIFY_LOG_LEVEL ?? 'error' },
    });

    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      adapter,
      { logger: ['error', 'warn'] },
    );

    // Ensure Express-style middleware exists (used by Passport)
    const fastifyInstance = adapter.getInstance() as any;
    if (typeof fastifyInstance.use !== 'function') {
      await fastifyInstance.register(fastifyExpress);
    }
    fastifyInstance.use(passport.initialize());

    // CORS
    await app.register(cors, {
      origin: '*', // tighten in prod
      credentials: true,
    });

    // Prefix real APIs under /api
    app.setGlobalPrefix('api');

    // ---- Minimal endpoints so Cloud Run health/startup probes get 200s ----
    const fastify = app.getHttpAdapter().getInstance();
    fastify.get('/', async (_req: any, reply: any) =>
      reply.send({ status: 'ok' }),
    );
    fastify.get('/api/health', async (_req: any, reply: any) =>
      reply.send({ status: 'healthy' }),
    );
    // ----------------------------------------------------------------------

    // Listen: Cloud Run sets PORT (8080). Default to 3001 locally.
    const port = Number(process.env.PORT ?? 3001);
    await app.listen(port, '0.0.0.0');

    if (process.env.NODE_ENV !== 'production') {
      console.log(`API listening on http://localhost:${port} (prefix: /api)`);
    }

    // ---- Background job: start AFTER the server is up ----
    const notifier = app.get(ScheduledOutfitNotifier);
    const intervalMs = Math.max(
      5000,
      Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
    );

    // Kick once at boot
    notifier
      .run()
      .catch((err) => console.error('❌ Notifier startup error:', err));

    // Then run on an interval
    setInterval(() => {
      notifier.run().catch((err) => console.error('❌ Notifier error:', err));
    }, intervalMs);
  } catch (err) {
    console.error('❌ Fatal bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();

//////////////////////

// import * as dotenv from 'dotenv';
// dotenv.config(); // Load env variables first

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import cors from '@fastify/cors';
// import * as passport from 'passport';
// import fastifyExpress from '@fastify/express';
// import { ScheduledOutfitNotifier } from './scheduled-outfit/scheduled-outfit.notifier';

// async function bootstrap() {
//   // Quiet Fastify/Nest logs unless overridden
//   const adapter = new FastifyAdapter({
//     logger: { level: process.env.FASTIFY_LOG_LEVEL ?? 'error' },
//   });

//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//     { logger: ['error', 'warn'] },
//   );

//   // Ensure Express-style middleware exists (for Passport)
//   if (typeof (adapter.getInstance() as any).use !== 'function') {
//     await adapter.getInstance().register(fastifyExpress);
//   }
//   adapter.getInstance().use(passport.initialize());

//   // CORS
//   await app.register(cors, {
//     origin: '*', // tighten in prod as needed
//     credentials: true,
//   });

//   // All real APIs are under /api
//   app.setGlobalPrefix('api');

//   // --- Minimal probes so Cloud Run sees 200s on startup/health ---
//   const fastify = app.getHttpAdapter().getInstance();

//   // Root path for Cloud Run's default startup probe
//   fastify.get('/', async (_req: any, reply: any) => {
//     reply.send({ status: 'ok' });
//   });

//   // Optional explicit health endpoint under your API prefix
//   fastify.get('/api/health', async (_req: any, reply: any) => {
//     reply.send({ status: 'healthy' });
//   });
//   // ---------------------------------------------------------------

//   // ---- Scheduled Outfit Notifier loop ----
//   const notifier = app.get(ScheduledOutfitNotifier);

//   const intervalMs = Math.max(
//     5000,
//     Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
//   );

//   // Kick once at boot
//   notifier
//     .run()
//     .catch((err) => console.error('❌ Notifier startup error:', err));

//   // Then on an interval
//   setInterval(() => {
//     notifier.run().catch((err) => console.error('❌ Notifier error:', err));
//   }, intervalMs);

//   // Listen: Cloud Run provides PORT=8080; default to 3001 for local dev
//   const port = Number(process.env.PORT ?? 3001);
//   await app.listen(port, '0.0.0.0');
//   // Optionally log a single startup line locally
//   if (process.env.NODE_ENV !== 'production') {
//     console.log(`API listening on http://localhost:${port} (prefix: /api)`);
//   }
// }

// bootstrap();

//////////////////

// import * as dotenv from 'dotenv';
// dotenv.config(); // Load env variables first

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import cors from '@fastify/cors';
// import * as passport from 'passport';
// import fastifyExpress from '@fastify/express';
// import { ScheduledOutfitNotifier } from './scheduled-outfit/scheduled-outfit.notifier';

// async function bootstrap() {
//   // Create Fastify adapter with quieter logger
//   const adapter = new FastifyAdapter({
//     logger: { level: process.env.FASTIFY_LOG_LEVEL ?? 'error' }, // 'error' | 'warn' | 'info' | 'debug'
//   });

//   // Create Nest app with limited logger levels
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//     { logger: ['error', 'warn'] },
//   );

//   // Ensure Express-style middleware is available (for Passport)
//   if (typeof (adapter.getInstance() as any).use !== 'function') {
//     await adapter.getInstance().register(fastifyExpress);
//   }
//   adapter.getInstance().use(passport.initialize());

//   // CORS
//   await app.register(cors, {
//     origin: '*', // tighten in production
//     credentials: true,
//   });

//   // Global API prefix
//   app.setGlobalPrefix('api');

//   // ---- Scheduled Outfit Notifier loop ----
//   const notifier = app.get(ScheduledOutfitNotifier);

//   // Interval (default 30s). Override with SCHEDULE_NOTIFIER_INTERVAL_MS if needed.
//   const intervalMs = Math.max(
//     5000,
//     Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
//   );

//   // Run once immediately on boot
//   notifier
//     .run()
//     .catch((err) => console.error('❌ Notifier error on startup:', err));

//   // Then on an interval
//   setInterval(() => {
//     notifier.run().catch((err) => console.error('❌ Notifier error:', err));
//   }, intervalMs);

//   // Start server
//   //   await app.listen(3001, '0.0.0.0');

//   // Start server
//   await app.listen(
//     process.env.PORT ? Number(process.env.PORT) : 8080,
//     '0.0.0.0',
//   );
// }

// bootstrap();

//////////////////////////////

// import * as dotenv from 'dotenv';
// dotenv.config(); // Load env variables first

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import cors from '@fastify/cors';
// import * as passport from 'passport';
// import fastifyExpress from '@fastify/express';
// import { ScheduledOutfitNotifier } from './scheduled-outfit/scheduled-outfit.notifier';

// async function bootstrap() {
//   // Create Fastify adapter with quieter logger
//   const adapter = new FastifyAdapter({
//     logger: { level: process.env.FASTIFY_LOG_LEVEL ?? 'error' }, // 'error' | 'warn' | 'info' | 'debug'
//   });

//   // Create Nest app with limited logger levels
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//     { logger: ['error', 'warn'] },
//   );

//   // Ensure Express-style middleware is available (for Passport)
//   if (typeof (adapter.getInstance() as any).use !== 'function') {
//     await adapter.getInstance().register(fastifyExpress);
//   }
//   adapter.getInstance().use(passport.initialize());

//   // CORS
//   await app.register(cors, {
//     origin: '*', // tighten in production
//     credentials: true,
//   });

//   // Global API prefix
//   app.setGlobalPrefix('api');

//   // ---- Scheduled Outfit Notifier loop ----
//   const notifier = app.get(ScheduledOutfitNotifier);

//   // Interval (default 30s). Override with SCHEDULE_NOTIFIER_INTERVAL_MS if needed.
//   const intervalMs = Math.max(
//     5000,
//     Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
//   );

//   // Run once immediately on boot
//   notifier
//     .run()
//     .catch((err) => console.error('❌ Notifier error on startup:', err));

//   // Then on an interval
//   setInterval(() => {
//     notifier.run().catch((err) => console.error('❌ Notifier error:', err));
//   }, intervalMs);

//   // Start server
//   await app.listen(3001, '0.0.0.0');
// }

// bootstrap();

//////////////////////

// // apps/backend-nest/src/main.ts
// import * as dotenv from 'dotenv';
// dotenv.config(); // Load env variables first

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import cors from '@fastify/cors';
// import * as passport from 'passport';
// import fastifyExpress from '@fastify/express';
// import { ScheduledOutfitNotifier } from './scheduled-outfit/scheduled-outfit.notifier';

// async function bootstrap() {
//   // Create Fastify adapter and Nest app
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   // Ensure Express-style middleware is available (for Passport)
//   if (typeof (adapter.getInstance() as any).use !== 'function') {
//     await adapter.getInstance().register(fastifyExpress);
//   }
//   adapter.getInstance().use(passport.initialize());

//   // CORS
//   await app.register(cors, {
//     origin: '*', // tighten in production
//     credentials: true,
//   });

//   // Global API prefix
//   app.setGlobalPrefix('api');

//   // ---- Scheduled Outfit Notifier loop ----
//   const notifier = app.get(ScheduledOutfitNotifier);

//   // Interval (default 30s). Override with SCHEDULE_NOTIFIER_INTERVAL_MS if needed.
//   const intervalMs = Math.max(
//     5000,
//     Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
//   );

//   // Run once immediately on boot
//   notifier
//     .run()
//     .catch((err) => console.error('❌ Notifier error on startup:', err));

//   // Then on an interval
//   setInterval(() => {
//     notifier.run().catch((err) => console.error('❌ Notifier error:', err));
//   }, intervalMs);

//   // Start server
//   await app.listen(3001, '0.0.0.0');
// }

// bootstrap();
