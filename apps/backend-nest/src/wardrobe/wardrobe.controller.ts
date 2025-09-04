// wardrobe.controller.ts
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

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly service: WardrobeService) {}

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

  @Post('outfits')
  generateOutfits(
    @Body() body: { user_id: string; query: string; topK?: number },
  ) {
    return this.service.generateOutfits(
      body.user_id,
      body.query,
      body.topK || 5,
    );
  }
}

//////////////

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

// @Controller('wardrobe') // 👈 All routes start with /api/wardrobe
// export class WardrobeController {
//   constructor(private readonly service: WardrobeService) {}

//   // -------------------
//   // CREATE a new wardrobe item
//   // -------------------
//   @Post()
//   create(@Body() dto: CreateWardrobeItemDto) {
//     // Flow:
//     // 1. Save item to Postgres
//     // 2. Call Vertex (image + text embeddings)
//     // 3. Upsert vectors + metadata into Pinecone
//     return this.service.createItem(dto);
//   }

//   // -------------------
//   // GET wardrobe items by userId (path param)
//   // -------------------
//   @Get(':user_id')
//   getByUser(@Param('user_id') userId: string) {
//     // Fetches all items for this user from Postgres
//     return this.service.getItemsByUser(userId);
//   }

//   // -------------------
//   // GET wardrobe items by userId (query param)
//   // -------------------
//   @Get()
//   getByUserQuery(@Query('user_id') userId: string) {
//     // Same as above, just different style (/api/wardrobe?user_id=xxx)
//     return this.service.getItemsByUser(userId);
//   }

//   // -------------------
//   // UPDATE wardrobe item (e.g. edit name, color, tags)
//   // -------------------
//   @Put(':item_id')
//   update(@Param('item_id') itemId: string, @Body() dto: UpdateWardrobeItemDto) {
//     // Updates item in Postgres
//     // Pinecone embeddings remain unless you trigger a re-embed + upsert
//     return this.service.updateItem(itemId, dto);
//   }

//   // -------------------
//   // DELETE wardrobe item
//   // -------------------
//   @Delete()
//   delete(@Body() dto: DeleteItemDto) {
//     // Flow:
//     // 1. Delete from Postgres
//     // 2. Delete embeddings from Pinecone
//     // 3. Delete file from GCS
//     return this.service.deleteItem(dto);
//   }

//   // -------------------
//   // OUTFIT SUGGESTIONS (vector-based)
//   // -------------------
//   @Post('suggest')
//   suggest(@Body() body: { user_id: string; queryVec: number[] }) {
//     // Given a query vector (already embedded on frontend),
//     // Pinecone is queried to return best matching wardrobe items.
//     return this.service.suggestOutfits(body.user_id, body.queryVec);
//   }

//   // -------------------
//   // SEARCH by TEXT
//   // -------------------
//   @Post('search-text')
//   searchText(@Body() b: { user_id: string; q: string; topK?: number }) {
//     // Flow:
//     // 1. Send query string to Vertex (embedText)
//     // 2. Query Pinecone with vector
//     // 3. Return topK items with metadata + scores
//     return this.service.searchText(b.user_id, b.q, b.topK);
//   }

//   // -------------------
//   // SEARCH by IMAGE
//   // -------------------
//   @Post('search-image')
//   searchImage(@Body() b: { user_id: string; gcs_uri: string; topK?: number }) {
//     // Flow:
//     // 1. Send GCS image URI to Vertex (embedImage)
//     // 2. Query Pinecone with image vector
//     return this.service.searchImage(b.user_id, b.gcs_uri, b.topK);
//   }

//   // -------------------
//   // HYBRID SEARCH (text + image together)
//   // -------------------
//   @Post('search-hybrid')
//   searchHybrid(
//     @Body() b: { user_id: string; q?: string; gcs_uri?: string; topK?: number },
//   ) {
//     // Flow:
//     // 1. Embed text (if provided)
//     // 2. Embed image (if provided)
//     // 3. Fuse Pinecone results with Reciprocal Rank Fusion (RRF)
//     return this.service.searchHybrid(b.user_id, b.q, b.gcs_uri, b.topK);
//   }

//   // -------------------
//   // GENERATE AI STYLED OUTFITS (Gemini)
//   // -------------------
//   @Post('outfits')
//   generateOutfits(
//     @Body() body: { user_id: string; query: string; topK?: number },
//   ) {
//     // Flow:
//     // 1. Convert query → text embedding
//     // 2. Search Pinecone for topK wardrobe items
//     // 3. Send wardrobe items + query as prompt to Gemini (generative API)
//     // 4. Gemini responds with styled outfit JSON (title, items, reasoning)
//     return this.service.generateOutfits(
//       body.user_id,
//       body.query,
//       body.topK || 5,
//     );
//   }
// }
