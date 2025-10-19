import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { FeedSourcesService } from './feed-sources.service';

@Controller('users/:userId/feed-sources')
export class FeedSourcesController {
  constructor(private readonly service: FeedSourcesService) {}

  @Get()
  getAll(@Param('userId') userId: string) {
    return this.service.findAll(userId);
  }

  @Put()
  replaceAll(@Param('userId') userId: string, @Body('sources') sources: any[]) {
    console.log('FEED PUT', {
      userId,
      count: Array.isArray(sources) ? sources.length : 'no sources',
    });
    return this.service.replaceAll(userId, sources);
  }

  @Post()
  create(
    @Param('userId') userId: string,
    @Body() body: { name: string; url: string; enabled?: boolean },
  ) {
    return this.service.create(userId, body);
  }

  @Patch(':id')
  update(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; enabled: boolean }>,
  ) {
    return this.service.update(userId, id, body);
  }

  @Delete(':id')
  remove(@Param('userId') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
