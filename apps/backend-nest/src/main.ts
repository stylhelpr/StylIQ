import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { applyAuthMiddleware } from './auth/auth.middleware';
import cors from '@fastify/cors'; // ✅ Import Fastify CORS

async function bootstrap() {
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  applyAuthMiddleware(adapter.getInstance());

  // ✅ Enable CORS before listening
  await app.register(cors, {
    origin: '*', // or specify frontend IP/domain here
    credentials: true,
  });

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
