// src/feedback/feedback.controller.ts
import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  private invalidOutfit(x?: string): boolean {
    if (!x) return true;
    if (x === '::' || /^:+$/.test(x)) return true;
    const parts = x.split(':');
    if (parts.length !== 3) return true;
    return parts.some((p) => !p || !p.trim());
  }

  /** strip Pinecone id suffixes like ":image" or ":text" */
  private cleanId(id?: string) {
    return String(id ?? '').split(':')[0];
  }

  @Post('rate')
  async rate(@Body() body: any, @Headers('x-user-id') userIdHdr?: string) {
    console.log('FEEDBACK /rate RAW BODY →', body);

    const user_id =
      body.user_id ?? body.userId ?? userIdHdr ?? body.uid ?? body.user ?? null;
    if (!user_id) throw new BadRequestException('user_id is required');

    // 1) start with what client sent
    let outfit_id = String(body.outfit_id ?? body.outfitId ?? '').trim();

    // 2) if invalid, try to rebuild from notes.selected_item_ids
    if (this.invalidOutfit(outfit_id) && body?.notes) {
      try {
        const n =
          typeof body.notes === 'string' ? JSON.parse(body.notes) : body.notes;
        const sel = n?.selected_item_ids || {};
        const t = this.cleanId(sel.top);
        const b = this.cleanId(sel.bottom);
        const s = this.cleanId(sel.shoes);
        outfit_id = `${t}:${b}:${s}`;
      } catch (e) {
        // ignore parse error; will fail below
      }
    }

    // 3) still invalid? reject loudly
    if (this.invalidOutfit(outfit_id)) {
      throw new BadRequestException(
        'valid outfit_id (top:bottom:shoes) is required',
      );
    }

    // 4) rating must be 'like' | 'dislike'
    let rating: 'like' | 'dislike';
    if (body.rating === 'like') rating = 'like';
    else if (body.rating === 'dislike') rating = 'dislike';
    else throw new BadRequestException("rating must be 'like' or 'dislike'");

    // 5) normalize notes to string
    const notes =
      typeof body.notes === 'string'
        ? body.notes
        : JSON.stringify(body.notes ?? {});

    return this.feedback.rate({ user_id, outfit_id, rating, notes });
  }
}

/////////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { FeedbackService } from './feedback.service';
// import { CreateFeedbackDto } from './dto/create-feedback.dto';

// @Controller('feedback')
// export class FeedbackController {
//   constructor(private readonly service: FeedbackService) {}

//   @Post('rate')
//   rate(@Body() dto: CreateFeedbackDto) {
//     return this.service.rate(dto);
//   }
// }
