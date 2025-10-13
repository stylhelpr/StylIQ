import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.service.chat(dto);
  }

  @Post('suggest')
  suggest(@Body() body: any) {
    return this.service.suggest(body);
  }

  @Post('analyze')
  analyze(@Body() body: { imageUrl: string }) {
    return this.service.analyze(body.imageUrl);
  }

  @Post('recreate')
  recreate(
    @Body()
    body: {
      user_id: string;
      tags: string[];
      image_url?: string;
      user_gender?: string;
    },
  ) {
    return this.service.recreate(
      body.user_id,
      body.tags,
      body.image_url,
      body.user_gender,
    );
  }

  @Post('personalized-shop')
  personalizedShop(
    @Body() body: { user_id: string; image_url: string; gender?: string },
  ) {
    return this.service.personalizedShop(
      body.user_id,
      body.image_url,
      body.gender,
    );
  }

  @Post('similar-looks')
  async findSimilar(@Body('imageUrl') rawUrl: string) {
    if (!rawUrl) throw new Error('Missing imageUrl');
    let imageUrl = rawUrl;

    if (imageUrl.includes('_next/image') && imageUrl.includes('?url=')) {
      const extracted = decodeURIComponent(
        imageUrl.split('?url=')[1].split('&')[0],
      );
      imageUrl = extracted;
    }

    const serpUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(
      imageUrl,
    )}&hl=en&gl=us&api_key=${process.env.SERPAPI_KEY}`;

    try {
      const res = await fetch(serpUrl);
      if (!res.ok) throw new Error(`SerpAPI failed (${res.status})`);
      const json = await res.json();
      const matches =
        json?.visual_matches ||
        json?.inline_images ||
        json?.image_results ||
        [];

      if (!matches.length) return [];

      return matches.slice(0, 10).map((m: any) => ({
        title: m.title || m.source || 'Similar look',
        image: m.thumbnail || m.original || m.image,
        link: m.link || m.source,
      }));
    } catch (err: any) {
      console.error('❌ [AI] similar-looks error:', err.message);
      return [];
    }
  }

  /* 🧾 Decode Barcode — Fastify-safe version (no Multer) */
  @Post('decode-barcode')
  async decodeBarcode(
    @Req() req: FastifyRequest & { file: () => Promise<any> },
  ) {
    const mp = await (req as any).file?.(); // ✅ Safely call file()
    if (!mp) throw new BadRequestException('No file uploaded');

    const chunks: Buffer[] = [];
    for await (const chunk of mp.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    return this.service.decodeBarcode({
      originalname: mp.filename,
      mimetype: mp.mimetype,
      buffer,
    } as any);
  }

  @Post('lookup-barcode')
  async lookupBarcode(@Body('upc') upc: string) {
    if (!upc) throw new Error('Missing UPC');
    return this.service.lookupProductByBarcode(upc);
  }
}

//////////////////

// import {
//   Controller,
//   Post,
//   Body,
//   Req,
//   BadRequestException,
// } from '@nestjs/common';
// import { FastifyRequest } from 'fastify';
// import { AiService } from './ai.service';
// import { ChatDto } from './dto/chat.dto';

// @Controller('ai')
// export class AiController {
//   constructor(private readonly service: AiService) {}

//   @Post('chat')
//   chat(@Body() dto: ChatDto) {
//     return this.service.chat(dto);
//   }

//   @Post('suggest')
//   suggest(@Body() body: any) {
//     return this.service.suggest(body);
//   }

//   @Post('analyze')
//   analyze(@Body() body: { imageUrl: string }) {
//     return this.service.analyze(body.imageUrl);
//   }

//   @Post('recreate')
//   recreate(
//     @Body()
//     body: {
//       user_id: string;
//       tags: string[];
//       image_url?: string;
//       user_gender?: string;
//     },
//   ) {
//     return this.service.recreate(
//       body.user_id,
//       body.tags,
//       body.image_url,
//       body.user_gender,
//     );
//   }

//   @Post('personalized-shop')
//   personalizedShop(
//     @Body() body: { user_id: string; image_url: string; gender?: string },
//   ) {
//     return this.service.personalizedShop(
//       body.user_id,
//       body.image_url,
//       body.gender,
//     );
//   }

//   @Post('similar-looks')
//   async findSimilar(@Body('imageUrl') rawUrl: string) {
//     if (!rawUrl) throw new Error('Missing imageUrl');
//     let imageUrl = rawUrl;

//     if (imageUrl.includes('_next/image') && imageUrl.includes('?url=')) {
//       const extracted = decodeURIComponent(
//         imageUrl.split('?url=')[1].split('&')[0],
//       );
//       imageUrl = extracted;
//     }

//     const serpUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(
//       imageUrl,
//     )}&hl=en&gl=us&api_key=${process.env.SERPAPI_KEY}`;

//     try {
//       const res = await fetch(serpUrl);
//       if (!res.ok) throw new Error(`SerpAPI failed (${res.status})`);
//       const json = await res.json();
//       const matches =
//         json?.visual_matches ||
//         json?.inline_images ||
//         json?.image_results ||
//         [];

//       if (!matches.length) return [];

//       return matches.slice(0, 10).map((m: any) => ({
//         title: m.title || m.source || 'Similar look',
//         image: m.thumbnail || m.original || m.image,
//         link: m.link || m.source,
//       }));
//     } catch (err: any) {
//       console.error('❌ [AI] similar-looks error:', err.message);
//       return [];
//     }
//   }

//   /* 🧾 Decode Barcode — Fastify-safe version (no Multer) */
//   @Post('decode-barcode')
//   async decodeBarcode(
//     @Req() req: FastifyRequest & { file: () => Promise<any> },
//   ) {
//     const mp = await (req as any).file?.(); // ✅ Safely call file()
//     if (!mp) throw new BadRequestException('No file uploaded');

//     const chunks: Buffer[] = [];
//     for await (const chunk of mp.file) chunks.push(chunk);
//     const buffer = Buffer.concat(chunks);

//     return this.service.decodeBarcode({
//       originalname: mp.filename,
//       mimetype: mp.mimetype,
//       buffer,
//     } as any);
//   }

//   @Post('lookup-barcode')
//   async lookupBarcode(@Body('upc') upc: string) {
//     if (!upc) throw new BadRequestException('Missing UPC');
//     return this.service.lookupProductByBarcode(upc);
//   }
// }

/////////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { AiService } from './ai.service';
// import { ChatDto } from './dto/chat.dto';

// @Controller('ai')
// export class AiController {
//   constructor(private readonly service: AiService) {}

//   @Post('chat')
//   chat(@Body() dto: ChatDto) {
//     return this.service.chat(dto);
//   }

//   // 🧠 New endpoint for AI stylist suggestions
//   @Post('suggest')
//   suggest(@Body() body: any) {
//     return this.service.suggest(body);
//   }

//   // 🧠 Analyze and Recreate endpoints for Inspiration Hub
//   @Post('analyze')
//   analyze(@Body() body: { imageUrl: string }) {
//     return this.service.analyze(body.imageUrl);
//   }

//   @Post('recreate')
//   recreate(
//     @Body()
//     body: {
//       user_id: string;
//       tags: string[];
//       image_url?: string;
//       user_gender?: string; // ✅ add gender param
//     },
//   ) {
//     // ✅ now pass it through
//     return this.service.recreate(
//       body.user_id,
//       body.tags,
//       body.image_url,
//       body.user_gender,
//     );
//   }

//   @Post('personalized-shop')
//   personalizedShop(
//     @Body() body: { user_id: string; image_url: string; gender?: string },
//   ) {
//     return this.service.personalizedShop(
//       body.user_id,
//       body.image_url,
//       body.gender,
//     );
//   }

//   @Post('similar-looks')
//   async findSimilar(@Body('imageUrl') rawUrl: string) {
//     if (!rawUrl) throw new Error('Missing imageUrl');

//     // 🧼 Clean _next/image URLs → extract the real image
//     let imageUrl = rawUrl;
//     if (imageUrl.includes('_next/image') && imageUrl.includes('?url=')) {
//       const extracted = decodeURIComponent(
//         imageUrl.split('?url=')[1].split('&')[0],
//       );
//       imageUrl = extracted;
//     }

//     const serpUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(
//       imageUrl,
//     )}&hl=en&gl=us&api_key=${process.env.SERPAPI_KEY}`;

//     try {
//       const res = await fetch(serpUrl);
//       if (!res.ok) throw new Error(`SerpAPI failed (${res.status})`);
//       const json = await res.json();

//       const matches =
//         json?.visual_matches ||
//         json?.inline_images ||
//         json?.image_results ||
//         [];

//       if (!matches.length) {
//         console.warn('⚠️ [AI] No visual matches found for', imageUrl);
//         return [];
//       }

//       return matches.slice(0, 10).map((m: any) => ({
//         title: m.title || m.source || 'Similar look',
//         image: m.thumbnail || m.original || m.image,
//         link: m.link || m.source,
//       }));
//     } catch (err: any) {
//       console.error('❌ [AI] similar-looks error:', err.message);
//       return [];
//     }
//   }
// }
