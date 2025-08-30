import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTimeframeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}