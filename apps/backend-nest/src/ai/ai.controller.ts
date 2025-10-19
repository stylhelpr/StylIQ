import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { Delete, Param } from '@nestjs/common';
import { Readable } from 'stream';

@Controller('ai')
export class AiController {
  aiService: any;
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

      return matches.slice(0, 12).map((m: any) => {
        // 🏷️ Normalize Price
        let price: string | null = null;

        if (m.price) {
          if (typeof m.price === 'string') {
            price = m.price;
          } else if (typeof m.price === 'object') {
            const val = m.price.value || m.price.extracted_value;
            const cur = m.price.currency || '';
            if (val) {
              const hasSymbol =
                typeof val === 'string' && val.trim().startsWith('$');
              price = hasSymbol
                ? val
                : `${cur && !val.toString().includes(cur) ? cur : ''}${val}`;
            }
          }
        } else if (m.priceText) {
          price = m.priceText;
        }

        // ✅ Cleanup duplicate or malformed symbols
        if (price) {
          price = price
            .replace(/\*/g, '') // ← removes all asterisks
            .replace(/\s+/g, ' ')
            .replace(/^\$\$/, '$')
            .replace(/^(\$ )/, '$')
            .trim();
        }

        // 🏢 Normalize brand/source
        const link = m.link || m.source || '';
        const hostname = (() => {
          try {
            return link ? new URL(link).hostname.replace(/^www\./, '') : '';
          } catch {
            return '';
          }
        })();

        const brand =
          m.merchant ||
          m.store ||
          m.source ||
          (hostname ? hostname.split('.')[0].toUpperCase() : 'Online Store');

        return {
          title: m.title || m.source || 'Similar Look',
          image: m.thumbnail || m.original || m.image,
          link,
          brand,
          price,
          source: hostname || brand,
        };
      });
    } catch (err: any) {
      console.error('❌ [AI] similar-looks error:', err.message);
      return [];
    }
  }

  /* 🧾 Decode Barcode or Clothing Label */
  @Post('decode-barcode')
  async decodeBarcode(
    @Req() req: FastifyRequest & { file: () => Promise<any> },
  ) {
    const mp = await (req as any).file?.();
    if (!mp) throw new BadRequestException('No file uploaded');

    const chunks: Buffer[] = [];
    for await (const chunk of mp.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const result = await this.service.decodeBarcode({
      originalname: mp.filename,
      mimetype: mp.mimetype,
      buffer,
    } as any);

    return { success: true, ...result };
  }

  /* 🔍 Lookup product details by barcode */
  @Post('lookup-barcode')
  async lookupBarcode(@Body('upc') upc: string) {
    if (!upc) throw new BadRequestException('Missing UPC');
    return this.service.lookupProductByBarcode(upc);
  }

  @Delete('chat/clear/:user_id')
  async clearChat(@Param('user_id') user_id: string) {
    return this.service.clearChatHistory(user_id);
  }

  /* 🧹 Soft reset (keep long-term memory but remove short-term messages) */
  @Delete('chat/soft-reset/:user_id')
  async softReset(@Param('user_id') user_id: string) {
    return this.service.softResetChat(user_id);
  }

  /* 🔊 Text-to-Speech — returns MP3 buffer (Alloy voice) */
  @Post('tts')
  async textToSpeech(@Body('text') text: string, @Res() res: any) {
    if (!text) throw new BadRequestException('Missing text');
    try {
      const buffer = await this.service.generateSpeechBuffer(text);

      res.raw.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
      });
      res.raw.end(buffer);
    } catch (err: any) {
      console.error('❌ [AI Controller] TTS error stack:', err);
      const fallback = Buffer.from([0x49, 0x44, 0x33]); // "ID3"
      res.raw.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallback.length,
      });
      res.raw.end(fallback);
    }
  }

  // @Get('tts')
  // async textToSpeechGet(@Query('text') text: string, @Res() res: any) {
  //   if (!text) throw new BadRequestException('Missing text');
  //   const buffer = await this.service.generateSpeechBuffer(text);
  //   res.raw.writeHead(200, {
  //     'Content-Type': 'audio/mpeg',
  //     'Content-Length': buffer.length,
  //   });
  //   res.raw.end(buffer);
  // }

  @Get('tts')
  async streamTts(@Query('text') text: string, @Res() res: any) {
    if (!text?.trim()) throw new BadRequestException('Missing text');

    try {
      console.log('🟡 [TTS] Generating speech stream for text:', text);
      const webStream = await this.service.generateSpeechStream(text);
      console.log('🟢 [TTS] Stream response type:', typeof webStream);

      if (!webStream) {
        console.error('❌ [TTS] No stream returned from service');
        res.raw.writeHead(500);
        res.raw.end('No stream returned');
        return;
      }

      const nodeStream = Readable.fromWeb(webStream as any);

      res.raw.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      nodeStream.on('data', (chunk: Buffer) => {
        res.raw.write(chunk);
        if (res.raw.flush) res.raw.flush();
      });

      nodeStream.on('end', () => {
        res.raw.end();
        console.log('✅ [TTS] Stream finished');
      });

      nodeStream.on('error', (err: any) => {
        console.error('❌ [TTS] Node stream error:', err);
        if (!res.raw.headersSent) res.raw.writeHead(500);
        res.raw.end();
      });
    } catch (err: any) {
      console.error('❌ [AI Controller] TTS stream error:', err);
      if (!res.raw.headersSent) {
        res.raw.writeHead(500);
        res.raw.end();
      }
    }
  }
}

///////////////////

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
// import { Delete, Param } from '@nestjs/common';

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

//       return matches.slice(0, 12).map((m: any) => {
//         // 🏷️ Normalize Price
//         let price: string | null = null;

//         if (m.price) {
//           if (typeof m.price === 'string') {
//             price = m.price;
//           } else if (typeof m.price === 'object') {
//             const val = m.price.value || m.price.extracted_value;
//             const cur = m.price.currency || '';
//             if (val) {
//               const hasSymbol =
//                 typeof val === 'string' && val.trim().startsWith('$');
//               price = hasSymbol
//                 ? val
//                 : `${cur && !val.toString().includes(cur) ? cur : ''}${val}`;
//             }
//           }
//         } else if (m.priceText) {
//           price = m.priceText;
//         }

//         // ✅ Cleanup duplicate or malformed symbols
//         if (price) {
//           price = price
//             .replace(/\*/g, '') // ← removes all asterisks
//             .replace(/\s+/g, ' ')
//             .replace(/^\$\$/, '$')
//             .replace(/^(\$ )/, '$')
//             .trim();
//         }

//         // 🏢 Normalize brand/source
//         const link = m.link || m.source || '';
//         const hostname = (() => {
//           try {
//             return link ? new URL(link).hostname.replace(/^www\./, '') : '';
//           } catch {
//             return '';
//           }
//         })();

//         const brand =
//           m.merchant ||
//           m.store ||
//           m.source ||
//           (hostname ? hostname.split('.')[0].toUpperCase() : 'Online Store');

//         return {
//           title: m.title || m.source || 'Similar Look',
//           image: m.thumbnail || m.original || m.image,
//           link,
//           brand,
//           price,
//           source: hostname || brand,
//         };
//       });
//     } catch (err: any) {
//       console.error('❌ [AI] similar-looks error:', err.message);
//       return [];
//     }
//   }

//   /* 🧾 Decode Barcode or Clothing Label */
//   @Post('decode-barcode')
//   async decodeBarcode(
//     @Req() req: FastifyRequest & { file: () => Promise<any> },
//   ) {
//     const mp = await (req as any).file?.();
//     if (!mp) throw new BadRequestException('No file uploaded');

//     const chunks: Buffer[] = [];
//     for await (const chunk of mp.file) chunks.push(chunk);
//     const buffer = Buffer.concat(chunks);

//     const result = await this.service.decodeBarcode({
//       originalname: mp.filename,
//       mimetype: mp.mimetype,
//       buffer,
//     } as any);

//     return { success: true, ...result };
//   }

//   /* 🔍 Lookup product details by barcode */
//   @Post('lookup-barcode')
//   async lookupBarcode(@Body('upc') upc: string) {
//     if (!upc) throw new BadRequestException('Missing UPC');
//     return this.service.lookupProductByBarcode(upc);
//   }

//   @Delete('chat/clear/:user_id')
//   async clearChat(@Param('user_id') user_id: string) {
//     return this.service.clearChatHistory(user_id);
//   }

//   /* 🧹 Soft reset (keep long-term memory but remove short-term messages) */
//   @Delete('chat/soft-reset/:user_id')
//   async softReset(@Param('user_id') user_id: string) {
//     return this.service.softResetChat(user_id);
//   }
// }

//////////////////////

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

//   // @Post('similar-looks')
//   // async findSimilar(@Body('imageUrl') rawUrl: string) {
//   //   if (!rawUrl) throw new Error('Missing imageUrl');
//   //   let imageUrl = rawUrl;

//   //   if (imageUrl.includes('_next/image') && imageUrl.includes('?url=')) {
//   //     const extracted = decodeURIComponent(
//   //       imageUrl.split('?url=')[1].split('&')[0],
//   //     );
//   //     imageUrl = extracted;
//   //   }

//   //   const serpUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(
//   //     imageUrl,
//   //   )}&hl=en&gl=us&api_key=${process.env.SERPAPI_KEY}`;

//   //   try {
//   //     const res = await fetch(serpUrl);
//   //     if (!res.ok) throw new Error(`SerpAPI failed (${res.status})`);
//   //     const json = await res.json();
//   //     const matches =
//   //       json?.visual_matches ||
//   //       json?.inline_images ||
//   //       json?.image_results ||
//   //       [];

//   //     if (!matches.length) return [];

//   //     return matches.slice(0, 10).map((m: any) => ({
//   //       title: m.title || m.source || 'Similar look',
//   //       image: m.thumbnail || m.original || m.image,
//   //       link: m.link || m.source,
//   //     }));
//   //   } catch (err: any) {
//   //     console.error('❌ [AI] similar-looks error:', err.message);
//   //     return [];
//   //   }
//   // }

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

//       return matches.slice(0, 12).map((m: any) => {
//         // 🏷️ Normalize Price
//         let price: string | null = null;

//         if (m.price) {
//           if (typeof m.price === 'string') {
//             price = m.price;
//           } else if (typeof m.price === 'object') {
//             const val = m.price.value || m.price.extracted_value;
//             const cur = m.price.currency || '';
//             if (val) {
//               const hasSymbol =
//                 typeof val === 'string' && val.trim().startsWith('$');
//               price = hasSymbol
//                 ? val
//                 : `${cur && !val.toString().includes(cur) ? cur : ''}${val}`;
//             }
//           }
//         } else if (m.priceText) {
//           price = m.priceText;
//         }

//         // ✅ Cleanup duplicate or malformed symbols
//         if (price) {
//           price = price
//             .replace(/\*/g, '') // ← removes all asterisks
//             .replace(/\s+/g, ' ')
//             .replace(/^\$\$/, '$')
//             .replace(/^(\$ )/, '$')
//             .trim();
//         }

//         // 🏢 Normalize brand/source
//         const link = m.link || m.source || '';
//         const hostname = (() => {
//           try {
//             return link ? new URL(link).hostname.replace(/^www\./, '') : '';
//           } catch {
//             return '';
//           }
//         })();

//         const brand =
//           m.merchant ||
//           m.store ||
//           m.source ||
//           (hostname ? hostname.split('.')[0].toUpperCase() : 'Online Store');

//         return {
//           title: m.title || m.source || 'Similar Look',
//           image: m.thumbnail || m.original || m.image,
//           link,
//           brand,
//           price,
//           source: hostname || brand,
//         };
//       });
//     } catch (err: any) {
//       console.error('❌ [AI] similar-looks error:', err.message);
//       return [];
//     }
//   }

//   /* 🧾 Decode Barcode or Clothing Label */
//   @Post('decode-barcode')
//   async decodeBarcode(
//     @Req() req: FastifyRequest & { file: () => Promise<any> },
//   ) {
//     const mp = await (req as any).file?.();
//     if (!mp) throw new BadRequestException('No file uploaded');

//     const chunks: Buffer[] = [];
//     for await (const chunk of mp.file) chunks.push(chunk);
//     const buffer = Buffer.concat(chunks);

//     const result = await this.service.decodeBarcode({
//       originalname: mp.filename,
//       mimetype: mp.mimetype,
//       buffer,
//     } as any);

//     return { success: true, ...result };
//   }

//   /* 🔍 Lookup product details by barcode */
//   @Post('lookup-barcode')
//   async lookupBarcode(@Body('upc') upc: string) {
//     if (!upc) throw new BadRequestException('Missing UPC');
//     return this.service.lookupProductByBarcode(upc);
//   }
// }

///////////////////

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
//     if (!upc) throw new Error('Missing UPC');
//     return this.service.lookupProductByBarcode(upc);
//   }
// }

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
