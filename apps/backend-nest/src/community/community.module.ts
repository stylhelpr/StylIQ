import { Module } from '@nestjs/common';
import { CommunityPublicController } from './community.public.controller';
import { CommunityPrivateController } from './community.private.controller';
import { CommunityService } from './community.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VertexModule } from '../vertex/vertex.module';

@Module({
  imports: [NotificationsModule, VertexModule],
  controllers: [CommunityPublicController, CommunityPrivateController],
  providers: [CommunityService],
})
export class CommunityModule {}
