import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(2, 200)
  title: string;

  @IsString()
  @Length(1, 5000)
  description: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}
