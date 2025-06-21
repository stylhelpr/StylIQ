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
