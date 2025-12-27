import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class UploadDto {
  @IsString()
  user_id: string;

  @IsString()
  image_url: string;

  @IsString()
  object_key: string; // ✅ Add this

  @IsString()
  name: string;

  @IsString()
  main_category: string; // ✅ Add this

  @IsOptional()
  @IsString()
  color?: string; // ✅ Optional if needed

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // ✅ Optional if needed

  @IsOptional()
  @IsNumber()
  width?: number; // ✅ Keep if used

  @IsOptional()
  @IsNumber()
  height?: number; // ✅ Keep if used
}

////////

// export class UploadDto {
//   user_id: string;
//   image_url: string;
//   name?: string;
//   width: number;
//   height: number;
// }
