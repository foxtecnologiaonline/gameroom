import { IsBoolean } from 'class-validator';

export class DecisaoRetencaoDto {
  @IsBoolean()
  liberar!: boolean;
}
