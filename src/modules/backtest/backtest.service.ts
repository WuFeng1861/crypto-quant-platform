import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BacktestResult } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';
import { CreateBacktestDto } from './dto/create-backtest.dto';
import { RedisService } from '../common/services/redis.service';
import { StrategiesService } from '../strategies/strategies.service';
import { IndicatorsService } from '../indicators/indicators.service';

@Injectable()
export class BacktestService {
  constructor(
    @InjectRepository(BacktestResult)
    private backtestResultRepository: Repository<BacktestResult>,
    @InjectRepository(BacktestTrade)
    private backtestTradeRepository: Repository<BacktestTrade>,
    private redisService: RedisService,
    private strategiesService: StrategiesService,
    private indicatorsService: IndicatorsService,
  ) {}

  async runBacktest(createBacktestDto: CreateBacktestDto): Promise<BacktestResult> {
    // 获取策略
    const strategy = await this.strategiesService.getStrategyFromRedis(createBacktestDto.strategyId);
    if (!strategy) {
      throw new Error(`Strategy with id ${createBacktestDto.strategyId} not found`);
    }

    // 获取价格数据
    const priceData = await this.getPriceData(
      createBacktestDto.pairId,
      createBacktestDto.timeframeId,
      new Date(createBacktestDto.startTime),
      new Date(createBacktestDto.endTime),
    );

    if (!priceData || priceData.length === 0) {
      throw new Error('No price data found for the specified period');
    }

    // 执行回测
    const backtestResult = await this.executeBacktest(
      strategy,
      priceData,
      createBacktestDto.initialCapital,
      createBacktestDto,
    );

    // 保存回测结果到Redis
    await this.saveBacktestToRedis(backtestResult.id);

    return backtestResult;
  }

  async findAll(): Promise<BacktestResult[]> {
    return this.backtestResultRepository.find();
  }

  async findOne(id: number): Promise<BacktestResult> {
    return this.backtestResultRepository.findOne({ where: { id } });
  }

  async getBacktestTrades(backtestId: number): Promise<BacktestTrade[]> {
    return this.backtestTradeRepository.find({
      where: { backtestId },
      order: { timestamp: 'ASC' },
    });
  }

  private async getPriceData(
    pairId: number,
    timeframeId: number,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    // 从Redis获取价格数据
    const cacheKey = `price_data:${pairId}:${timeframeId}:${startTime.getTime()}:${endTime.getTime()}`;
    const cachedData = await this.redisService.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // 如果Redis中不存在，从数据库获取
    // 这里假设有一个PriceDataRepository，实际项目中需要创建
    // 这里使用TypeORM的原生查询来模拟
    const priceDataQuery = `
      SELECT * FROM price_data 
      WHERE pair_id = ? AND timeframe_id = ? 
      AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `;

    // 这里使用了TypeORM的原生查询，实际项目中可能需要调整
    const priceData = await this.backtestResultRepository.query(
      priceDataQuery,
      [pairId, timeframeId, startTime, endTime]
    );

    // 缓存到Redis
    if (priceData && priceData.length > 0) {
      await this.redisService.set(cacheKey, priceData, 3600); // 缓存1小时
    }

    return priceData;
  }

  private async executeBacktest(
    strategy: any,
    priceData: any[],
    initialCapital: number,
    createBacktestDto: CreateBacktestDto,
  ): Promise<BacktestResult> {
    // 初始化回测状态
    let balance = initialCapital;
    let position = 0;
    let entryPrice = 0;
    const trades = [];
    let winningTrades = 0;
    let losingTrades = 0;
    let maxDrawdown = 0;
    let peakBalance = initialCapital;
    let returns = [];

    // 计算所有指标的值
    const indicatorValues = {};
    for (const indicator of strategy.indicators) {
      // 获取指标参数
      const parameters = {};
      for (const param of indicator.parameters) {
        parameters[param.name] = param.value;
      }

      // 计算指标值
      const indicatorResult = await this.indicatorsService.calculateIndicator(
        indicator.indicatorId,
        priceData,
        parameters,
      );

      // 存储指标值
      indicatorValues[indicator.id] = indicatorResult;
    }

    // 遍历价格数据
    for (let i = 1; i < priceData.length; i++) {  // 从1开始，因为我们需要前一个时间点的数据
      const candle = priceData[i];
      const timestamp = new Date(candle.timestamp);
      const prevCandle = priceData[i - 1];

      // 检查条件并生成信号
      let buySignal = false;
      let sellSignal = false;
      let buySignalConditionId = null;
      let sellSignalConditionId = null;

      // 按操作类型和组分类条件
      const buyConditionGroups = new Map();
      const sellConditionGroups = new Map();

      // 按优先级排序条件
      const sortedConditions = [...strategy.conditions].sort((a, b) => a.priority - b.priority);

      // 将条件按操作类型和组分类
      for (const condition of sortedConditions) {
        if (condition.action === 'buy') {
          if (!buyConditionGroups.has(condition.group)) {
            buyConditionGroups.set(condition.group, []);
          }
          buyConditionGroups.get(condition.group).push(condition);
        } else if (condition.action === 'sell') {
          if (!sellConditionGroups.has(condition.group)) {
            sellConditionGroups.set(condition.group, []);
          }
          sellConditionGroups.get(condition.group).push(condition);
        }
      }

      // 检查买入条件组
      if (strategy.positionType !== 'short') {
        for (const [groupId, conditions] of buyConditionGroups.entries()) {
          let groupSatisfied = true;
          let groupConditionId = null;

          // 检查组内所有条件是否满足（AND逻辑）
          for (const condition of conditions) {
            const conditionSatisfied = this.checkCondition(
              condition, 
              indicatorValues, 
              i, 
              priceData
            );

            if (!conditionSatisfied) {
              groupSatisfied = false;
              break;
            }
            
            // 记录第一个满足的条件ID
            if (!groupConditionId) {
              groupConditionId = condition.id;
            }
          }

          // 如果组内所有条件都满足，生成买入信号
          if (groupSatisfied && conditions.length > 0) {
            buySignal = true;
            buySignalConditionId = groupConditionId;
            break; // 一个组满足即可（OR逻辑）
          }
        }
      }

      // 检查卖出条件组
      if (strategy.positionType !== 'long') {
        for (const [groupId, conditions] of sellConditionGroups.entries()) {
          let groupSatisfied = true;
          let groupConditionId = null;

          // 检查组内所有条件是否满足（AND逻辑）
          for (const condition of conditions) {
            const conditionSatisfied = this.checkCondition(
              condition, 
              indicatorValues, 
              i, 
              priceData
            );

            if (!conditionSatisfied) {
              groupSatisfied = false;
              break;
            }
            
            // 记录第一个满足的条件ID
            if (!groupConditionId) {
              groupConditionId = condition.id;
            }
          }

          // 如果组内所有条件都满足，生成卖出信号
          if (groupSatisfied && conditions.length > 0) {
            sellSignal = true;
            sellSignalConditionId = groupConditionId;
            break; // 一个组满足即可（OR逻辑）
          }
        }
      }

      // 执行交易
      if (buySignal && (position <= 0 || strategy.positionType === 'both')) {
        // 买入
        const price = candle.close_price;
        const amount = position === 0 ? balance / price : Math.abs(position);
        const fee = amount * price * strategy.buyFee;
        
        // 更新余额和持仓
        balance -= (amount * price + fee);
        position += amount;
        
        if (position === amount) {
          // 开仓
          entryPrice = price;
        } else {
          // 平空仓
          // 计算毛利润
          const grossProfit = (entryPrice - price) * Math.abs(position);
          // 计算开仓和平仓的总手续费
          const entryFee = Math.abs(position) * entryPrice * strategy.sellFee; // 开空仓是卖出操作
          const exitFee = Math.abs(position) * price * strategy.buyFee; // 平空仓是买入操作
          // 计算净利润（考虑手续费）
          const netProfit = grossProfit - entryFee - exitFee;
          const profitRate = ((entryPrice - price) / entryPrice * 100) - 
                            (strategy.sellFee * 100) - (strategy.buyFee * 100);
          
          if (netProfit > 0) winningTrades++;
          else losingTrades++;
          
          balance += netProfit;
        }

        // 记录交易
        trades.push({
          backtestId: null, // 稍后填充
          timestamp,
          tradeType: 'buy',
          price,
          amount,
          fee,
          profit: position === amount ? null : ((entryPrice - price) * Math.abs(position)) - 
                 (Math.abs(position) * entryPrice * strategy.sellFee) - 
                 (Math.abs(position) * price * strategy.buyFee),
          profitRate: position === amount ? null : ((entryPrice - price) / entryPrice * 100) - 
                     (strategy.sellFee * 100) - (strategy.buyFee * 100),
          balance: balance + position * price,
          signalIndicatorId: buySignalConditionId,
        });
      }
      
      if (sellSignal && (position >= 0 || strategy.positionType === 'both')) {
        // 卖出
        const price = candle.close_price;
        const amount = position === 0 ? balance / price : position;
        const fee = amount * price * strategy.sellFee;
        
        // 更新余额和持仓
        balance += amount * price - fee;
        position -= amount;
        
        if (position === -amount) {
          // 开空仓
          entryPrice = price;
        } else {
          // 平多仓
          // 计算毛利润
          const grossProfit = (price - entryPrice) * position;
          // 计算开仓和平仓的总手续费
          const entryFee = position * entryPrice * strategy.buyFee; // 开多仓是买入操作
          const exitFee = position * price * strategy.sellFee; // 平多仓是卖出操作
          // 计算净利润（考虑手续费）
          const netProfit = grossProfit - entryFee - exitFee;
          const profitRate = ((price - entryPrice) / entryPrice * 100) - 
                            (strategy.buyFee * 100) - (strategy.sellFee * 100);
          
          if (netProfit > 0) winningTrades++;
          else losingTrades++;
          
          balance += netProfit;
        }

        // 记录交易
        trades.push({
          backtestId: null, // 稍后填充
          timestamp,
          tradeType: 'sell',
          price,
          amount,
          fee,
          profit: position === -amount ? null : ((price - entryPrice) * position) - 
                 (position * entryPrice * strategy.buyFee) - 
                 (position * price * strategy.sellFee),
          profitRate: position === -amount ? null : ((price - entryPrice) / entryPrice * 100) - 
                     (strategy.buyFee * 100) - (strategy.sellFee * 100),
          balance: balance + Math.abs(position) * price,
          signalIndicatorId: sellSignalConditionId,
        });
      }

      // 更新最大回撤
      const currentBalance = balance + position * candle.close_price;
      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      }
      
      const drawdown = (peakBalance - currentBalance) / peakBalance * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // 记录每日收益率
      returns.push((currentBalance - initialCapital) / initialCapital);
    }

    // 计算最终资金
    const finalCandle = priceData[priceData.length - 1];
    const finalCapital = balance + position * finalCandle.close_price;
    
    // 计算总收益和收益率
    const totalProfit = finalCapital - initialCapital;
    const profitRate = (totalProfit / initialCapital) * 100;
    
    // 计算胜率
    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    // 计算夏普比率
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdReturn = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdReturn !== 0 ? avgReturn / stdReturn : 0;

    // 创建回测结果
    const backtestResult = this.backtestResultRepository.create({
      strategyId: createBacktestDto.strategyId,
      pairId: createBacktestDto.pairId,
      timeframeId: createBacktestDto.timeframeId,
      startTime: new Date(createBacktestDto.startTime),
      endTime: new Date(createBacktestDto.endTime),
      initialCapital,
      finalCapital,
      totalProfit,
      profitRate,
      maxDrawdown,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      sharpeRatio,
    });

    const savedResult = await this.backtestResultRepository.save(backtestResult);

    // 保存交易记录
    for (const trade of trades) {
      trade.backtestId = savedResult.id;
    }
    
    await this.backtestTradeRepository.save(trades);

    return savedResult;
  }

  private checkCondition(
    condition: any, 
    indicatorValues: any, 
    index: number, 
    priceData: any[]
  ): boolean {
    // 获取指标值
    const indicatorId = condition.indicatorId;
    const indicatorResult = indicatorValues[indicatorId];
    if (!indicatorResult) return false;

    const currentValue = indicatorResult[index];
    const prevValue = indicatorResult[index - 1];

    // 根据比较类型和条件类型检测信号
    if (condition.comparisonType === 'indicator') {
      // 与另一个指标比较
      const comparedIndicatorId = condition.comparedIndicatorId;
      const comparedResult = indicatorValues[comparedIndicatorId];
      if (!comparedResult) return false;

      const currentComparedValue = comparedResult[index];
      const prevComparedValue = comparedResult[index - 1];

      if (condition.conditionType === 'crossover') {
        // 交叉条件
        if (condition.operator === '>') {
          // 上穿
          return currentValue > currentComparedValue && prevValue <= prevComparedValue;
        } else if (condition.operator === '<') {
          // 下穿
          return currentValue < currentComparedValue && prevValue >= prevComparedValue;
        }
      } else if (condition.conditionType === 'value') {
        // 值比较
        return this.compareValues(currentValue, currentComparedValue, condition.operator);
      }
    } else if (condition.comparisonType === 'constant') {
      // 与常量比较
      const constantValue = parseFloat(condition.constantValue);
      
      if (condition.conditionType === 'value') {
        // 值比较
        return this.compareValues(currentValue, constantValue, condition.operator);
      }
    }

    return false;
  }

  private compareValues(value1: any, value2: any, operator: string): boolean {
    switch (operator) {
      case '>':
        return value1 > value2;
      case '<':
        return value1 < value2;
      case '>=':
        return value1 >= value2;
      case '<=':
        return value1 <= value2;
      case '==':
        return value1 == value2;
      case '!=':
        return value1 != value2;
      default:
        return false;
    }
  }

  private async saveBacktestToRedis(backtestId: number): Promise<void> {
    const backtest = await this.backtestResultRepository.findOne({ where: { id: backtestId } });
    if (!backtest) {
      throw new Error(`Backtest with id ${backtestId} not found`);
    }

    const trades = await this.backtestTradeRepository.find({ where: { backtestId } });

    // 保存回测结果和交易记录到Redis
    await this.redisService.set(`backtest:${backtestId}`, {
      ...backtest,
      trades,
    });
  }

  async getBacktestFromRedis(backtestId: number): Promise<any> {
    return this.redisService.get(`backtest:${backtestId}`);
  }
}