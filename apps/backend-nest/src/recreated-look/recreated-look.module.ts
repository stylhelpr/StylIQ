import { Module } from '@nestjs/common';
import { RecreatedLookController } from './recreated-look.controller';
import { RecreatedLookService } from './recreated-look.service';

@Module({
  controllers: [RecreatedLookController],
  providers: [RecreatedLookService],
  exports: [RecreatedLookService],
})
export class RecreatedLookModule {}
