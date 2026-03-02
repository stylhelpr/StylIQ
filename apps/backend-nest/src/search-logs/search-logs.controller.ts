import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { SearchLogsService } from './search-logs.service';
import { CreateSearchLogDto } from './dto/create-search-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('search-logs')
export class SearchLogsController {
  constructor(private readonly service: SearchLogsService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateSearchLogDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  @Get(':userId')
  getByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }
}
