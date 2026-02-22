import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IndicatorsService } from '../indicators/indicators.service';
import { CreateIndicatorDto } from '../indicators/dto/create-indicator.dto';
import { VM } from 'vm2';

@Injectable()
export class AiIndicatorGeneratorService {
  private readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    /require\s*\(/,
    /import\s+/,
    /process\./,
    /fs\./,
    /child_process/,
    /exec\s*\(/,
    /spawn\s*\(/,
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly indicatorsService: IndicatorsService,
  ) { }

  /**
   * 验证生成的代码安全性
   */
  private validateGeneratedCode(code: string): { valid: boolean; reason?: string } {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        return { valid: false, reason: `代码包含不安全的操作: ${pattern.source}` };
      }
    }

    if (!code.includes('function calculate')) {
      return { valid: false, reason: '代码必须包含 calculate 函数' };
    }

    return { valid: true };
  }

  /**
   * 验证代码能否正常执行
   */
  private validateCodeExecution(code: string, parameters: Record<string, any> = {}): { valid: boolean; reason?: string } {
    try {
      const testPriceData = [
        { timestamp: 1000, openPrice: 100, highPrice: 105, lowPrice: 95, closePrice: 102, volume: 1000 },
        { timestamp: 2000, openPrice: 102, highPrice: 108, lowPrice: 100, closePrice: 106, volume: 1200 },
        { timestamp: 3000, openPrice: 106, highPrice: 110, lowPrice: 104, closePrice: 108, volume: 1100 },
        { timestamp: 4000, openPrice: 108, highPrice: 112, lowPrice: 106, closePrice: 110, volume: 1300 },
        { timestamp: 5000, openPrice: 110, highPrice: 115, lowPrice: 108, closePrice: 112, volume: 1400 },
      ];

      const BigNumber = require('bignumber.js');
      const sandbox = {
        BigNumber: BigNumber,
        console: { log: () => {} },
      };

      const vm = new VM({
        timeout: 5000,
        sandbox,
      });

      vm.run(`
        ${code}
        
        const result = calculate(${JSON.stringify(testPriceData)}, ${JSON.stringify(parameters)});
      `);

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: `代码执行错误: ${error.message}` };
    }
  }

  /**
   * 验证指标名称格式
   */
  private validateIndicatorName(name: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }

  /**
   * 转换参数格式，兼容AI返回的 type 字段和系统需要的 paramType 字段
   */
  private transformParameters(parameters: any[]): CreateIndicatorDto['parameters'] {
    return parameters.map(param => ({
      name: param.name,
      paramType: param.paramType || param.type || 'number',
      defaultValue: String(param.defaultValue ?? ''),
      description: param.description || `参数: ${param.name}`,
    }));
  }

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
      const finalName = indicatorName || `AI_${Date.now()}`;

      if (indicatorName && !this.validateIndicatorName(indicatorName)) {
        throw new HttpException(
          '指标名称格式不正确，只能包含字母、数字和下划线，且不能以数字开头',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingIndicator = await this.indicatorsService.findByName(finalName);
      if (existingIndicator) {
        throw new HttpException(
          `指标名称 '${finalName}' 已存在，请使用其他名称`,
          HttpStatus.CONFLICT,
        );
      }

      const { code, parameters } = await this.generateIndicatorFunction(userInput);

      const codeValidation = this.validateGeneratedCode(code);
      if (!codeValidation.valid) {
        throw new HttpException(
          `生成的代码安全验证失败: ${codeValidation.reason}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const transformedParams = this.transformParameters(parameters);
      const paramsForTest = {};
      transformedParams.forEach(param => {
        if (param.paramType === 'number') {
          paramsForTest[param.name] = Number(param.defaultValue) || 0;
        } else if (param.paramType === 'boolean') {
          paramsForTest[param.name] = param.defaultValue === 'true';
        } else {
          paramsForTest[param.name] = param.defaultValue;
        }
      });

      const executionValidation = this.validateCodeExecution(code, paramsForTest);
      if (!executionValidation.valid) {
        throw new HttpException(
          `生成的代码执行验证失败: ${executionValidation.reason}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const createIndicatorDto: CreateIndicatorDto = {
        name: finalName,
        description: description || `AI生成的指标: ${userInput}`,
        calculationCode: code,
        parameters: transformedParams,
      };

      const createdIndicator = await this.indicatorsService.create(createIndicatorDto);

      return {
        success: true,
        indicator: createdIndicator,
        generatedCode: code,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
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
      const paramMatch = code.match(/const\s*{([^}]+)}\s*=\s*parameters/);
      if (paramMatch) {
        const paramString = paramMatch[1];
        const paramPairs = paramString.split(',');

        paramPairs.forEach(pair => {
          const [name, defaultValue] = pair.trim().split('=').map(s => s.trim());
          const paramName = name.replace(/\s+/g, '');

          if (paramName) {
            let paramType = 'number';
            let paramDefaultValue = '';

            if (defaultValue) {
              if (defaultValue.includes('"') || defaultValue.includes("'")) {
                paramType = 'string';
                paramDefaultValue = defaultValue.replace(/['"]/g, '');
              } else if (defaultValue === 'true' || defaultValue === 'false') {
                paramType = 'boolean';
                paramDefaultValue = defaultValue;
              } else if (!isNaN(Number(defaultValue))) {
                paramType = 'number';
                paramDefaultValue = defaultValue;
              } else {
                paramType = 'string';
                paramDefaultValue = defaultValue;
              }
            }

            parameters.push({
              name: paramName,
              paramType: paramType,
              defaultValue: paramDefaultValue,
              description: `参数: ${paramName}`,
            });
          }
        });
      }
    } catch (error) {
      console.error('提取参数时出错:', error);
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