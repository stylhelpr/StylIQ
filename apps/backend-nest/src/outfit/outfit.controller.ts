import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  Put,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { OutfitService } from './outfit.service';
import { SuggestOutfitDto } from './dto/suggest-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { FavoriteOutfitDto } from './dto/favorite-outfit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LearningEventsService } from '../learning/learning-events.service';
import { LEARNING_FLAGS } from '../config/feature-flags';
import type {
  LearningEventType,
  ExtractedFeatures,
} from '../learning/dto/learning-event.dto';

const HOME_SIGNAL_TYPES: Set<string> = new Set([
  'ITEM_EXPLICITLY_DISMISSED',
  'OUTFIT_SAVED_FROM_HOME',
  'SLOT_OVERRIDE',
  'STYLE_CONSTRAINT_SIGNAL',
]);

@UseGuards(JwtAuthGuard)
@Controller('outfit')
export class OutfitController {
  constructor(
    private readonly outfitService: OutfitService,
    private readonly learningEvents: LearningEventsService,
  ) {}

  @Get('custom')
  getCustomOutfits(@Req() req) {
    const userId = req.user.userId;
    return this.outfitService.getCustomOutfits(userId);
  }

  @Post('suggest')
  suggestOutfit(@Req() req, @Body() dto: Omit<SuggestOutfitDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.outfitService.suggestOutfit({ user_id, ...dto });
  }

  @Get('suggestions')
  getSuggestions(@Req() req) {
    const userId = req.user.userId;
    return this.outfitService.getSuggestions(userId);
  }

  @Post('feedback')
  submitFeedback(@Req() req, @Body() dto: Omit<OutfitFeedbackDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.outfitService.submitFeedback({ user_id, ...dto });
  }

  @Post('home-signal')
  async homeSignal(
    @Req() req,
    @Body()
    dto: {
      event_type: string;
      entity_id?: string;
      extracted_features?: ExtractedFeatures;
    },
  ) {
    if (!HOME_SIGNAL_TYPES.has(dto.event_type)) {
      throw new BadRequestException(
        `Invalid event_type: ${dto.event_type}`,
      );
    }
    if (!LEARNING_FLAGS.EVENTS_ENABLED) {
      return { status: 'learning_disabled' };
    }

    const userId = req.user.userId;
    const eventType = dto.event_type as LearningEventType;
    const { EVENT_SIGNAL_DEFAULTS } = await import(
      '../learning/dto/learning-event.dto'
    );
    const defaults = EVENT_SIGNAL_DEFAULTS[eventType];

    await this.learningEvents
      .logEvent({
        userId,
        eventType,
        entityType: 'outfit',
        entityId: dto.entity_id,
        signalPolarity: defaults.polarity,
        signalWeight: defaults.weight,
        extractedFeatures: dto.extracted_features ?? {},
        sourceFeature: 'home',
        clientEventId: `home_signal:${userId}:${eventType}:${Date.now()}`,
      })
      .catch(() => {});

    return { status: 'ok' };
  }

  @Post('favorite')
  favoriteOutfit(@Req() req, @Body() dto: Omit<FavoriteOutfitDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.outfitService.favoriteOutfit({ user_id, ...dto });
  }

  @Get('favorites/:userId')
  getFavorites(@Req() req) {
    const userId = req.user.userId;
    return this.outfitService.getFavorites(userId);
  }

  @Delete('favorite')
  unfavoriteOutfit(
    @Req() req,
    @Body() dto: Omit<FavoriteOutfitDto, 'user_id'>,
  ) {
    const user_id = req.user.userId;
    return this.outfitService.unfavoriteOutfit({ user_id, ...dto });
  }

  @Get('suggestion/:id')
  getSuggestionById(@Param('id') id: string) {
    return this.outfitService.getSuggestionById(id);
  }

  @Delete(':id')
  deleteOutfit(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.outfitService.deleteOutfit(id, userId);
  }

  @Put(':table/:id')
  updateOutfit(
    @Req() req,
    @Param('table') table: 'custom' | 'suggestions',
    @Param('id') id: string,
    @Body() body: { name?: string; occasion?: string },
  ) {
    const userId = req.user.userId;
    return this.outfitService.updateOutfit(
      table,
      id,
      userId,
      body.name,
      body.occasion,
    );
  }

  @Post('mark-worn/:outfitId/:outfitType/:userId')
  markAsWorn(
    @Req() req,
    @Param('outfitId') outfitId: string,
    @Param('outfitType') outfitType: 'custom' | 'ai',
  ) {
    const userId = req.user.userId;
    return this.outfitService.markAsWorn(outfitId, outfitType, userId);
  }

  @Delete('unmark-worn/:outfitId/:outfitType/:userId')
  unmarkWorn(
    @Req() req,
    @Param('outfitId') outfitId: string,
    @Param('outfitType') outfitType: 'custom' | 'ai',
  ) {
    const userId = req.user.userId;
    return this.outfitService.unmarkWorn(outfitId, outfitType, userId);
  }
}
