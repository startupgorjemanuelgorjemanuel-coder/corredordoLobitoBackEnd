import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  category?: string;

  @IsObject()
  @IsOptional()
  metadata?: object;
}
