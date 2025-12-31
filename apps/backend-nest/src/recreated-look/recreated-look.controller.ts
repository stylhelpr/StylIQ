import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RecreatedLookService } from './recreated-look.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/recreated-looks')
export class RecreatedLookController {
  constructor(private readonly recreatedLookService: RecreatedLookService) {}

  @Post()
  async saveRecreatedLook(
    @Req() req,
    @Body()
    body: { source_image_url: string; generated_outfit: any; tags?: string[] },
  ) {
    const userId = req.user.userId;
    return this.recreatedLookService.saveRecreatedLook(userId, body);
  }

  @Get()
  async getRecentRecreatedLooks(
    @Req() req,
    @Query('limit') limit = '20',
  ) {
    const userId = req.user.userId;
    return this.recreatedLookService.getRecentRecreatedLooks(
      userId,
      parseInt(limit, 10),
    );
  }

  @Patch(':lookId')
  async updateRecreatedLook(
    @Req() req,
    @Param('lookId') lookId: string,
    @Body() body: { name?: string },
  ) {
    const userId = req.user.userId;
    return this.recreatedLookService.updateRecreatedLook(userId, lookId, body.name);
  }

  @Delete(':lookId')
  async deleteRecreatedLook(
    @Req() req,
    @Param('lookId') lookId: string,
  ) {
    const userId = req.user.userId;
    return this.recreatedLookService.deleteRecreatedLook(userId, lookId);
  }
}
