import { IsString, IsOptional, IsArray, MaxLength, ValidateIf } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @ValidateIf((o) => o.imageUrl !== '' && o.imageUrl !== null)
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @ValidateIf((o) => o.topImage !== '' && o.topImage !== null)
  @IsString()
  topImage?: string;

  @IsOptional()
  @ValidateIf((o) => o.bottomImage !== '' && o.bottomImage !== null)
  @IsString()
  bottomImage?: string;

  @IsOptional()
  @ValidateIf((o) => o.shoesImage !== '' && o.shoesImage !== null)
  @IsString()
  shoesImage?: string;

  @IsOptional()
  @ValidateIf((o) => o.accessoryImage !== '' && o.accessoryImage !== null)
  @IsString()
  accessoryImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
