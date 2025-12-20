import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Controller('messaging')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  // Send a message
  @Post('send')
  async sendMessage(
    @Body() body: { senderId: string; recipientId: string; content: string },
  ) {
    return this.service.sendMessage(body.senderId, body.recipientId, body.content);
  }

  // Get messages with a specific user
  @Get('messages/:otherUserId')
  async getMessages(
    @Param('otherUserId') otherUserId: string,
    @Query('userId') userId: string,
    @Query('limit') limit: string = '50',
    @Query('before') before?: string,
  ) {
    return this.service.getMessages(userId, otherUserId, parseInt(limit), before);
  }

  // Poll for new messages (used for real-time updates)
  @Get('messages/:otherUserId/new')
  async getNewMessages(
    @Param('otherUserId') otherUserId: string,
    @Query('userId') userId: string,
    @Query('since') since: string,
  ) {
    return this.service.getNewMessages(userId, otherUserId, since);
  }

  // Get list of conversations
  @Get('conversations')
  async getConversations(@Query('userId') userId: string) {
    return this.service.getConversations(userId);
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@Query('userId') userId: string) {
    const count = await this.service.getUnreadCount(userId);
    return { count };
  }
}
