import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { RateFeedbackDto } from './dto/rate-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post('rate')
  async rate(@Req() req, @Body() dto: Omit<RateFeedbackDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.rate({ user_id, ...dto });
  }
}

/////////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { FeedbackService } from './feedback.service';
// import { CreateFeedbackDto } from './dto/create-feedback.dto';

// @Controller('feedback')
// export class FeedbackController {
//   constructor(private readonly service: FeedbackService) {}

//   @Post('rate')
//   rate(@Body() dto: CreateFeedbackDto) {
//     return this.service.rate(dto);
//   }
// }
