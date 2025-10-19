import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { CreateUserSubscriptionDto } from './dto/create-user-subscriptions.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user-subscriptions.dto';

@Controller('user-subscriptions')
export class UserSubscriptionsController {
  constructor(private readonly service: UserSubscriptionsService) {}

  @Post()
  create(@Body() dto: CreateUserSubscriptionDto) {
    return this.service.create(dto);
  }

  @Get(':user_id')
  findByUser(@Param('user_id') userId: string) {
    return this.service.findByUserId(userId);
  }

  @Put(':user_id')
  update(
    @Param('user_id') userId: string,
    @Body() dto: UpdateUserSubscriptionDto,
  ) {
    return this.service.update(userId, dto);
  }

  @Delete(':user_id')
  delete(@Param('user_id') userId: string) {
    return this.service.delete(userId);
  }
}
