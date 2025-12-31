import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  // Send a message
  @Post('send')
  async sendMessage(
    @Req() req,
    @Body() body: { recipientId: string; content: string },
  ) {
    const senderId = req.user.userId;
    return this.service.sendMessage(senderId, body.recipientId, body.content);
  }

  // Get messages with a specific user
  @Get('messages/:otherUserId')
  async getMessages(
    @Req() req,
    @Param('otherUserId') otherUserId: string,
    @Query('limit') limit: string = '50',
    @Query('before') before?: string,
  ) {
    const userId = req.user.userId;
    return this.service.getMessages(userId, otherUserId, parseInt(limit), before);
  }

  // Poll for new messages (used for real-time updates)
  @Get('messages/:otherUserId/new')
  async getNewMessages(
    @Req() req,
    @Param('otherUserId') otherUserId: string,
    @Query('since') since: string,
  ) {
    const userId = req.user.userId;
    return this.service.getNewMessages(userId, otherUserId, since);
  }

  // Get list of conversations
  @Get('conversations')
  async getConversations(@Req() req) {
    const userId = req.user.userId;
    return this.service.getConversations(userId);
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    const userId = req.user.userId;
    const count = await this.service.getUnreadCount(userId);
    return { count };
  }
}
