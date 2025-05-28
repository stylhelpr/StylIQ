import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://localhost:${port}`);
}
bootstrap();
