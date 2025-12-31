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
} from '@nestjs/common';
import { OutfitService } from './outfit.service';
import { SuggestOutfitDto } from './dto/suggest-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { FavoriteOutfitDto } from './dto/favorite-outfit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('outfit')
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

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
  unfavoriteOutfit(@Req() req, @Body() dto: Omit<FavoriteOutfitDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.outfitService.unfavoriteOutfit({ user_id, ...dto });
  }

  @Get('suggestion/:id')
  getSuggestionById(@Param('id') id: string) {
    return this.outfitService.getSuggestionById(id);
  }

  @Delete(':id')
  deleteOutfit(@Param('id') id: string) {
    return this.outfitService.deleteOutfit(id);
  }

  @Put(':table/:id')
  updateOutfit(
    @Param('table') table: 'custom' | 'suggestions',
    @Param('id') id: string,
    @Body() body: { name?: string; occasion?: string },
  ) {
    return this.outfitService.updateOutfit(table, id, body.name, body.occasion);
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
