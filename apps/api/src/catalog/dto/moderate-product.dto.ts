import { IsBoolean } from 'class-validator';

export class ModerateProductDto {
  @IsBoolean()
  suspended: boolean;
}
