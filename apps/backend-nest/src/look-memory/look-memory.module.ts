import { Module } from '@nestjs/common';
import { LookMemoryController } from './look-memory.controller';
import { LookMemoryService } from './look-memory.service';

@Module({
  controllers: [LookMemoryController],
  providers: [LookMemoryService],
  exports: [LookMemoryService],
})
export class LookMemoryModule {}
