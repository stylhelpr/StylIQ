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
  // Create Fastify adapter with quieter logger
  const adapter = new FastifyAdapter({
    logger: { level: process.env.FASTIFY_LOG_LEVEL ?? 'error' }, // 'error' | 'warn' | 'info' | 'debug'
  });

  // Create Nest app with limited logger levels
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { logger: ['error', 'warn'] },
  );

  // Ensure Express-style middleware is available (for Passport)
  if (typeof (adapter.getInstance() as any).use !== 'function') {
    await adapter.getInstance().register(fastifyExpress);
  }
  adapter.getInstance().use(passport.initialize());

  // CORS
  await app.register(cors, {
    origin: '*', // tighten in production
    credentials: true,
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // ---- Scheduled Outfit Notifier loop ----
  const notifier = app.get(ScheduledOutfitNotifier);

  // Interval (default 30s). Override with SCHEDULE_NOTIFIER_INTERVAL_MS if needed.
  const intervalMs = Math.max(
    5000,
    Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
  );

  // Run once immediately on boot
  notifier
    .run()
    .catch((err) => console.error('❌ Notifier error on startup:', err));

  // Then on an interval
  setInterval(() => {
    notifier.run().catch((err) => console.error('❌ Notifier error:', err));
  }, intervalMs);

  // Start server
  //   await app.listen(3001, '0.0.0.0');

  // Start server
  await app.listen(
    process.env.PORT ? Number(process.env.PORT) : 8080,
    '0.0.0.0',
  );
}

bootstrap();

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
