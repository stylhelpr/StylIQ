import * as dotenv from 'dotenv';
dotenv.config(); // Load env variables first

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart'; // ✅ ADD THIS
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

    // ✅ This must come *after* app creation but use adapter.getInstance()
    await adapter.getInstance().register(multipart, {
      limits: { fileSize: 25 * 1024 * 1024 },
    });

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

///////////////////

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
//   try {
//     // Keep logs quiet by default; override with FASTIFY_LOG_LEVEL
//     const adapter = new FastifyAdapter({
//       logger: { level: process.env.FASTIFY_LOG_LEVEL ?? 'error' },
//     });

//     const app = await NestFactory.create<NestFastifyApplication>(
//       AppModule,
//       adapter,
//       { logger: ['error', 'warn'] },
//     );

//     // Ensure Express-style middleware exists (used by Passport)
//     const fastifyInstance = adapter.getInstance() as any;
//     if (typeof fastifyInstance.use !== 'function') {
//       await fastifyInstance.register(fastifyExpress);
//     }
//     fastifyInstance.use(passport.initialize());

//     // CORS
//     await app.register(cors, {
//       origin: '*', // tighten in prod
//       credentials: true,
//     });

//     // Prefix real APIs under /api
//     app.setGlobalPrefix('api');

//     // ---- Minimal endpoints so Cloud Run health/startup probes get 200s ----
//     const fastify = app.getHttpAdapter().getInstance();
//     fastify.get('/', async (_req: any, reply: any) =>
//       reply.send({ status: 'ok' }),
//     );
//     fastify.get('/api/health', async (_req: any, reply: any) =>
//       reply.send({ status: 'healthy' }),
//     );
//     // ----------------------------------------------------------------------

//     // Listen: Cloud Run sets PORT (8080). Default to 3001 locally.
//     const port = Number(process.env.PORT ?? 3001);
//     await app.listen(port, '0.0.0.0');

//     if (process.env.NODE_ENV !== 'production') {
//       console.log(`API listening on http://localhost:${port} (prefix: /api)`);
//     }

//     // ---- Background job: start AFTER the server is up ----
//     const notifier = app.get(ScheduledOutfitNotifier);
//     const intervalMs = Math.max(
//       5000,
//       Number(process.env.SCHEDULE_NOTIFIER_INTERVAL_MS ?? 30_000),
//     );

//     // Kick once at boot
//     notifier
//       .run()
//       .catch((err) => console.error('❌ Notifier startup error:', err));

//     // Then run on an interval
//     setInterval(() => {
//       notifier.run().catch((err) => console.error('❌ Notifier error:', err));
//     }, intervalMs);
//   } catch (err) {
//     console.error('❌ Fatal bootstrap error:', err);
//     process.exit(1);
//   }
// }

// bootstrap();
