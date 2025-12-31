import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FeedSourcesService } from './feed-sources.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/feed-sources')
export class FeedSourcesController {
  constructor(private readonly service: FeedSourcesService) {}

  @Get()
  getAll(@Req() req) {
    const userId = req.user.userId;
    return this.service.findAll(userId);
  }

  @Put()
  replaceAll(@Req() req, @Body('sources') sources: any[]) {
    const userId = req.user.userId;
    return this.service.replaceAll(userId, sources);
  }

  @Post()
  create(
    @Req() req,
    @Body() body: { name: string; url: string; enabled?: boolean },
  ) {
    const userId = req.user.userId;
    return this.service.create(userId, body);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; enabled: boolean }>,
  ) {
    const userId = req.user.userId;
    return this.service.update(userId, id, body);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.service.remove(userId, id);
  }
}
