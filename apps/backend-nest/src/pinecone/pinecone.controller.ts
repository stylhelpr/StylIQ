// import { Controller, Post, Body, Delete, Param } from '@nestjs/common';
// import { PineconeService } from './pinecone.service';
// import { SearchDto } from './dto/search.dto';

// @Controller('pinecone')
// export class PineconeController {
//   constructor(private readonly service: PineconeService) {}

//   @Post('search')
//   search(@Body() dto: SearchDto) {
//     return this.service.search(dto);
//   }

//   @Post('upsert')
//   upsert(@Body() dto: any) {
//     return this.service.upsert(dto);
//   }

//   @Delete('delete/:id')
//   delete(@Param('id') id: string) {
//     return this.service.delete(id);
//   }
// }
