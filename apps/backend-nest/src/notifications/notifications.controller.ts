// apps/backend-nest/src/notifications/notifications.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.service.registerToken(body);
  }

  @Post('preferences')
  upsertPrefs(@Body() body: any) {
    return this.service.upsertPreferences(body);
  }

  @Get('preferences/get')
  getPrefs(@Query('user_id') user_id: string) {
    return this.service.getPreferences(user_id);
  }

  // ── Follows ──────────────────────────────────────────────
  @Get('follows')
  getFollows(@Query('user_id') user_id: string) {
    return this.service.getFollows(user_id);
  }

  @Post('follow')
  follow(@Body() body: { user_id: string; source: string }) {
    return this.service.follow(body.user_id, body.source);
  }

  @Post('unfollow')
  unfollow(@Body() body: { user_id: string; source: string }) {
    return this.service.unfollow(body.user_id, body.source);
  }

  // ── Test / debug ─────────────────────────────────────────
  @Post('test')
  async sendTest(@Body() body: any) {
    const { user_id, title, body: msgBody, data } = body;
    console.log('📤 /test called with', body);

    const res = await this.service.sendPushToUser(
      user_id,
      title,
      msgBody,
      data,
    );
    console.log(`📦 test push attempted, sent=${res.sent}`);
    return { sent: res.sent, detail: res.detail ?? [] };
  }

  @Get('debug')
  debug(@Query('user_id') user_id?: string) {
    return this.service.debug(user_id);
  }

  @Post('save')
  async saveInboxItem(@Body() body: any) {
    return this.service.saveInboxItem(body);
  }

  @Get('inbox')
  async getInbox(@Query('user_id') user_id: string) {
    return this.service.getInboxItems(user_id);
  }

  @Post('mark-read')
  async markRead(@Body() body: { user_id: string; id: string }) {
    return this.service.markRead(body.user_id, body.id);
  }

  @Post('mark-all-read')
  async markAllRead(@Body() body: { user_id: string }) {
    return this.service.markAllRead(body.user_id);
  }

  @Post('clear-all')
  async clearAll(@Body() body: { user_id: string }) {
    return this.service.clearAll(body.user_id);
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
