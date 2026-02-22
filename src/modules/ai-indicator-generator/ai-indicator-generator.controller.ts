import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiIndicatorGeneratorService } from './ai-indicator-generator.service';

const MAX_INPUT_LENGTH = 1000;

@Controller('ai-indicator-generator')
export class AiIndicatorGeneratorController {
  constructor(private readonly aiIndicatorGeneratorService: AiIndicatorGeneratorService) { }

  @Post('generate')
  async generateIndicatorFunction(@Body() body: { userInput: string }) {
    try {
      if (!body.userInput || body.userInput.trim() === '') {
        throw new HttpException('用户输入不能为空', HttpStatus.BAD_REQUEST);
      }

      if (body.userInput.length > MAX_INPUT_LENGTH) {
        throw new HttpException(
          `输入内容过长，请控制在${MAX_INPUT_LENGTH}字符以内`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const generatedCode = await this.aiIndicatorGeneratorService.generateIndicatorFunction(body.userInput.trim());

      return {
        success: true,
        generatedCode: generatedCode,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `生成指标函数失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create')
  async createAiIndicator(@Body() body: {
    userInput: string;
    indicatorName?: string;
    description?: string;
  }) {
    try {
      if (!body.userInput || body.userInput.trim() === '') {
        throw new HttpException('用户输入不能为空', HttpStatus.BAD_REQUEST);
      }

      if (body.userInput.length > MAX_INPUT_LENGTH) {
        throw new HttpException(
          `输入内容过长，请控制在${MAX_INPUT_LENGTH}字符以内`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.aiIndicatorGeneratorService.createAiIndicator(
        body.userInput.trim(),
        body.indicatorName?.trim(),
        body.description?.trim(),
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `创建AI指标失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}