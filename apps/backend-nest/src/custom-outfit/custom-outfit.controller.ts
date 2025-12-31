import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CustomOutfitService } from './custom-outfit.service';
import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('custom-outfits')
export class CustomOutfitController {
  constructor(private readonly service: CustomOutfitService) {}

  @Post()
  create(@Req() req, @Body() dto: Omit<CreateCustomOutfitDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  @Get('count')
  getCountByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.countByUser(userId);
  }

  @Get()
  getByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomOutfitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
