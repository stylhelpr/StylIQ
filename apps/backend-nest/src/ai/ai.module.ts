import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseService } from '../db/database.service';
import { VertexService } from '../vertex/vertex.service'; // ✅ added
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/backend-nest/.env', // ✅ explicit .env path
    }),
    LearningModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    DatabaseService,
    VertexService, // ✅ inject VertexService here
  ],
  exports: [AiService],
})
export class AiModule {}
