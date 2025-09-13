import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // ⬅️ import your guard

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ⬇️ NEW — return current logged-in user (includes role)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    const sub = req.user?.sub; // 👈 Auth0 subject claim
    if (!sub) return null;

    const user = await this.service.findByAuth0Sub(sub); // ⬅️ you already have this method
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role, // 👈 must exist in your users table
    };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('auth0/:sub')
  getByAuth0Sub(@Param('sub') sub: string) {
    return this.service.findByAuth0Sub(sub);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Post('sync')
  async sync(@Body() dto: CreateUserDto) {
    console.log('🟡 SYNC REQUEST BODY:', dto);
    return this.service.sync(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const allowed = new Set([
      'first_name',
      'last_name',
      'email',
      'profile_picture',
      'profession',
      'fashion_level',
      'gender_presentation',
      'onboarding_complete',
    ]);

    const dto: any = {};
    for (const k of Object.keys(body)) {
      if (allowed.has(k)) dto[k] = body[k];
    }

    if (dto.gender_presentation) {
      dto.gender_presentation = String(dto.gender_presentation)
        .toLowerCase()
        .replace(/\s+/g, '_');
    }

    console.log('🔎 PUT /users/:id dto =', dto);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

////////////////

// import {
//   Controller,
//   Get,
//   Post,
//   Put,
//   Delete,
//   Body,
//   Param,
// } from '@nestjs/common';
// import { UsersService } from './users.service';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';

// @Controller('users')
// export class UsersController {
//   constructor(private readonly service: UsersService) {}

//   @Get(':id')
//   getById(@Param('id') id: string) {
//     return this.service.findById(id);
//   }

//   @Get('auth0/:sub')
//   getByAuth0Sub(@Param('sub') sub: string) {
//     return this.service.findByAuth0Sub(sub);
//   }

//   @Post()
//   create(@Body() dto: CreateUserDto) {
//     return this.service.create(dto);
//   }

//   @Post('sync')
//   async sync(@Body() dto: CreateUserDto) {
//     console.log('🟡 SYNC REQUEST BODY:', dto);
//     return this.service.sync(dto);
//   }

//   // users.controller.ts – in @Put(':id') before calling service.update
//   @Put(':id')
//   update(@Param('id') id: string, @Body() body: any) {
//     const allowed = new Set([
//       'first_name',
//       'last_name',
//       'email',
//       'profile_picture',
//       'profession',
//       'fashion_level',
//       'gender_presentation',
//       'onboarding_complete',
//     ]);

//     const dto: any = {};
//     for (const k of Object.keys(body)) {
//       if (allowed.has(k)) dto[k] = body[k];
//     }

//     // ⬇️ normalize gender here (mirror the DB’s accepted set)
//     if (dto.gender_presentation) {
//       dto.gender_presentation = String(dto.gender_presentation)
//         .toLowerCase()
//         .replace(/\s+/g, '_'); // or '-' if your DB uses hyphens
//     }

//     console.log('🔎 PUT /users/:id dto =', dto);
//     return this.service.update(id, dto);
//   }

//   @Delete(':id')
//   delete(@Param('id') id: string) {
//     return this.service.delete(id);
//   }
// }
