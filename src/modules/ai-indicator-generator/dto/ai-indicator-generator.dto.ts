import { IsString, IsOptional, IsArray } from 'class-validator';

export class GenerateIndicatorDto {
  @IsString()
  userInput: string;
}

export class CreateAiIndicatorDto {
  @IsString()
  userInput: string;

  @IsString()
  @IsOptional()
  indicatorName?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class GeneratedIndicatorResponseDto {
  success: boolean;
  generatedCode: string;
}

export class CreatedAiIndicatorResponseDto {
  success: boolean;
  indicator: any;
  generatedCode: string;
}

export class GenerateAndTestResponseDto {
  success: boolean;
  indicator: any;
  generatedCode: string;
  testResult?: {
    sampleData: any[];
    summary: {
      totalDataPoints: number;
      validResults: number;
      nullResults: number;
    };
  };
}