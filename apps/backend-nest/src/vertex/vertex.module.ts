// apps/backend-nest/src/vertex/vertex.module.ts
import { Module } from '@nestjs/common';
import { VertexService } from './vertex.service';

@Module({
  providers: [VertexService],
  exports: [VertexService], // 👈 so other modules (like Wardrobe) can use it
})
export class VertexModule {}
