import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { CreateUserSubscriptionDto } from './dto/create-user-subscriptions.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscriptions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user-subscriptions')
export class UserSubscriptionsController {
  constructor(private readonly service: UserSubscriptionsService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateUserSubscriptionDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  @Get(':user_id')
  findByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.findByUserId(userId);
  }

  @Put(':user_id')
  update(
    @Req() req,
    @Body() dto: UpdateUserSubscriptionDto,
  ) {
    const userId = req.user.userId;
    return this.service.update(userId, dto);
  }

  @Delete(':user_id')
  delete(@Req() req) {
    const userId = req.user.userId;
    return this.service.delete(userId);
  }
}
