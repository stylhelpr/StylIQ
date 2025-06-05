import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { FastifyRequest, FastifyReply } from 'fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register Fastify-style middleware
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (req: FastifyRequest, res: FastifyReply) => {
      const authHeader = req.headers['authorization'];

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.code(401).send({ message: 'Unauthorized' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = { sub: 'user123' }; // replace with real decoding
        (req as any).user = { sub: decoded.sub };
      } catch {
        res.code(401).send({ message: 'Invalid token' });
      }
    });

  await app.listen(3001, '0.0.0.0');
}
bootstrap();
