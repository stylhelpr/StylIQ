import { Module } from '@nestjs/common';
import { PineconeController } from './pinecone.controller';
import { PineconeService } from './pinecone.service';

@Module({
  controllers: [PineconeController],
  providers: [PineconeService],
})
export class PineconeModule {}
