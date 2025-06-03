import { Controller, Delete, Body } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { DeleteItemDto } from './dto/delete-item.dto';

@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly service: WardrobeService) {}

  @Delete()
  delete(@Body() dto: DeleteItemDto) {
    return this.service.deleteItem(dto);
  }
}
