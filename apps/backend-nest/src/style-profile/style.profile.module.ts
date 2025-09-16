import { Module } from '@nestjs/common';
import { StyleProfileController } from './style-profile.controller';
import { StyleProfileService } from './style-profile.service';

@Module({
  controllers: [StyleProfileController],
  providers: [StyleProfileService],
})
export class StyleProfileModule {}
