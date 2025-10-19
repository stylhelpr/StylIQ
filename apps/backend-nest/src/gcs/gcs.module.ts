import { Module } from '@nestjs/common';
import { GCSController } from './gcs.controller';
import { GCSService } from './gcs.service';

@Module({
  controllers: [GCSController],
  providers: [GCSService],
})
export class GCSModule {}
