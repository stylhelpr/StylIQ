import { IsString, IsOptional, IsArray, MaxLength, IsUrl } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  topImage?: string;

  @IsOptional()
  @IsUrl()
  bottomImage?: string;

  @IsOptional()
  @IsUrl()
  shoesImage?: string;

  @IsOptional()
  @IsUrl()
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
