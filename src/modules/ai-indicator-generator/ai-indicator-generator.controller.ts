import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiIndicatorGeneratorService } from './ai-indicator-generator.service';

@Controller('ai-indicator-generator')
export class AiIndicatorGeneratorController {
  constructor(private readonly aiIndicatorGeneratorService: AiIndicatorGeneratorService) {}

  @Post('generate')
  async generateIndicatorFunction(@Body() body: { userInput: string }) {
    try {
      if (!body.userInput || body.userInput.trim() === '') {
        throw new HttpException('用户输入不能为空', HttpStatus.BAD_REQUEST);
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

      const result = await this.aiIndicatorGeneratorService.createAiIndicator(
        body.userInput.trim(),
        body.indicatorName,
        body.description,
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

  @Post('generate-and-test')
  async generateAndTestIndicator(@Body() body: { 
    userInput: string; 
    indicatorName?: string; 
    description?: string;
    testData?: any[];
  }) {
    try {
      if (!body.userInput || body.userInput.trim() === '') {
        throw new HttpException('用户输入不能为空', HttpStatus.BAD_REQUEST);
      }

      // 创建AI指标
      const createResult = await this.aiIndicatorGeneratorService.createAiIndicator(
        body.userInput.trim(),
        body.indicatorName,
        body.description,
      );

      // 如果有测试数据，进行测试
      let testResult = null;
      if (body.testData && body.testData.length > 0) {
        testResult = await this.testIndicator(createResult.indicator.id, body.testData);
      }
      
      return {
        ...createResult,
        testResult: testResult,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `生成并测试AI指标失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async testIndicator(indicatorId: number, testData: any[]): Promise<any> {
    // 这里可以集成指标计算服务来测试生成的指标
    // 暂时返回模拟的测试结果
    return {
      sampleData: testData.slice(0, 5).map((data, index) => ({
        ...data,
        result: index > 0 ? data.closePrice * 0.95 : null, // 模拟计算结果
      })),
      summary: {
        totalDataPoints: testData.length,
        validResults: testData.length - 1,
        nullResults: 1,
      }
    };
  }
}