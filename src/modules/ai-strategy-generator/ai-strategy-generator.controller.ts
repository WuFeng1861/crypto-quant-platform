import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiStrategyGeneratorService } from './ai-strategy-generator.service';

const MAX_INPUT_LENGTH = 5000;

@Controller('ai-strategy-generator')
export class AiStrategyGeneratorController {
  constructor(private readonly aiStrategyGeneratorService: AiStrategyGeneratorService) { }

  @Post('generate')
  async generateStrategy(@Body() body: { userInput: string }) {
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

      const result = await this.aiStrategyGeneratorService.generateStrategyWithIndicators(body.userInput.trim());

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `生成策略失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('create')
  async createAiStrategy(@Body() body: {
    userInput: string;
    strategyName?: string;
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

      const result = await this.aiStrategyGeneratorService.createAiStrategy(
        body.userInput.trim(),
        body.strategyName?.trim(),
        body.description?.trim(),
      );

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `创建AI策略失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}