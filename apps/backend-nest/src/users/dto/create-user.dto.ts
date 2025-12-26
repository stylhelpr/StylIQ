import { IsString, IsOptional, IsEmail, IsUrl } from 'class-validator';

export class CreateUserDto {
  @IsString()
  auth0_sub: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string | null;
}

//////////////////

// export class CreateUserDto {
//   auth0_sub: string;
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
// }

////////////

// export class CreateUserDto {
//   auth0_sub: string;
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
// }
