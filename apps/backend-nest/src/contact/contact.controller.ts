// import { Body, Controller, HttpCode, Post } from '@nestjs/common';
// import { ContactDto } from './dto/contact.dto';
// import { MailerService } from './mailer.service';

// @Controller('contact')
// export class ContactController {
//   constructor(private readonly mailer: MailerService) {}

//   @Post()
//   @HttpCode(200)
//   async submit(@Body() body: ContactDto) {
//     const { name, email, topic, message } = body;
//     const subject = `Contact: ${topic || 'No topic'} from ${name}`;
//     const text = `From: ${name} <${email}>\n\n${message}`;

//     await this.mailer.send('mike@stylhelpr.com', subject, text);

//     return { ok: true };
//   }
// }

///////////////////

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  @Post()
  @HttpCode(200)
  async submit(@Body() body: ContactDto) {
    // TODO: forward to Slack, SendGrid, or DB
    // eslint-disable-next-line no-console
    console.log('[CONTACT]', new Date().toISOString(), body);
    return { ok: true };
  }
}
