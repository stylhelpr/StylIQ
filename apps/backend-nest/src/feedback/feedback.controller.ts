import { Controller, Post, Body } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { RateFeedbackDto } from './dto/rate-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post('rate')
  async rate(@Body() dto: RateFeedbackDto) {
    return this.service.rate(dto);
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
