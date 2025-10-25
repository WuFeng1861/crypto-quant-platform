import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { StrategiesService } from '../strategies/strategies.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { CreateStrategyDto } from '../strategies/dto/create-strategy.dto';
import { StrategyIndicatorDto } from '../strategies/dto/create-strategy.dto';
import { StrategyIndicatorParamDto } from '../strategies/dto/create-strategy.dto';

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
  constructor(
    private readonly httpService: HttpService,
    private readonly strategiesService: StrategiesService,
    private readonly indicatorsService: IndicatorsService,
  ) { }

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
   * 创建AI生成的策略
   */
  async createAiStrategy(userInput: string, strategyName?: string, description?: string) {
    try {
      // 生成策略
      const aiStrategy = await this.generateStrategy(userInput);

      // 1. 先创建AI生成的新指标
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

      // 2. 构建策略DTO
      const createStrategyDto: CreateStrategyDto = {
        name: strategyName || aiStrategy.name,
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

      // 3. 构建策略指标关联
      for (const indicatorRef of aiStrategy.indicators) {
        const indicatorIndex = indicatorRef.indicatorNewsIndex;
        if (indicatorIndex >= 0 && indicatorIndex < createdIndicators.length) {
          const indicator = createdIndicators[indicatorIndex];
          const strategyIndicator: StrategyIndicatorDto = {
            indicatorId: indicator.id,
            priority: aiStrategy.indicators.indexOf(indicatorRef) + 1,
            parameters: indicatorRef.parameters.map(param => {
              // 根据参数名称在已创建的指标参数中找到对应的参数ID
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

      // 4. 构建策略条件
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

      // 5. 创建策略
      const createdStrategy = await this.strategiesService.create(createStrategyDto);

      return {
        success: true,
        strategy: createdStrategy,
        aiGeneratedData: aiStrategy,
        createdIndicators: createdIndicators,
      };
    } catch (error) {
      throw new HttpException(
        `AI策略创建失败: ${error.message}`,
        error.getStatus ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}