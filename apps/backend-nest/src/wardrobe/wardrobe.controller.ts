// apps/backend-nest/src/wardrobe/wardrobe.controller.ts

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { DeleteItemDto } from './dto/delete-item.dto';
import { VertexService } from '../vertex/vertex.service';
import {
  AnalyzeImageRequestDto,
  AnalyzeImageResponseDto,
} from './dto/analyze-image.dto';

// ─────────────────────────────────────────────────────────────
// Normalizer: coerce whatever the client sends into UserStyle
// ─────────────────────────────────────────────────────────────
function normalizeUserStyle(
  input: any,
): import('./logic/style').UserStyle | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const asArr = (v: any) =>
    Array.isArray(v)
      ? v
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
  const lc = (v: any) =>
    v == null ? undefined : String(v).trim().toLowerCase();

  const out: import('./logic/style').UserStyle = {};

  const preferredColors = asArr(input.preferredColors ?? input.favorite_colors);
  const avoidColors = asArr(input.avoidColors);
  const preferredCategories = asArr(input.preferredCategories);
  const avoidSubcategories = asArr(
    input.avoidSubcategories ?? input.disliked_styles,
  );
  const favoriteBrands = asArr(input.favoriteBrands ?? input.preferred_brands);

  if (preferredColors?.length) out.preferredColors = preferredColors;
  if (avoidColors?.length) out.avoidColors = avoidColors;
  if (preferredCategories?.length)
    out.preferredCategories = preferredCategories;
  if (avoidSubcategories?.length) out.avoidSubcategories = avoidSubcategories;
  if (favoriteBrands?.length) out.favoriteBrands = favoriteBrands;

  // Pass through dressBias if provided (already correct union on the type)
  if (input.dressBias) out.dressBias = input.dressBias;

  return Object.keys(out).length ? out : undefined;
}

@Controller('wardrobe')
export class WardrobeController {
  constructor(
    private readonly service: WardrobeService,
    private readonly vertex: VertexService,
  ) {}

  @Post()
  create(@Body() dto: CreateWardrobeItemDto) {
    return this.service.createItem(dto);
  }

  @Get(':user_id')
  getByUser(@Param('user_id') userId: string) {
    return this.service.getItemsByUser(userId);
  }

  @Get()
  getByUserQuery(@Query('user_id') userId: string) {
    return this.service.getItemsByUser(userId);
  }

  @Put(':item_id')
  update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete()
  delete(@Body() dto: DeleteItemDto) {
    return this.service.deleteItem(dto);
  }

  // ------- Vector search / outfits (existing) -------
  @Post('suggest')
  suggest(@Body() body: { user_id: string; queryVec: number[] }) {
    return this.service.suggestOutfits(body.user_id, body.queryVec);
  }

  @Post('search-text')
  searchText(@Body() b: { user_id: string; q: string; topK?: number }) {
    return this.service.searchText(b.user_id, b.q, b.topK);
  }

  @Post('search-image')
  searchImage(@Body() b: { user_id: string; gcs_uri: string; topK?: number }) {
    return this.service.searchImage(b.user_id, b.gcs_uri, b.topK);
  }

  @Post('search-hybrid')
  searchHybrid(
    @Body() b: { user_id: string; q?: string; gcs_uri?: string; topK?: number },
  ) {
    return this.service.searchHybrid(b.user_id, b.q, b.gcs_uri, b.topK);
  }

  // ------- Outfit generation -------
  @Post('outfits')
  generateOutfits(
    @Body()
    body: {
      user_id: string;
      query: string;
      topK?: number;
      style_profile?: any; // accept any; we normalize
      weather?: import('./logic/weather').WeatherContext;
      useWeather?: boolean;
      weights?: import('./logic/scoring').ContextWeights;
    },
  ) {
    const weatherArg = body.useWeather === false ? undefined : body.weather;

    // Normalize the style no matter what the client sends
    const userStyle = normalizeUserStyle(body.style_profile);

    // Debug so you can see exactly what’s coming in
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CTRL] raw style_profile =', body.style_profile);
    }

    return this.service.generateOutfits(
      body.user_id,
      body.query,
      body.topK || 5,
      {
        userStyle,
        weather: weatherArg,
        weights: body.weights,
        useWeather: body.useWeather ?? true, // forward the toggle
      },
    );
  }

  // ------- NEW: AI endpoints -------
  @Post('analyze')
  async analyze(
    @Body() dto: AnalyzeImageRequestDto,
  ): Promise<AnalyzeImageResponseDto> {
    const draft = await this.vertex.analyzeImage(dto.gsutil_uri, {
      dressCode: dto.dressCode,
      season: dto.season,
    });
    return { draft };
  }

  @Post('auto-create')
  async autoCreate(
    @Body()
    dto: Partial<CreateWardrobeItemDto> & {
      user_id: string;
      image_url: string;
      gsutil_uri?: string;
      name?: string;
    },
  ) {
    const draft = dto.gsutil_uri
      ? await this.vertex.analyzeImage(dto.gsutil_uri)
      : {};
    const payload: CreateWardrobeItemDto = this.service.composeFromAiDraft(
      dto as any,
      draft,
    );
    return this.service.createItem(payload);
  }
}

////////////////

// // apps/backend-nest/src/wardrobe/wardrobe.controller.ts

// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Param,
//   Delete,
//   Put,
//   Query,
// } from '@nestjs/common';
// import { WardrobeService } from './wardrobe.service';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { VertexService } from '../vertex/vertex.service';
// import {
//   AnalyzeImageRequestDto,
//   AnalyzeImageResponseDto,
// } from './dto/analyze-image.dto';

// // ─────────────────────────────────────────────────────────────
// // Normalizer: coerce whatever the client sends into UserStyle
// // ─────────────────────────────────────────────────────────────
// function normalizeUserStyle(
//   input: any,
// ): import('./logic/style').UserStyle | undefined {
//   if (!input || typeof input !== 'object') return undefined;

//   const asArr = (v: any) =>
//     Array.isArray(v)
//       ? v
//           .map(String)
//           .map((s) => s.trim())
//           .filter(Boolean)
//       : undefined;
//   const lc = (v: any) =>
//     v == null ? undefined : String(v).trim().toLowerCase();

//   // Accept many field names for gender; coerce to 'male' | 'female'
//   const gRaw =
//     input.genderPresentation ??
//     input.gender_presentation ??
//     input.gender_presentation_label ??
//     input.gender ??
//     input.sex ??
//     input.preferred_gender ??
//     input.preferredGender;

//   let genderPresentation: 'male' | 'female' | undefined;
//   if (gRaw) {
//     const g = lc(gRaw)!;
//     if (g.startsWith('m')) genderPresentation = 'male';
//     else if (g.startsWith('f')) genderPresentation = 'female';
//   }

//   const out: import('./logic/style').UserStyle = {};

//   const preferredColors = asArr(input.preferredColors ?? input.favorite_colors);
//   const avoidColors = asArr(input.avoidColors);
//   const preferredCategories = asArr(input.preferredCategories);
//   const avoidSubcategories = asArr(
//     input.avoidSubcategories ?? input.disliked_styles,
//   );
//   const favoriteBrands = asArr(input.favoriteBrands ?? input.preferred_brands);

//   if (preferredColors?.length) out.preferredColors = preferredColors;
//   if (avoidColors?.length) out.avoidColors = avoidColors;
//   if (preferredCategories?.length)
//     out.preferredCategories = preferredCategories;
//   if (avoidSubcategories?.length) out.avoidSubcategories = avoidSubcategories;
//   if (favoriteBrands?.length) out.favoriteBrands = favoriteBrands;

//   // Pass through dressBias if provided (already correct union on the type)
//   if (input.dressBias) out.dressBias = input.dressBias;

//   if (genderPresentation) out.genderPresentation = genderPresentation;

//   return Object.keys(out).length ? out : undefined;
// }

// @Controller('wardrobe')
// export class WardrobeController {
//   constructor(
//     private readonly service: WardrobeService,
//     private readonly vertex: VertexService,
//   ) {}

//   @Post()
//   create(@Body() dto: CreateWardrobeItemDto) {
//     return this.service.createItem(dto);
//   }

//   @Get(':user_id')
//   getByUser(@Param('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Get()
//   getByUserQuery(@Query('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Put(':item_id')
//   update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
//     return this.service.updateItem(itemId, dto);
//   }

//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     return this.service.deleteItem(dto);
//   }

//   // ------- Vector search / outfits (existing) -------
//   @Post('suggest')
//   suggest(@Body() body: { user_id: string; queryVec: number[] }) {
//     return this.service.suggestOutfits(body.user_id, body.queryVec);
//   }

//   @Post('search-text')
//   searchText(@Body() b: { user_id: string; q: string; topK?: number }) {
//     return this.service.searchText(b.user_id, b.q, b.topK);
//   }

//   @Post('search-image')
//   searchImage(@Body() b: { user_id: string; gcs_uri: string; topK?: number }) {
//     return this.service.searchImage(b.user_id, b.gcs_uri, b.topK);
//   }

//   @Post('search-hybrid')
//   searchHybrid(
//     @Body() b: { user_id: string; q?: string; gcs_uri?: string; topK?: number },
//   ) {
//     return this.service.searchHybrid(b.user_id, b.q, b.gcs_uri, b.topK);
//   }

//   // ------- Outfit generation -------
//   @Post('outfits')
//   generateOutfits(
//     @Body()
//     body: {
//       user_id: string;
//       query: string;
//       topK?: number;
//       style_profile?: any; // accept any; we normalize
//       weather?: import('./logic/weather').WeatherContext;
//       useWeather?: boolean;
//       weights?: import('./logic/scoring').ContextWeights;
//     },
//   ) {
//     const weatherArg = body.useWeather === false ? undefined : body.weather;

//     // Normalize the style no matter what the client sends
//     const userStyle = normalizeUserStyle(body.style_profile);

//     // Debug so you can see exactly what’s coming in
//     if (process.env.NODE_ENV !== 'production') {
//       console.log('[CTRL] raw style_profile =', body.style_profile);
//       console.log(
//         '[CTRL] normalized genderPresentation =',
//         userStyle?.genderPresentation,
//       );
//     }

//     return this.service.generateOutfits(
//       body.user_id,
//       body.query,
//       body.topK || 5,
//       {
//         userStyle,
//         weather: weatherArg,
//         weights: body.weights,
//         useWeather: body.useWeather ?? true, // forward the toggle
//       },
//     );
//   }

//   // ------- NEW: AI endpoints -------
//   @Post('analyze')
//   async analyze(
//     @Body() dto: AnalyzeImageRequestDto,
//   ): Promise<AnalyzeImageResponseDto> {
//     const draft = await this.vertex.analyzeImage(dto.gsutil_uri, {
//       gender: dto.gender,
//       dressCode: dto.dressCode,
//       season: dto.season,
//     });
//     return { draft };
//   }

//   @Post('auto-create')
//   async autoCreate(
//     @Body()
//     dto: Partial<CreateWardrobeItemDto> & {
//       user_id: string;
//       image_url: string;
//       gsutil_uri?: string;
//       name?: string;
//     },
//   ) {
//     const draft = dto.gsutil_uri
//       ? await this.vertex.analyzeImage(dto.gsutil_uri)
//       : {};
//     const payload: CreateWardrobeItemDto = this.service.composeFromAiDraft(
//       dto as any,
//       draft,
//     );
//     return this.service.createItem(payload);
//   }
// }

/////////////////

// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Param,
//   Delete,
//   Put,
//   Query,
// } from '@nestjs/common';
// import { WardrobeService } from './wardrobe.service';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { VertexService } from '../vertex/vertex.service';
// import {
//   AnalyzeImageRequestDto,
//   AnalyzeImageResponseDto,
// } from './dto/analyze-image.dto';

// @Controller('wardrobe')
// export class WardrobeController {
//   constructor(
//     private readonly service: WardrobeService,
//     private readonly vertex: VertexService,
//   ) {}

//   @Post()
//   create(@Body() dto: CreateWardrobeItemDto) {
//     return this.service.createItem(dto);
//   }

//   @Get(':user_id')
//   getByUser(@Param('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Get()
//   getByUserQuery(@Query('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Put(':item_id')
//   update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
//     return this.service.updateItem(itemId, dto);
//   }

//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     return this.service.deleteItem(dto);
//   }

//   // ------- Vector search / outfits (existing) -------
//   @Post('suggest')
//   suggest(@Body() body: { user_id: string; queryVec: number[] }) {
//     return this.service.suggestOutfits(body.user_id, body.queryVec);
//   }

//   @Post('search-text')
//   searchText(@Body() b: { user_id: string; q: string; topK?: number }) {
//     return this.service.searchText(b.user_id, b.q, b.topK);
//   }

//   @Post('search-image')
//   searchImage(@Body() b: { user_id: string; gcs_uri: string; topK?: number }) {
//     return this.service.searchImage(b.user_id, b.gcs_uri, b.topK);
//   }

//   @Post('search-hybrid')
//   searchHybrid(
//     @Body() b: { user_id: string; q?: string; gcs_uri?: string; topK?: number },
//   ) {
//     return this.service.searchHybrid(b.user_id, b.q, b.gcs_uri, b.topK);
//   }

//   // src/wardrobe/wardrobe.controller.ts (generateOutfits)
//   @Post('outfits')
//   generateOutfits(
//     @Body()
//     body: {
//       user_id: string;
//       query: string;
//       topK?: number;
//       style_profile?: import('./logic/style').UserStyle;
//       weather?: import('./logic/weather').WeatherContext;
//       useWeather?: boolean;
//       weights?: import('./logic/scoring').ContextWeights;
//     },
//   ) {
//     const weatherArg = body.useWeather === false ? undefined : body.weather;

//     return this.service.generateOutfits(
//       body.user_id,
//       body.query,
//       body.topK || 5,
//       {
//         userStyle: body.style_profile,
//         weather: weatherArg,
//         weights: body.weights,
//         useWeather: body.useWeather ?? true, // 👈 FORWARD THE TOGGLE
//       },
//     );
//   }

//   // ------- NEW: AI endpoints -------
//   @Post('analyze')
//   async analyze(
//     @Body() dto: AnalyzeImageRequestDto,
//   ): Promise<AnalyzeImageResponseDto> {
//     const draft = await this.vertex.analyzeImage(dto.gsutil_uri, {
//       gender: dto.gender,
//       dressCode: dto.dressCode,
//       season: dto.season,
//     });
//     return { draft };
//   }

//   @Post('auto-create')
//   async autoCreate(
//     @Body()
//     dto: Partial<CreateWardrobeItemDto> & {
//       user_id: string;
//       image_url: string;
//       gsutil_uri?: string;
//       name?: string;
//     },
//   ) {
//     const draft = dto.gsutil_uri
//       ? await this.vertex.analyzeImage(dto.gsutil_uri)
//       : {};
//     const payload: CreateWardrobeItemDto = this.service.composeFromAiDraft(
//       dto as any,
//       draft,
//     );
//     return this.service.createItem(payload);
//   }
// }

///////////////////

// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Param,
//   Delete,
//   Put,
//   Query,
// } from '@nestjs/common';
// import { WardrobeService } from './wardrobe.service';
// import { CreateWardrobeItemDto } from './dto/create-wardrobe-item.dto';
// import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
// import { DeleteItemDto } from './dto/delete-item.dto';
// import { VertexService } from '../vertex/vertex.service';
// import {
//   AnalyzeImageRequestDto,
//   AnalyzeImageResponseDto,
// } from './dto/analyze-image.dto';

// @Controller('wardrobe')
// export class WardrobeController {
//   constructor(
//     private readonly service: WardrobeService,
//     private readonly vertex: VertexService,
//   ) {}

//   @Post()
//   create(@Body() dto: CreateWardrobeItemDto) {
//     return this.service.createItem(dto);
//   }

//   @Get(':user_id')
//   getByUser(@Param('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Get()
//   getByUserQuery(@Query('user_id') userId: string) {
//     return this.service.getItemsByUser(userId);
//   }

//   @Put(':item_id')
//   update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
//     return this.service.updateItem(itemId, dto);
//   }

//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     return this.service.deleteItem(dto);
//   }

//   // ------- Vector search / outfits (existing) -------
//   @Post('suggest')
//   suggest(@Body() body: { user_id: string; queryVec: number[] }) {
//     return this.service.suggestOutfits(body.user_id, body.queryVec);
//   }

//   @Post('search-text')
//   searchText(@Body() b: { user_id: string; q: string; topK?: number }) {
//     return this.service.searchText(b.user_id, b.q, b.topK);
//   }

//   @Post('search-image')
//   searchImage(@Body() b: { user_id: string; gcs_uri: string; topK?: number }) {
//     return this.service.searchImage(b.user_id, b.gcs_uri, b.topK);
//   }

//   @Post('search-hybrid')
//   searchHybrid(
//     @Body() b: { user_id: string; q?: string; gcs_uri?: string; topK?: number },
//   ) {
//     return this.service.searchHybrid(b.user_id, b.q, b.gcs_uri, b.topK);
//   }

//   // src/wardrobe/wardrobe.controller.ts (generateOutfits)
//   @Post('outfits')
//   generateOutfits(
//     @Body()
//     body: {
//       user_id: string;
//       query: string;
//       topK?: number;
//       style_profile?: import('./logic/style').UserStyle;
//       weather?: import('./logic/weather').WeatherContext;
//       useWeather?: boolean;
//       weights?: import('./logic/scoring').ContextWeights;
//     },
//   ) {
//     const weatherArg = body.useWeather === false ? undefined : body.weather;

//     return this.service.generateOutfits(
//       body.user_id,
//       body.query,
//       body.topK || 5,
//       {
//         userStyle: body.style_profile,
//         weather: weatherArg,
//         weights: body.weights,
//         useWeather: body.useWeather ?? true, // 👈 FORWARD THE TOGGLE
//       },
//     );
//   }

//   // ------- NEW: AI endpoints -------
//   @Post('analyze')
//   async analyze(
//     @Body() dto: AnalyzeImageRequestDto,
//   ): Promise<AnalyzeImageResponseDto> {
//     const draft = await this.vertex.analyzeImage(dto.gsutil_uri, {
//       gender: dto.gender,
//       dressCode: dto.dressCode,
//       season: dto.season,
//     });
//     return { draft };
//   }

//   @Post('auto-create')
//   async autoCreate(
//     @Body()
//     dto: Partial<CreateWardrobeItemDto> & {
//       user_id: string;
//       image_url: string;
//       gsutil_uri?: string;
//       name?: string;
//     },
//   ) {
//     const draft = dto.gsutil_uri
//       ? await this.vertex.analyzeImage(dto.gsutil_uri)
//       : {};
//     const payload: CreateWardrobeItemDto = this.service.composeFromAiDraft(
//       dto as any,
//       draft,
//     );
//     return this.service.createItem(payload);
//   }
// }
