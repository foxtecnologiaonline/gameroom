import { IsString, Length } from 'class-validator';

export class CreateSellerDto {
  @IsString()
  @Length(2, 120)
  storeName: string;

  @IsString()
  @Length(11, 20)
  document: string;
}
