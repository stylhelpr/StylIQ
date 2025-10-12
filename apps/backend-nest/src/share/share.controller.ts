import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('share')
export class ShareController {
  @Get('look/:id')
  async redirectToLook(@Param('id') id: string, @Res() res: Response) {
    // 🔗 Deep link for mobile app
    const deepLink = `stylhelpr://look/${id}`;
    // 🌐 Web fallback (your site)
    const webFallback = `https://stylhelpr.com/look/${id}`;

    // Detect if request comes from mobile browser or desktop
    const userAgent = res.req.headers['user-agent'] || '';
    const isMobile = /iPhone|Android|iPad/i.test(userAgent);

    // ✅ Redirect appropriately
    if (isMobile) {
      res.redirect(deepLink);
    } else {
      res.redirect(webFallback);
    }
  }
}
