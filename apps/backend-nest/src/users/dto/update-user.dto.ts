import { IsString, IsOptional, IsBoolean, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @ValidateIf((o, v) => v !== null)
  @IsString()
  profile_picture?: string | null; // ✅ allow null

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  fashion_level?: string;

  @IsOptional()
  @IsString()
  gender_presentation?: string;

  @IsOptional()
  @IsBoolean()
  onboarding_complete?: boolean;

  @IsOptional()
  @IsString()
  country?: string;
}

/////////////////

// export class UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
//   profession?: string;
//   fashion_level?: string;
//   gender_presentation?: string;
//   onboarding_complete?: boolean;
// }

////////////////////

// export class UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
// }

////////////

// export class UpdateUserDto {
//   first_name?: string;
//   last_name?: string;
//   email?: string;
//   profile_picture?: string;
// }
