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

  // src/wardrobe/wardrobe.controller.ts (generateOutfits)
  @Post('outfits')
  generateOutfits(
    @Body()
    body: {
      user_id: string;
      query: string;
      topK?: number;
      style_profile?: import('./logic/style').UserStyle;
      weather?: import('./logic/weather').WeatherContext;
      useWeather?: boolean;
      weights?: import('./logic/scoring').ContextWeights;
    },
  ) {
    const weatherArg = body.useWeather === false ? undefined : body.weather;

    return this.service.generateOutfits(
      body.user_id,
      body.query,
      body.topK || 5,
      {
        userStyle: body.style_profile,
        weather: weatherArg,
        weights: body.weights,
        useWeather: body.useWeather ?? true, // 👈 FORWARD THE TOGGLE
      },
    );
  }

  // ------- NEW: AI endpoints -------
  @Post('analyze')
  async analyze(
    @Body() dto: AnalyzeImageRequestDto,
  ): Promise<AnalyzeImageResponseDto> {
    const draft = await this.vertex.analyzeImage(dto.gsutil_uri, {
      gender: dto.gender,
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
