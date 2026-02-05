// apps/backend-nest/src/notifications/notifications.controller.ts
import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('register')
  register(@Req() req, @Body() body: any) {
    const user_id = req.user.userId;
    return this.service.registerToken({ ...body, user_id });
  }

  @Post('preferences')
  upsertPrefs(@Req() req, @Body() body: any) {
    const user_id = req.user.userId;
    return this.service.upsertPreferences({ ...body, user_id });
  }

  @Get('preferences/get')
  getPrefs(@Req() req) {
    return this.service.getPreferences(req.user.userId);
  }

  // ── Follows ──────────────────────────────────────────────
  @Get('follows')
  getFollows(@Req() req) {
    return this.service.getFollows(req.user.userId);
  }

  @Post('follow')
  follow(@Req() req, @Body() body: { source: string }) {
    return this.service.follow(req.user.userId, body.source);
  }

  @Post('unfollow')
  unfollow(@Req() req, @Body() body: { source: string }) {
    return this.service.unfollow(req.user.userId, body.source);
  }

  // ── Test / debug ─────────────────────────────────────────
  @Post('test')
  async sendTest(@Req() req, @Body() body: any) {
    const { title, body: msgBody, data } = body;
    console.log('📤 /test called with', body);

    const res = await this.service.sendPushToUser(
      req.user.userId,
      title,
      msgBody,
      data,
    );
    console.log(`📦 test push attempted, sent=${res.sent}`);
    return { sent: res.sent, detail: res.detail ?? [] };
  }

  @Get('debug')
  debug(@Req() req) {
    return this.service.debug(req.user.userId);
  }

  @Post('save')
  async saveInboxItem(@Req() req, @Body() body: any) {
    return this.service.saveInboxItem({ ...body, user_id: req.user.userId });
  }

  @Get('inbox')
  async getInbox(@Req() req) {
    return this.service.getInboxItems(req.user.userId);
  }

  @Post('mark-read')
  async markRead(@Req() req, @Body() body: { id: string }) {
    return this.service.markRead(req.user.userId, body.id);
  }

  @Post('mark-all-read')
  async markAllRead(@Req() req) {
    return this.service.markAllRead(req.user.userId);
  }

  @Post('clear-all')
  async clearAll(@Req() req) {
    return this.service.clearAll(req.user.userId);
  }

  @Post('delete')
  async deleteItem(@Req() req, @Body() body: { id: string }) {
    return this.service.deleteItem(req.user.userId, body.id);
  }

  // Optional manual trigger to prove the full flow:
  @Post('notify/source-article')
  notifySource(
    @Body()
    body: {
      source: string;
      title: string;
      url?: string;
      image?: string;
    },
  ) {
    return this.service.notifyFollowersOfSourceArticle(body);
  }
}

///////////////////

// // apps/backend-nest/src/notifications/notifications.controller.ts
// import { Controller, Post, Body, Get, Query } from '@nestjs/common';
// import { NotificationsService } from './notifications.service';

// @Controller('notifications')
// export class NotificationsController {
//   constructor(private readonly service: NotificationsService) {}

//   @Post('register')
//   register(@Body() body: any) {
//     return this.service.registerToken(body);
//   }

//   @Post('preferences')
//   upsertPrefs(@Body() body: any) {
//     return this.service.upsertPreferences(body);
//   }

//   @Get('preferences/get')
//   getPrefs(@Query('user_id') user_id: string) {
//     return this.service.getPreferences(user_id);
//   }

//   // ── Follows ──────────────────────────────────────────────
//   @Get('follows')
//   getFollows(@Query('user_id') user_id: string) {
//     return this.service.getFollows(user_id);
//   }

//   @Post('follow')
//   follow(@Body() body: { user_id: string; source: string }) {
//     return this.service.follow(body.user_id, body.source);
//   }

//   @Post('unfollow')
//   unfollow(@Body() body: { user_id: string; source: string }) {
//     return this.service.unfollow(body.user_id, body.source);
//   }

//   // ── Test / debug ─────────────────────────────────────────
//   @Post('test')
//   async sendTest(@Body() body: any) {
//     const { user_id, title, body: msgBody, data } = body;
//     console.log('📤 /test called with', body);

//     const res = await this.service.sendPushToUser(
//       user_id,
//       title,
//       msgBody,
//       data,
//     );
//     console.log(`📦 test push attempted, sent=${res.sent}`);
//     return { sent: res.sent, detail: res.detail ?? [] };
//   }

//   @Get('debug')
//   debug(@Query('user_id') user_id?: string) {
//     return this.service.debug(user_id);
//   }

//   // Optional manual trigger to prove the full flow:
//   @Post('notify/source-article')
//   notifySource(
//     @Body()
//     body: {
//       source: string;
//       title: string;
//       url?: string;
//       image?: string;
//     },
//   ) {
//     return this.service.notifyFollowersOfSourceArticle(body);
//   }
// }
