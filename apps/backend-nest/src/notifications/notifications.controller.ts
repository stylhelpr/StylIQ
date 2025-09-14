// apps/backend-nest/src/notifications/notifications.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.service.registerToken(body);
  }

  @Post('preferences')
  upsertPrefs(@Body() body: any) {
    return this.service.upsertPreferences(body);
  }

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

  // Quick visibility into server config & tokens
  @Get('debug')
  async debug(@Query('user_id') user_id?: string) {
    return this.service.debug(user_id);
  }
}

/////////////////////////

// import { Controller, Post, Body, Get, Query } from '@nestjs/common';
// import { NotificationsService } from './notifications.service';

// @Controller('notifications')
// export class NotificationsController {
//   constructor(private readonly service: NotificationsService) {}

//   @Post('register')
//   async register(@Body() body: any) {
//     return this.service.registerToken(body);
//   }

//   @Post('preferences')
//   upsertPrefs(@Body() body: any) {
//     return this.service.upsertPreferences(body);
//   }

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

//   // Quick visibility into server config & tokens
//   @Get('debug')
//   async debug(@Query('user_id') user_id?: string) {
//     return this.service.debug(user_id);
//   }
// }

/////////////

// import { Controller, Post, Body } from '@nestjs/common';
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
//     return { sent: res.sent, debug: res.debug ?? null };
//   }
// }

///////////////

// import { Controller, Post, Body } from '@nestjs/common';
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
//     return { sent: res.sent };
//   }
// }

////////////////

// // apps/backend-nest/src/notifications/notifications.controller.ts
// import { Controller, Post, Body } from '@nestjs/common';
// import { NotificationsService } from './notifications.service';
// import { RegisterTokenDto } from './dto/register-token.dto';
// import { fcm } from '../lib/firebase-admin';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Controller('notifications')
// export class NotificationsController {
//   notifications: any;
//   constructor(private readonly service: NotificationsService) {}

//   // Save device token
//   @Post('register')
//   register(@Body() dto: RegisterTokenDto) {
//     return this.service.registerToken(dto);
//   }

//   // Save preferences
//   @Post('preferences')
//   upsertPrefs(
//     @Body()
//     body: {
//       user_id: string;
//       push_enabled?: boolean;
//       following_realtime?: boolean;
//       brands_realtime?: boolean;
//       breaking_realtime?: boolean;
//       digest_hour?: number;
//     },
//   ) {
//     return this.service.upsertPreferences(body);
//   }

//   // Send a test push to a user (for quick verification)
//   @Post('test')
//   async sendTest(@Body() body: any) {
//     const { user_id, title, body: msgBody, data } = body;
//     console.log('📤 /test called with', body);

//     const tokens = await this.notifications.findTokensForUser(user_id);
//     console.log('📦 found tokens', tokens);

//     if (!tokens.length) return { notifications_sent: 0 };

//     const res = await fcm.sendEachForMulticast({
//       tokens: tokens.map((t) => t.token),
//       notification: { title, body: msgBody },
//       data: data ?? {},
//     });

//     console.log('📬 FCM result', res);

//     return { notifications_sent: res.successCount };
//   }

//   // Notify followers of a source when a new article is ingested (call from your feed job)
//   @Post('following/article')
//   notifyFollowers(
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

//////////////////

// // apps/backend-nest/src/notifications/notifications.controller.ts
// import { Controller, Post, Body } from '@nestjs/common';
// import { NotificationsService } from './notifications.service';
// import { RegisterTokenDto } from './dto/register-token.dto';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// @Controller('notifications')
// export class NotificationsController {
//   constructor(private readonly service: NotificationsService) {}

//   // Save device token
//   @Post('register')
//   register(@Body() dto: RegisterTokenDto) {
//     return this.service.registerToken(dto);
//   }

//   // Save preferences
//   @Post('preferences')
//   upsertPrefs(
//     @Body()
//     body: {
//       user_id: string;
//       push_enabled?: boolean;
//       following_realtime?: boolean;
//       brands_realtime?: boolean;
//       breaking_realtime?: boolean;
//       digest_hour?: number;
//     },
//   ) {
//     return this.service.upsertPreferences(body);
//   }

//   // Send a test push to a user (for quick verification)
//   @Post('test')
//   async sendTest(@Body() body) {
//     console.log('📤 /test called with', body);

//     const { user_id, title, body: msg, data } = body;

//     const tokensRes = await pool.query(
//       'SELECT token FROM push_tokens WHERE user_id=$1',
//       [user_id],
//     );
//     console.log('📦 found tokens', tokensRes.rows);

//     const tokens = tokensRes.rows.map((r) => r.token);

//     if (!tokens.length) {
//       console.warn('⚠️ No tokens found for', user_id);
//       return { sent: 0 };
//     }

//     const admin = require('firebase-admin');
//     if (!admin.apps.length) {
//       admin.initializeApp({
//         credential: admin.credential.cert(
//           require('../../firebase-service.json'),
//         ),
//       });
//     }

//     const results = await Promise.all(
//       tokens.map((t) =>
//         admin
//           .messaging()
//           .send({
//             token: t,
//             notification: { title, body: msg },
//             data: data || {},
//           })
//           .then(() => ({ token: t, status: 'sent' }))
//           .catch((e) => ({ token: t, status: 'error', error: String(e) })),
//       ),
//     );

//     console.log('📬 send results', results);

//     const successCount = results.filter((r) => r.status === 'sent').length;
//     return { sent: successCount, results };
//   }

//   // Notify followers of a source when a new article is ingested (call from your feed job)
//   @Post('following/article')
//   notifyFollowers(
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

////////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { NotificationsService } from './notifications.service';
// import { RegisterTokenDto } from './dto/register-token.dto';

// @Controller('notifications')
// export class NotificationsController {
//   constructor(private readonly service: NotificationsService) {}

//   @Post('register')
//   register(@Body() dto: RegisterTokenDto) {
//     return this.service.registerToken(dto);
//   }

//   @Post('preferences')
//   upsertPrefs(@Body() body: any) {
//     return this.service.upsertPreferences(body);
//   }
// }

///////////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { NotificationsService } from './notifications.service';
// import { RegisterTokenDto } from './dto/register-token.dto';

// @Controller('notifications')
// export class NotificationsController {
//   constructor(private readonly service: NotificationsService) {}

//   @Post('register')
//   register(@Body() dto: RegisterTokenDto) {
//     return this.service.registerToken(dto);
//   }
// }
