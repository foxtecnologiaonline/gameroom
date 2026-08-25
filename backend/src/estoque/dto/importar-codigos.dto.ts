import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MinLength,
} from 'class-validator';

export class ImportarCodigosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsString({ each: true })
  @MinLength(3, { each: true })
  codigos!: string[];
}
