import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StrategiesService } from '../strategies/strategies.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { CreateStrategyDto } from '../strategies/dto/create-strategy.dto';
import { StrategyIndicatorDto } from '../strategies/dto/create-strategy.dto';
import { StrategyIndicatorParamDto } from '../strategies/dto/create-strategy.dto';
import { VM } from 'vm2';
import { StrategyDataValidator } from './validators/strategy-data.validator';

export interface AiStrategyResponse {
  name: string;
  description: string;
  positionType: string;
  buyFee?: number;
  sellFee?: number;
  liquidationThreshold?: number;
  takeProfitRatio?: number;
  stopLossRatio?: number;
  indicatorNews: Array<{
    name: string;
    description: string;
    code: string;
    parameters: Array<{
      name: string;
      description: string;
      paramType: string;
      defaultValue: string;
    }>;
  }>;
  indicators: Array<{
    indicatorNewsIndex: number;
    parameters: Array<{
      name: string;
      value: string;
    }>;
  }>;
  conditions: Array<{
    indicatorIndex: number;
    comparisonType: string;
    comparedIndicatorIndex?: number;
    constantValue?: string;
    currentValuePath: string;
    comparedValuePath: string;
    operator: string;
    conditionType: string;
    action: string;
    group: number;
    priority: number;
    customCode: string;
  }>;
}

@Injectable()
export class AiStrategyGeneratorService {
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
    private readonly strategiesService: StrategiesService,
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
   * 验证策略名称格式
   */
  private validateStrategyName(name: string): boolean {
    return /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$/.test(name);
  }

  /**
   * 验证所有指标代码的安全性和可执行性
   */
  private validateIndicatorCodes(indicatorNews: Array<{
    name: string;
    description?: string;
    code: string;
    parameters: Array<{
      name: string;
      description?: string;
      paramType: string;
      defaultValue?: string;
    }>;
  }>): { valid: boolean; reason?: string } {
    for (let i = 0; i < indicatorNews.length; i++) {
      const indicator = indicatorNews[i];
      
      const securityValidation = this.validateGeneratedCode(indicator.code);
      if (!securityValidation.valid) {
        return { 
          valid: false, 
          reason: `指标 "${indicator.name}" 代码安全验证失败: ${securityValidation.reason}` 
        };
      }

      const params = {};
      indicator.parameters.forEach(param => {
        const value = param.defaultValue || '';
        if (param.paramType === 'number') {
          params[param.name] = Number(value) || 0;
        } else if (param.paramType === 'boolean') {
          params[param.name] = value === 'true';
        } else {
          params[param.name] = value;
        }
      });

      const executionValidation = this.validateCodeExecution(indicator.code, params);
      if (!executionValidation.valid) {
        return { 
          valid: false, 
          reason: `指标 "${indicator.name}" 代码执行验证失败: ${executionValidation.reason}` 
        };
      }
    }
    return { valid: true };
  }

  /**
   * 读取策略AI提示词文件
   */
  private async loadPromptTemplate(): Promise<string> {
    try {
      const fs = require('fs').promises;
      const promptPath = 'docs/策略ai提示词.txt';
      const content = await fs.readFile(promptPath, 'utf-8');
      return content;
    } catch (error) {
      throw new HttpException(
        '无法加载AI策略提示词模板',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 调用Kimi AI生成策略
   */
  async generateStrategy(userInput: string): Promise<AiStrategyResponse> {
    try {
      const promptTemplate = await this.loadPromptTemplate();

      // 替换用户输入区域
      const prompt = promptTemplate + userInput;

      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.moonshot.cn/v1/chat/completions',
          {
            model: 'moonshot-v1-8k',
            messages: [
              {
                role: 'system',
                content: '你是一个专业的量化策略工程师，请严格按照用户要求生成策略JSON。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 4000
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.KIMI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      let aiResponse = response.data.choices[0]?.message?.content.replace(/```json\n|```/g, '');

      if (!aiResponse) {
        throw new HttpException(
          'AI未能生成有效的策略',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 解析AI返回的JSON
      console.log('AI原始响应:', aiResponse);
      try {
        const parsedResponse = JSON.parse(aiResponse);
        return parsedResponse;
      } catch (e) {
        throw new HttpException(
          'AI生成的策略JSON格式不正确',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `AI策略生成失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 验证策略数据、保存指标并返回策略JSON
   * 此方法可被外部调用，用于处理已生成的策略JSON
   * @param aiStrategy AI生成的策略JSON
   * @returns 验证和保存结果
   */
  async validateAndSaveStrategy(aiStrategy: AiStrategyResponse) {
    const dataValidation = StrategyDataValidator.validateStrategy(aiStrategy);
    if (!dataValidation.valid) {
      throw new HttpException(
        `策略数据不完整: ${dataValidation.errors.join('; ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const aiStrategyWithDefaults = StrategyDataValidator.applyDefaults(aiStrategy);

    const codeValidation = this.validateIndicatorCodes(aiStrategyWithDefaults.indicatorNews);
    if (!codeValidation.valid) {
      throw new HttpException(
        `策略代码安全验证失败: ${codeValidation.reason}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const createdIndicators = [];
    for (const indicatorData of aiStrategyWithDefaults.indicatorNews) {
      const createIndicatorDto = {
        name: indicatorData.name,
        description: indicatorData.description,
        calculationCode: indicatorData.code,
        parameters: indicatorData.parameters.map(param => ({
          name: param.name,
          paramType: param.paramType,
          defaultValue: param.defaultValue,
          description: param.description,
        })),
      };

      const createdIndicator = await this.indicatorsService.create(createIndicatorDto);
      createdIndicators.push(createdIndicator);
    }

    const indicators = aiStrategyWithDefaults.indicators.map((indicatorRef, index) => {
      const indicatorNewsIndex = indicatorRef.indicatorNewsIndex;
      if (indicatorNewsIndex >= 0 && indicatorNewsIndex < createdIndicators.length) {
        const createdIndicator = createdIndicators[indicatorNewsIndex];
        return {
          id: createdIndicator.id,
          name: createdIndicator.name,
          description: createdIndicator.description,
          indicatorNewsIndex: indicatorNewsIndex,
          parameters: indicatorRef.parameters.map(param => {
            const parameter = createdIndicator.parameters.find(p => p.name === param.name);
            return {
              id: parameter?.id,
              name: param.name,
              value: param.value,
            };
          }),
        };
      }
      return null;
    }).filter(Boolean);

    const conditions = aiStrategyWithDefaults.conditions.map(condition => ({
      indicatorIndex: condition.indicatorIndex,
      comparisonType: condition.comparisonType,
      comparedIndicatorIndex: condition.comparedIndicatorIndex,
      constantValue: condition.constantValue,
      currentValuePath: condition.currentValuePath,
      comparedValuePath: condition.comparedValuePath,
      operator: condition.operator,
      conditionType: condition.conditionType,
      action: condition.action,
      group: condition.group,
      priority: condition.priority,
      customCode: condition.customCode,
    }));

    return {
      success: true,
      generatedStrategy: {
        name: aiStrategyWithDefaults.name,
        description: aiStrategyWithDefaults.description,
        positionType: aiStrategyWithDefaults.positionType || 'both',
        buyFee: aiStrategyWithDefaults.buyFee || 0.001,
        sellFee: aiStrategyWithDefaults.sellFee || 0.001,
        liquidationThreshold: aiStrategyWithDefaults.liquidationThreshold || 90,
        takeProfitRatio: aiStrategyWithDefaults.takeProfitRatio,
        stopLossRatio: aiStrategyWithDefaults.stopLossRatio,
        indicators: indicators,
        conditions: conditions,
      },
      createdIndicators: createdIndicators,
    };
  }

  /**
   * 生成策略并将指标写入数据库
   */
  async generateStrategyWithIndicators(userInput: string) {
    const aiStrategy = await this.generateStrategy(userInput);
    return this.validateAndSaveStrategy(aiStrategy);
  }

  /**
   * 创建AI生成的策略
   */
  async createAiStrategy(userInput: string, strategyName?: string, description?: string) {
    try {
      const finalName = strategyName || `AI_Strategy_${Date.now()}`;

      if (strategyName && !this.validateStrategyName(strategyName)) {
        throw new HttpException(
          '策略名称格式不正确，只能包含字母、数字、下划线和中文，且不能以数字开头',
          HttpStatus.BAD_REQUEST,
        );
      }

      const existingStrategy = await this.strategiesService.findByName(finalName);
      if (existingStrategy) {
        throw new HttpException(
          `策略名称 '${finalName}' 已存在，请使用其他名称`,
          HttpStatus.CONFLICT,
        );
      }

      const aiStrategy = await this.generateStrategy(userInput);

      const codeValidation = this.validateIndicatorCodes(aiStrategy.indicatorNews);
      if (!codeValidation.valid) {
        throw new HttpException(
          `策略代码安全验证失败: ${codeValidation.reason}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const createdIndicators = [];
      for (const indicatorData of aiStrategy.indicatorNews) {
        const createIndicatorDto = {
          name: indicatorData.name,
          description: indicatorData.description,
          calculationCode: indicatorData.code,
          parameters: indicatorData.parameters.map(param => ({
            name: param.name,
            paramType: param.paramType,
            defaultValue: param.defaultValue,
            description: param.description,
          })),
        };

        const createdIndicator = await this.indicatorsService.create(createIndicatorDto);
        createdIndicators.push(createdIndicator);
      }

      const createStrategyDto: CreateStrategyDto = {
        name: finalName,
        description: description || aiStrategy.description,
        positionType: aiStrategy.positionType || 'both',
        buyFee: aiStrategy.buyFee || 0.001,
        sellFee: aiStrategy.sellFee || 0.001,
        liquidationThreshold: aiStrategy.liquidationThreshold || 90,
        takeProfitRatio: aiStrategy.takeProfitRatio || null,
        stopLossRatio: aiStrategy.stopLossRatio || null,
        indicators: [],
        conditions: [],
      };

      for (const indicatorRef of aiStrategy.indicators) {
        const indicatorIndex = indicatorRef.indicatorNewsIndex;
        if (indicatorIndex >= 0 && indicatorIndex < createdIndicators.length) {
          const indicator = createdIndicators[indicatorIndex];
          const strategyIndicator: StrategyIndicatorDto = {
            indicatorId: indicator.id,
            priority: aiStrategy.indicators.indexOf(indicatorRef) + 1,
            parameters: indicatorRef.parameters.map(param => {
              const indicator = createdIndicators[indicatorIndex];
              const parameter = indicator.parameters.find(
                p => p.name === param.name
              );
              
              if (!parameter) {
                throw new HttpException(
                  `未找到参数 ${param.name} 对应的ID`,
                  HttpStatus.INTERNAL_SERVER_ERROR,
                );
              }

              const paramDto: StrategyIndicatorParamDto = {
                parameterId: parameter.id,
                value: param.value,
              };
              return paramDto;
            }),
          };
          createStrategyDto.indicators.push(strategyIndicator);
        }
      }

      for (const condition of aiStrategy.conditions) {
        createStrategyDto.conditions.push({
          indicatorIndex: condition.indicatorIndex,
          comparisonType: condition.comparisonType as 'constant' | 'indicator',
          comparedIndicatorIndex: condition.comparedIndicatorIndex,
          constantValue: condition.constantValue,
          currentValuePath: condition.currentValuePath,
          comparedValuePath: condition.comparedValuePath,
          operator: condition.operator as '>' | '>=' | '==' | '!=' | '<' | '<=',
          conditionType: condition.conditionType as 'crossover' | 'value',
          action: condition.action as 'buy' | 'sell',
          group: condition.group,
          priority: condition.priority,
          customCode: condition.customCode,
        });
      }

      const createdStrategy = await this.strategiesService.create(createStrategyDto);

      return {
        success: true,
        strategy: createdStrategy,
        aiGeneratedData: aiStrategy,
        createdIndicators: createdIndicators,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `AI策略创建失败: ${error.message}`,
        error.getStatus ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}