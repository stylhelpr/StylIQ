import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  Put,
} from '@nestjs/common';
import { OutfitService } from './outfit.service';
import { SuggestOutfitDto } from './dto/suggest-outfit.dto';
import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
import { FavoriteOutfitDto } from './dto/favorite-outfit.dto';

@Controller('outfit')
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  @Get('custom/:userId')
  getCustomOutfits(@Param('userId') userId: string) {
    return this.outfitService.getCustomOutfits(userId);
  }

  @Post('suggest')
  suggestOutfit(@Body() dto: SuggestOutfitDto) {
    return this.outfitService.suggestOutfit(dto);
  }

  @Get('suggestions/:userId')
  getSuggestions(@Param('userId') userId: string) {
    return this.outfitService.getSuggestions(userId);
  }

  @Post('feedback')
  submitFeedback(@Body() dto: OutfitFeedbackDto) {
    return this.outfitService.submitFeedback(dto);
  }

  @Post('favorite')
  favoriteOutfit(@Body() dto: FavoriteOutfitDto) {
    return this.outfitService.favoriteOutfit(dto);
  }

  @Get('favorites/:userId')
  getFavorites(@Param('userId') userId: string) {
    return this.outfitService.getFavorites(userId);
  }

  @Delete('favorite')
  unfavoriteOutfit(@Body() dto: FavoriteOutfitDto) {
    return this.outfitService.unfavoriteOutfit(dto);
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
  updateOutfitName(
    @Param('table') table: 'custom' | 'suggestions',
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    return this.outfitService.updateOutfitName(table, id, body.name);
  }
}

//////////

// import { Controller, Post, Get, Param, Body, Delete } from '@nestjs/common';
// import { OutfitService } from './outfit.service';
// import { SuggestOutfitDto } from './dto/suggest-outfit.dto';
// import { OutfitFeedbackDto } from './dto/outfit-feedback.dto';
// import { FavoriteOutfitDto } from './dto/favorite-outfit.dto';

// @Controller('outfit')
// export class OutfitController {
//   constructor(private readonly outfitService: OutfitService) {}

//   @Post('suggest')
//   suggestOutfit(@Body() dto: SuggestOutfitDto) {
//     return this.outfitService.suggestOutfit(dto);
//   }

//   @Get('suggestions/:userId')
//   getSuggestions(@Param('userId') userId: string) {
//     return this.outfitService.getSuggestions(userId);
//   }

//   @Post('feedback')
//   submitFeedback(@Body() dto: OutfitFeedbackDto) {
//     return this.outfitService.submitFeedback(dto);
//   }

//   @Post('favorite')
//   favoriteOutfit(@Body() dto: FavoriteOutfitDto) {
//     return this.outfitService.favoriteOutfit(dto);
//   }

//   @Get('favorites/:userId')
//   getFavorites(@Param('userId') userId: string) {
//     return this.outfitService.getFavorites(userId);
//   }

//   @Delete('favorite')
//   unfavoriteOutfit(@Body() dto: FavoriteOutfitDto) {
//     return this.outfitService.unfavoriteOutfit(dto);
//   }

//   @Get('suggestion/:id')
//   getSuggestionById(@Param('id') id: string) {
//     return this.outfitService.getSuggestionById(id);
//   }
// }
