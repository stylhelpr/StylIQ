import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('register')
  register(@Body() dto: RegisterTokenDto) {
    return this.service.registerToken(dto);
  }
}
