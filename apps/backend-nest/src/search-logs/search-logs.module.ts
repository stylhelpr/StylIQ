import { Module } from '@nestjs/common';
import { SearchLogsController } from './search-logs.controller';
import { SearchLogsService } from './search-logs.service';

@Module({
  controllers: [SearchLogsController],
  providers: [SearchLogsService],
})
export class SearchLogsModule {}
