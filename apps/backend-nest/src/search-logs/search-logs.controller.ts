import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SearchLogsService } from './search-logs.service';
import { CreateSearchLogDto } from './dto/create-search-log.dto';

@Controller('search-logs')
export class SearchLogsController {
  constructor(private readonly service: SearchLogsService) {}

  @Post()
  create(@Body() dto: CreateSearchLogDto) {
    return this.service.create(dto);
  }

  @Get(':userId')
  getByUser(@Param('userId') userId: string) {
    return this.service.getByUser(userId);
  }
}
