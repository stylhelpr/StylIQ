import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VertexModule } from '../vertex/vertex.module';

@Module({
  imports: [NotificationsModule, VertexModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
