import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IndicatorsService } from '../indicators/indicators.service';
import { CreateIndicatorDto } from '../indicators/dto/create-indicator.dto';

@Injectable()
export class AiIndicatorGeneratorService {
  constructor(
    private readonly httpService: HttpService,
    private readonly indicatorsService: IndicatorsService,
  ) { }

  /**
   * 读取提示词文件
   */
  private async loadPromptTemplate(): Promise<string> {
    try {
      const fs = require('fs').promises;
      const promptPath = 'docs/指标ai提示词.txt';
      const content = await fs.readFile(promptPath, 'utf-8');
      return content;
    } catch (error) {
      throw new HttpException(
        '无法加载AI提示词模板',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 调用Kimi AI生成指标函数
   */
  async generateIndicatorFunction(userInput: string): Promise<{ code: string, parameters: any[] }> {
    try {
      const promptTemplate = await this.loadPromptTemplate();

      // 替换用户输入区域
      const prompt = promptTemplate + `${userInput}`;

      console.log('调用Kimi AI的提示词:', prompt);
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.moonshot.cn/v1/chat/completions',
          {
            model: 'moonshot-v1-8k',
            messages: [
              {
                role: 'system',
                content: '你是一个专业的量化指标工程师，请严格按照用户要求生成指标计算函数和参数信息。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 3000
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.KIMI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      const aiResponse = response.data.choices[0]?.message?.content.replace(/```json\n|```/g, '');

      if (!aiResponse) {
        throw new HttpException(
          'AI未能生成有效的指标函数',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 解析AI返回的JSON格式
      console.log('AI原始响应:', aiResponse);
      try {
        const parsedResponse = JSON.parse(aiResponse);
        if (parsedResponse.code && parsedResponse.parameters) {
          return parsedResponse;
        }
      } catch (e) {
        // 如果不是JSON格式，尝试提取函数代码
        const functionMatch = aiResponse.match(/function calculate\([\s\S]*?\n\}/);
        if (functionMatch) {
          return {
            code: functionMatch[0],
            parameters: this.extractParametersFromCode(functionMatch[0])
          };
        }
      }

      // 如果无法提取有效函数代码，抛出错误
      throw new HttpException(
        'AI生成的内容格式不正确，无法提取有效的函数代码',
        HttpStatus.BAD_REQUEST,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `AI调用失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 创建AI生成的指标
   */
  async createAiIndicator(userInput: string, indicatorName?: string, description?: string) {
    try {
      // 生成指标函数代码和参数信息
      const { code, parameters } = await this.generateIndicatorFunction(userInput);

      // 创建指标DTO
      const createIndicatorDto: CreateIndicatorDto = {
        name: indicatorName || `AI_${Date.now()}`,
        description: description || `AI生成的指标: ${userInput}`,
        calculationCode: code,
        parameters: parameters,
      };

      // 调用指标服务创建指标
      const createdIndicator = await this.indicatorsService.create(createIndicatorDto);

      return {
        success: true,
        indicator: createdIndicator,
        generatedCode: code,
        parameters: parameters,
      };
    } catch (error) {
      throw new HttpException(
        `AI指标创建失败: ${error.message}`,
        error.getStatus ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 从代码中提取参数
   */
  private extractParametersFromCode(code: string): any[] {
    const parameters: any[] = [];

    try {
      // 提取参数解构语句
      const paramMatch = code.match(/const\s*{([^}]+)}\s*=\s*parameters/);
      if (paramMatch) {
        const paramString = paramMatch[1];
        const paramPairs = paramString.split(',');

        paramPairs.forEach(pair => {
          const [name, defaultValue] = pair.trim().split('=').map(s => s.trim());
          const paramName = name.replace(/\s+/g, '');

          if (paramName) {
            let paramType = 'number';
            let paramDefaultValue = null;

            if (defaultValue) {
              // 安全地解析默认值
              if (defaultValue.includes('"') || defaultValue.includes("'")) {
                paramType = 'string';
                paramDefaultValue = defaultValue.replace(/['"]/g, '');
              } else if (defaultValue === 'true' || defaultValue === 'false') {
                paramType = 'boolean';
                paramDefaultValue = defaultValue === 'true';
              } else if (!isNaN(Number(defaultValue))) {
                paramType = 'number';
                paramDefaultValue = Number(defaultValue);
              } else {
                // 对于其他情况，保持字符串类型
                paramType = 'string';
                paramDefaultValue = defaultValue;
              }
            }

            parameters.push({
              name: paramName,
              type: paramType,
              defaultValue: paramDefaultValue,
              description: `参数: ${paramName}`,
            });
          }
        });
      }
    } catch (error) {
      console.error('提取参数时出错:', error);
      // 返回空参数数组而不是抛出错误
    }

    return parameters;
  }

  /**
   * 推断返回类型
   */
  private inferReturnType(code: string): string {
    if (code.includes('return result;') && code.includes('result.push')) {
      // 检查是否为多轨指标
      if (code.includes('key:') || code.includes('value:')) {
        return 'multi-track';
      }
      return 'single-value';
    }
    return 'unknown';
  }
}