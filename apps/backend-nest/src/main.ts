import * as dotenv from 'dotenv';
dotenv.config();

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
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // ✅ Register @fastify/express ONLY if not already registered
  if (typeof (adapter.getInstance() as any).use !== 'function') {
    await adapter.getInstance().register(fastifyExpress);
  }

  // ✅ Apply middleware AFTER express support is in place
  adapter.getInstance().use(passport.initialize());

  await app.register(cors, {
    origin: '*',
    credentials: true,
  });

  app.setGlobalPrefix('api');
  await app.listen(3001, '0.0.0.0');
}
bootstrap();

////////////////////

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

//////////////////

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

//   // ✅ Register @fastify/express BEFORE using `.use()` anywhere
//   if (!adapter.getInstance().hasDecorator('use')) {
//     await adapter.getInstance().register(fastifyExpress);
//   }

//   // ✅ Now safely use express-style middleware
//   adapter.getInstance().use(passport.initialize());

//   // ✅ Register CORS
//   await app.register(cors, {
//     origin: '*',
//     credentials: true,
//   });

//   // ✅ Optional global prefix
//   app.setGlobalPrefix('api');

//   // ✅ Start server
//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

////////////

// import * as dotenv from 'dotenv';
// dotenv.config();

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import { applyAuthMiddleware } from './auth/auth.middleware';
// import cors from '@fastify/cors';
// import * as passport from 'passport';
// import fastifyExpress from '@fastify/express'; // ✅

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   applyAuthMiddleware(adapter.getInstance());

//   await app.register(cors, {
//     origin: '*',
//     credentials: true,
//   });

//   // ✅ Register @fastify/express first
//   await adapter.getInstance().register(fastifyExpress);

//   // ✅ Then use express-style middleware like passport
//   adapter.getInstance().use(passport.initialize());

//   app.setGlobalPrefix('api');

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

////////////

// import * as dotenv from 'dotenv';
// dotenv.config();

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import { applyAuthMiddleware } from './auth/auth.middleware';
// import cors from '@fastify/cors';

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   applyAuthMiddleware(adapter.getInstance());

//   await app.register(cors, {
//     origin: '*',
//     credentials: true,
//   });

//   app.setGlobalPrefix('api'); // ✅ Add this line

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

/////////////

// import * as dotenv from 'dotenv';
// dotenv.config();

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import { applyAuthMiddleware } from './auth/auth.middleware';
// import cors from '@fastify/cors'; // ✅ Import Fastify CORS

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   applyAuthMiddleware(adapter.getInstance());

//   // ✅ Enable CORS before listening
//   await app.register(cors, {
//     origin: '*', // or specify frontend IP/domain here
//     credentials: true,
//   });

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

//////////////

// import * as dotenv from 'dotenv';
// dotenv.config();

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import { applyAuthMiddleware } from './auth/auth.middleware';

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   applyAuthMiddleware(adapter.getInstance());

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

///////////////

// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import { applyAuthMiddleware } from './auth/auth.middleware';

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   // Add raw Fastify middleware hook
//   applyAuthMiddleware(adapter.getInstance());

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

//////////

// // src/main.ts
// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';
// import { applyAuthMiddleware } from './auth/auth.middleware';

// async function bootstrap() {
//   const adapter = new FastifyAdapter();
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     adapter,
//   );

//   // Register raw Fastify middleware
//   applyAuthMiddleware(adapter.getInstance());

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();

///////////

// // main.ts
// import { NestFactory } from '@nestjs/core';
// import {
//   FastifyAdapter,
//   NestFastifyApplication,
// } from '@nestjs/platform-fastify';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create<NestFastifyApplication>(
//     AppModule,
//     new FastifyAdapter(),
//   );

//   await app.listen(3001, '0.0.0.0');
// }
// bootstrap();
