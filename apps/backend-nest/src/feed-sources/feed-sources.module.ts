import { Module } from '@nestjs/common';
import { FeedSourcesController } from './feed-sources.controller';
import { FeedSourcesService } from './feed-sources.service';

@Module({
  controllers: [FeedSourcesController],
  providers: [FeedSourcesService],
})
export class FeedSourcesModule {}
