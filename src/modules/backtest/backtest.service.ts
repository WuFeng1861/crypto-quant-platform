import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BacktestResult } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';
import { CreateBacktestDto } from './dto/create-backtest.dto';
import { RedisService } from '../common/services/redis.service';
import { StrategiesService } from '../strategies/strategies.service';
import { IndicatorsService } from '../indicators/indicators.service';
import BigNumber from 'bignumber.js';

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
    // 初始化回测状态，使用BigNumber处理所有金融计算
    let balance = new BigNumber(initialCapital);
    let position = new BigNumber(0);
    let entryPrice = new BigNumber(0);
    const trades = [];
    let winningTrades = 0;
    let losingTrades = 0;
    let maxDrawdown = 0;
    let peakBalance = new BigNumber(initialCapital);
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
      
      // 检查资金是否已经低于初始资金的10%且没有持仓，如果是则提前结束回测
      if (balance.isLessThan(new BigNumber(initialCapital).multipliedBy(0.1)) && position.isZero()) {
        console.log(`回测提前结束: 资金已低于初始资金的10%，当前资金: ${balance.toNumber()}, 初始资金: ${initialCapital}`);
        break;
      }
      
      // 检查是否爆仓
      const liquidationResult = this.checkAndHandleLiquidation(
        position, 
        balance, 
        entryPrice, 
        new BigNumber(candle.close_price), 
        timestamp, 
        strategy, 
        trades
      );
      
      if (liquidationResult.liquidated) {
        position = liquidationResult.position;
        balance = liquidationResult.balance;
        losingTrades++;
        continue;
      }

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
      if (buySignal && (position.isLessThanOrEqualTo(0) || strategy.positionType === 'both')) {
        // 买入
        const price = new BigNumber(candle.close_price);
        const amount = position.isZero() ? 
          balance.dividedBy(price) : 
          position.abs();
        const fee = amount.multipliedBy(price).multipliedBy(strategy.buyFee);
        
        // 更新余额和持仓
        balance = balance.minus(amount.multipliedBy(price).plus(fee));
        position = position.plus(amount);
        
        if (position.isEqualTo(amount)) {
          // 开仓
          entryPrice = price;
        } else {
          // 平空仓
          // 计算毛利润
          const grossProfit = entryPrice.minus(price).multipliedBy(position.abs());
          // 计算开仓和平仓的总手续费
          const entryFee = position.abs().multipliedBy(entryPrice).multipliedBy(strategy.sellFee); // 开空仓是卖出操作
          const exitFee = position.abs().multipliedBy(price).multipliedBy(strategy.buyFee); // 平空仓是买入操作
          // 计算净利润（考虑手续费）
          const netProfit = grossProfit.minus(entryFee).minus(exitFee);
          const profitRate = entryPrice.minus(price).dividedBy(entryPrice).multipliedBy(100)
                            .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
                            .minus(new BigNumber(strategy.buyFee).multipliedBy(100));
          
          if (netProfit.isGreaterThan(0)) winningTrades++;
          else losingTrades++;
          
          balance = balance.plus(netProfit);
        }

        // 记录交易
        const tradeProfit = position.isEqualTo(amount) ? 
          null : 
          entryPrice.minus(price).multipliedBy(position.abs())
            .minus(position.abs().multipliedBy(entryPrice).multipliedBy(strategy.sellFee))
            .minus(position.abs().multipliedBy(price).multipliedBy(strategy.buyFee))
            .toNumber();
            
        const tradeProfitRate = position.isEqualTo(amount) ? 
          null : 
          entryPrice.minus(price).dividedBy(entryPrice).multipliedBy(100)
            .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
            .minus(new BigNumber(strategy.buyFee).multipliedBy(100))
            .toNumber();
            
        trades.push({
          backtestId: null, // 稍后填充
          timestamp,
          tradeType: 'buy',
          price: price.toNumber(),
          amount: amount.toNumber(),
          fee: fee.toNumber(),
          profit: tradeProfit,
          profitRate: tradeProfitRate,
          balance: balance.plus(position.isNegative() ? new BigNumber(0) : position.multipliedBy(price)).toNumber(),
          signalIndicatorId: buySignalConditionId,
        });
      }
      
      if (sellSignal && (position.isGreaterThanOrEqualTo(0) || strategy.positionType === 'both')) {
        // 卖出
        const price = new BigNumber(candle.close_price);
        const amount = position.isZero() ? 
          balance.dividedBy(price) : 
          position;
        const fee = amount.multipliedBy(price).multipliedBy(strategy.sellFee);
        
        // 更新余额和持仓
        balance = balance.plus(amount.multipliedBy(price)).minus(fee);
        position = position.minus(amount);
        
        if (position.isEqualTo(amount.negated())) {
          // 开空仓
          entryPrice = price;
        } else {
          // 平多仓
          // 计算毛利润
          const grossProfit = price.minus(entryPrice).multipliedBy(amount);
          // 计算开仓和平仓的总手续费
          const entryFee = amount.multipliedBy(entryPrice).multipliedBy(strategy.buyFee); // 开多仓是买入操作
          const exitFee = amount.multipliedBy(price).multipliedBy(strategy.sellFee); // 平多仓是卖出操作
          // 计算净利润（考虑手续费）
          const netProfit = grossProfit.minus(entryFee).minus(exitFee);
          const profitRate = price.minus(entryPrice).dividedBy(entryPrice).multipliedBy(100)
                            .minus(new BigNumber(strategy.buyFee).multipliedBy(100))
                            .minus(new BigNumber(strategy.sellFee).multipliedBy(100));
          
          if (netProfit.isGreaterThan(0)) winningTrades++;
          else losingTrades++;
          
          balance = balance.plus(netProfit);
        }

        // 记录交易
        const tradeProfit = position.isEqualTo(amount.negated()) ? 
          null : 
          price.minus(entryPrice).multipliedBy(amount)
            .minus(amount.multipliedBy(entryPrice).multipliedBy(strategy.buyFee))
            .minus(amount.multipliedBy(price).multipliedBy(strategy.sellFee))
            .toNumber();
            
        const tradeProfitRate = position.isEqualTo(amount.negated()) ? 
          null : 
          price.minus(entryPrice).dividedBy(entryPrice).multipliedBy(100)
            .minus(new BigNumber(strategy.buyFee).multipliedBy(100))
            .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
            .toNumber();
            
        trades.push({
          backtestId: null, // 稍后填充
          timestamp,
          tradeType: 'sell',
          price: price.toNumber(),
          amount: amount.toNumber(),
          fee: fee.toNumber(),
          profit: tradeProfit,
          profitRate: tradeProfitRate,
          balance: balance.plus(position.isPositive() ? new BigNumber(0) : position.abs().multipliedBy(price)).toNumber(),
          signalIndicatorId: sellSignalConditionId,
        });
      }

      // 更新最大回撤
      const currentPrice = new BigNumber(candle.close_price);
      const positionValue = position.multipliedBy(currentPrice);
      const currentBalance = balance.plus(positionValue);
      
      if (currentBalance.isGreaterThan(peakBalance)) {
        peakBalance = currentBalance;
      }
      
      const drawdown = peakBalance.isZero() ? 
        new BigNumber(0) : 
        peakBalance.minus(currentBalance).dividedBy(peakBalance).multipliedBy(100);
        
      if (drawdown.isGreaterThan(maxDrawdown)) {
        maxDrawdown = drawdown.toNumber();
      }

      // 记录每日收益率
      const dailyReturn = new BigNumber(initialCapital).isZero() ? 
        new BigNumber(0) : 
        currentBalance.minus(initialCapital).dividedBy(initialCapital);
      returns.push(dailyReturn.toNumber());
    }

    // 计算最终资金
    const finalCandle = priceData[priceData.length - 1];
    const finalPrice = new BigNumber(finalCandle.close_price);
    const finalCapital = balance.plus(position.multipliedBy(finalPrice));
    
    // 计算总收益和收益率
    const initialCapitalBN = new BigNumber(initialCapital);
    const totalProfit = finalCapital.minus(initialCapitalBN);
    const profitRate = initialCapitalBN.isZero() ? 
      new BigNumber(0) : 
      totalProfit.dividedBy(initialCapitalBN).multipliedBy(100);
    
    // 计算胜率
    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? 
      new BigNumber(winningTrades).dividedBy(totalTrades).multipliedBy(100).toNumber() : 
      0;
    
    // 计算夏普比率
    let avgReturn = new BigNumber(0);
    if (returns.length > 0) {
      const sumReturns = returns.reduce((sum, r) => sum.plus(r), new BigNumber(0));
      avgReturn = sumReturns.dividedBy(returns.length);
    }
    
    let stdReturn = new BigNumber(0);
    if (returns.length > 0) {
      const sumSquaredDiffs = returns.reduce((sum, r) => {
        const diff = new BigNumber(r).minus(avgReturn);
        return sum.plus(diff.multipliedBy(diff));
      }, new BigNumber(0));
      stdReturn = sumSquaredDiffs.dividedBy(returns.length).sqrt();
    }
    
    const sharpeRatio = stdReturn.isZero() ? 
      0 : 
      avgReturn.dividedBy(stdReturn).toNumber();

    // 创建回测结果
    const backtestResult = this.backtestResultRepository.create({
      strategyId: createBacktestDto.strategyId,
      pairId: createBacktestDto.pairId,
      timeframeId: createBacktestDto.timeframeId,
      startTime: new Date(createBacktestDto.startTime),
      endTime: new Date(createBacktestDto.endTime),
      initialCapital: initialCapital,
      finalCapital: finalCapital.toNumber(),
      totalProfit: totalProfit.toNumber(),
      profitRate: profitRate.toNumber(),
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
  
  /**
   * 检查并处理爆仓情况
   * @param position 当前持仓
   * @param balance 当前余额
   * @param entryPrice 开仓价格
   * @param currentPrice 当前价格
   * @param timestamp 当前时间戳
   * @param strategy 策略信息
   * @param trades 交易记录数组
   * @returns 处理结果，包含是否爆仓、更新后的持仓和余额
   */
  private checkAndHandleLiquidation(
    position: BigNumber,
    balance: BigNumber,
    entryPrice: BigNumber,
    currentPrice: BigNumber,
    timestamp: Date,
    strategy: any,
    trades: any[]
  ): { liquidated: boolean; position: BigNumber; balance: BigNumber } {
    // 默认返回值：未爆仓，持仓和余额保持不变
    const result = { liquidated: false, position, balance };
    
    // 只检查空仓的爆仓情况
    if (position.isLessThan(0)) {
      // 计算当前浮动亏损
      const entryValue = position.abs().multipliedBy(entryPrice);
      const currentValue = position.abs().multipliedBy(currentPrice);
      const unrealizedLoss = entryValue.minus(currentValue);
      
      // 获取策略的爆仓阈值（默认为90%）
      const liquidationThreshold = strategy.liquidationThreshold || 90;
      const liquidationThresholdDecimal = new BigNumber(liquidationThreshold).dividedBy(100);
      
      // 如果浮动亏损超过账户余额的阈值，触发爆仓
      if (unrealizedLoss.isGreaterThan(balance.multipliedBy(liquidationThresholdDecimal))) {
        // 计算爆仓后的实际余额
        // 1. 计算平仓时的手续费
        const liquidationFee = position.abs().multipliedBy(currentPrice).multipliedBy(strategy.buyFee);
        
        // 2. 计算平仓后的余额 = 当前余额 - 浮动亏损 - 平仓手续费
        const remainingBalance = BigNumber.maximum(
          new BigNumber(0),
          balance.minus(unrealizedLoss).minus(liquidationFee)
        );
        
        // 记录爆仓交易
        trades.push({
          backtestId: null,
          timestamp,
          tradeType: 'liquidation',
          price: currentPrice.toNumber(),
          amount: position.abs().toNumber(),
          fee: liquidationFee.toNumber(),
          profit: unrealizedLoss.plus(liquidationFee).negated().toNumber(), // 爆仓损失 = 浮动亏损 + 平仓手续费
          profitRate: unrealizedLoss.plus(liquidationFee).negated().dividedBy(balance).multipliedBy(100).toNumber(),
          balance: remainingBalance.toNumber(),
          signalIndicatorId: null,
        });
        
        // 更新结果：已爆仓，持仓清零，余额为剩余金额
        result.liquidated = true;
        result.position = new BigNumber(0);
        result.balance = remainingBalance;
      }
    }
    
    return result;
  }
}