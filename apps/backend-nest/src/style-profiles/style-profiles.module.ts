import { Module } from '@nestjs/common';
import { StyleProfilesController } from './style-profiles.controller';
import { StyleProfilesService } from './style-profiles.service';

@Module({
  controllers: [StyleProfilesController],
  providers: [StyleProfilesService],
})
export class StyleProfilesModule {}
