import { Module } from '@nestjs/common';
import { CommunityPublicController } from './community.public.controller';
import { CommunityPrivateController } from './community.private.controller';
import { CommunityService } from './community.service';
import { CommunityRecommendationsService } from './community-recommendations.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VertexModule } from '../vertex/vertex.module';
import { LearningModule } from '../learning/learning.module';

@Module({
  imports: [NotificationsModule, VertexModule, LearningModule],
  controllers: [CommunityPublicController, CommunityPrivateController],
  providers: [CommunityService, CommunityRecommendationsService],
  exports: [CommunityRecommendationsService],
})
export class CommunityModule {}
