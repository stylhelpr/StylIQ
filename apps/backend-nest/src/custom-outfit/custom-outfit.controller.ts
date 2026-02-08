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
  NotFoundException,
} from '@nestjs/common';
import { CustomOutfitService } from './custom-outfit.service';
import { CreateCustomOutfitDto } from './dto/create-custom-outfit.dto';
import { UpdateCustomOutfitDto } from './dto/update-custom-outfit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipAuth } from '../auth/skip-auth.decorator';

@Controller('custom-outfits')
export class CustomOutfitController {
  constructor(private readonly service: CustomOutfitService) {}

  // Public endpoint for viewing other users' custom outfits count
  @SkipAuth()
  @Get('count/:userId')
  getPublicCountByUser(@Param('userId') userId: string) {
    return this.service.countByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: Omit<CreateCustomOutfitDto, 'user_id'>) {
    const user_id = req.user.userId;
    return this.service.create({ user_id, ...dto });
  }

  @UseGuards(JwtAuthGuard)
  @Get('count')
  getCountByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.countByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getByUser(@Req() req) {
    const userId = req.user.userId;
    return this.service.getByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateCustomOutfitDto,
  ) {
    const userId = req.user.userId;
    const result = await this.service.update(id, userId, dto);
    if (!result.outfit) {
      throw new NotFoundException();
    }
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    const deleted = await this.service.delete(id, userId);
    if (!deleted) {
      throw new NotFoundException();
    }
    return { message: 'Custom outfit deleted successfully' };
  }
}
