import { Controller, Post, Body, Req } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async upsertUser(@Req() req, @Body() body) {
    const sub = req.user.sub;
    return this.usersService.upsertUser(sub, body);
  }
}
