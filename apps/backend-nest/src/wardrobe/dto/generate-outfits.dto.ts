import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  IsUUID,
  IsObject,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WeatherDto {
  @IsNumber()
  tempF: number;

  @IsOptional()
  @IsIn(['none', 'rain', 'snow'])
  precipitation?: 'none' | 'rain' | 'snow';

  @IsOptional()
  @IsNumber()
  windMph?: number;

  @IsOptional()
  @IsBoolean()
  isIndoors?: boolean;

  @IsOptional()
  @IsString()
  locationName?: string;
}

class WeightsDto {
  @IsOptional()
  @IsNumber()
  constraintsWeight?: number;

  @IsOptional()
  @IsNumber()
  styleWeight?: number;

  @IsOptional()
  @IsNumber()
  weatherWeight?: number;

  @IsOptional()
  @IsNumber()
  feedbackWeight?: number;

  // Alternate key names (ContextWeights union)
  @IsOptional()
  @IsNumber()
  constraints?: number;

  @IsOptional()
  @IsNumber()
  style?: number;

  @IsOptional()
  @IsNumber()
  weather?: number;

  @IsOptional()
  @IsNumber()
  feedback?: number;
}

export class GenerateOutfitsDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;

  @IsOptional()
  @IsObject()
  style_profile?: Record<string, any>;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeatherDto)
  weather?: WeatherDto;

  @IsOptional()
  @IsBoolean()
  useWeather?: boolean;

  @IsOptional()
  @IsBoolean()
  useFeedback?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeightsDto)
  weights?: WeightsDto;

  @IsOptional()
  @IsIn(['agent1', 'agent2', 'agent3'])
  styleAgent?: 'agent1' | 'agent2' | 'agent3';

  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  refinementPrompt?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  lockedItemIds?: string[];

  @IsOptional()
  @IsBoolean()
  useFastMode?: boolean;

  @IsOptional()
  @IsBoolean()
  aaaaMode?: boolean;

  // Frontend sends user_id but backend uses JWT — allow to avoid rejection
  @IsOptional()
  @IsString()
  user_id?: string;
}
