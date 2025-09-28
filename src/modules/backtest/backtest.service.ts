import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BacktestResult, BacktestStatus } from './entities/backtest-result.entity';
import { BacktestTrade } from './entities/backtest-trade.entity';
import { CreateBacktestDto } from './dto/create-backtest.dto';
import { RedisService } from '../common/services/redis.service';
import { StrategiesService } from '../strategies/strategies.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { PriceDataService } from '../price-data/price-data.service';
import { PriceData } from '../price-data/entities/price-data.entity';
import BigNumber from 'bignumber.js';
import { VM } from 'vm2';
import * as fs from 'fs';

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
    private priceDataService: PriceDataService,
  ) {
    // console.log(fs, 'fs init');
    BigNumber.config({
      DECIMAL_PLACES: 10,
      ROUNDING_MODE: BigNumber.ROUND_DOWN
    });
  }

  async runBacktest(createBacktestDto: CreateBacktestDto): Promise<{ success: boolean; message: string; backtestId?: number }> {
    try {
      // 先验证策略是否存在
      const strategy = await this.strategiesService.getStrategyFromRedis(createBacktestDto.strategyId);
      if (!strategy) {
        throw new Error(`Strategy with id ${createBacktestDto.strategyId} not found`);
      }

      // 创建一个初始的回测记录，状态为"运行中"
      const initialBacktestResult = this.backtestResultRepository.create({
        strategyId: createBacktestDto.strategyId,
        pairId: createBacktestDto.pairId,
        timeframeId: createBacktestDto.timeframeId,
        startTime: new Date(createBacktestDto.startTime),
        endTime: new Date(createBacktestDto.endTime),
        initialCapital: createBacktestDto.initialCapital,
        finalCapital: 0, // 初始值
        totalProfit: 0, // 初始值
        profitRate: 0, // 初始值
        maxDrawdown: 0, // 初始值
        totalTrades: 0, // 初始值
        winningTrades: 0, // 初始值
        losingTrades: 0, // 初始值
        winRate: 0, // 初始值
        sharpeRatio: 0, // 初始值
        earlyStopped: false,
        earlyStopReason: null,
        earlyStopTime: null,
        // 添加状态字段来标识回测状态
        status: BacktestStatus.RUNNING,
      });

      const savedInitialResult = await this.backtestResultRepository.save(initialBacktestResult);

      // 异步执行回测计算
      this.executeBacktestAsync(createBacktestDto, savedInitialResult.id, strategy).catch(error => {
        console.error('回测执行失败:', error);
        // 更新回测状态为失败
        this.updateBacktestStatus(savedInitialResult.id, BacktestStatus.FAILED, error.message);
      });

      // 立即返回成功响应
      return {
        success: true,
        message: '回测已开始执行，请稍后使用 findAll 或 findOne 查询结果',
        backtestId: savedInitialResult.id
      };

    } catch (error) {
      return {
        success: false,
        message: error.message || '启动回测失败'
      };
    }
  }

  /**
   * 异步执行回测计算
   */
  private async executeBacktestAsync(
    createBacktestDto: CreateBacktestDto, 
    backtestId: number, 
    strategy: any
  ): Promise<void> {
    try {
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

      // 执行回测计算
      const backtestResult = await this.executeBacktestCalculation(
        strategy,
        priceData,
        createBacktestDto.initialCapital,
        createBacktestDto,
        backtestId,
      );

      // 更新回测结果
      await this.backtestResultRepository.update(backtestId, {
        finalCapital: backtestResult.finalCapital,
        totalProfit: backtestResult.totalProfit,
        profitRate: backtestResult.profitRate,
        maxDrawdown: backtestResult.maxDrawdown,
        totalTrades: backtestResult.totalTrades,
        winningTrades: backtestResult.winningTrades,
        losingTrades: backtestResult.losingTrades,
        winRate: backtestResult.winRate,
        sharpeRatio: backtestResult.sharpeRatio,
        earlyStopped: backtestResult.earlyStopped,
        earlyStopReason: backtestResult.earlyStopReason,
        earlyStopTime: backtestResult.earlyStopTime,
        status: BacktestStatus.COMPLETED,
      });

      // 保存回测结果到Redis
      await this.saveBacktestToRedis(backtestId);

    } catch (error) {
      console.error('回测计算失败:', error);
      await this.updateBacktestStatus(backtestId, BacktestStatus.FAILED, error.message);
    }
  }

  /**
   * 更新回测状态
   */
  private async updateBacktestStatus(backtestId: number, status: BacktestStatus, errorMessage?: string): Promise<void> {
    try {
      const updateData: any = { status };
      if (status === BacktestStatus.FAILED && errorMessage) {
        updateData.earlyStopReason = errorMessage;
        updateData.earlyStopped = true;
        updateData.earlyStopTime = new Date();
      }
      await this.backtestResultRepository.update(backtestId, updateData);
    } catch (error) {
      console.error('更新回测状态失败:', error);
    }
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
  ): Promise<PriceData[] | null> {
    // 使用Redis服务的getOrSet方法，处理缓存击穿
    const cacheKey = `price_data:${pairId}:${timeframeId}:${startTime.getTime()}:${endTime.getTime()}`;
    
    return this.redisService.getOrSet(
      cacheKey,
      async () => {
        // 使用PriceDataService获取价格数据
        const priceData = await this.priceDataService.findPriceDataByRange(
          pairId,
          timeframeId,
          startTime.getTime(),
          endTime.getTime()
        );

        return priceData && priceData.length > 0 ? priceData : null;
      },
      3600 // 缓存1小时
    );
  }

  private async executeBacktestCalculation(
    strategy: any,
    priceData: PriceData[],
    initialCapital: number,
    createBacktestDto: CreateBacktestDto,
    backtestId: number,
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

    // 计算所有指标的值 - 使用数组下标存储
    const indicatorValues = [];
    for (let indicatorIndex = 0; indicatorIndex < strategy.indicators.length; indicatorIndex++) {
      const indicator = strategy.indicators[indicatorIndex];
      
      // 获取指标参数
      const parameters = {};
      // 通过parameterId获取参数名称，然后设置参数值
      for (const param of indicator.parameters) {
        // 从indicators服务获取参数定义来获取参数名称
        const parameterDefinition = await this.indicatorsService.findParameterById(param.parameterId);
        if (parameterDefinition) {
          parameters[parameterDefinition.name] = param.value;
        }
      }

      // 计算指标值
      const indicatorResult = await this.indicatorsService.calculateIndicator(
        indicator.indicatorId,
        priceData,
        parameters,
      );

      // 使用数组下标存储指标值，这样同一指标的不同参数配置可以通过下标区分
      indicatorValues[indicatorIndex] = indicatorResult;
    }
    console.log(indicatorValues);
        // 初始化提前结束信息
    let earlyStopInfo = {
      earlyStopped: false,
      earlyStopReason: null,
      earlyStopTime: null
    };

    // 遍历价格数据
    for (let i = 1; i < priceData.length; i++) {  // 从1开始，因为我们需要前一个时间点的数据
      const candle = priceData[i];
      // 确保时间戳是有效的Date对象
      let timestamp: Date = new Date(Number(candle.timestamp));
      if (typeof candle.timestamp === 'number') {
        timestamp = new Date(candle.timestamp);
      } else if (candle.timestamp as any instanceof Date) {
        timestamp = candle.timestamp;
      } else {
        // 如果时间戳格式不正确，使用当前时间作为备用
        // console.warn(`Invalid timestamp type: ${typeof candle.timestamp}`, `Invalid timestamp format for candle: ${candle.timestamp}, using current time as fallback`);
        timestamp = new Date(Number(candle.timestamp));
      }
      
      // 验证创建的Date对象是否有效
      if (isNaN(timestamp.getTime())) {
        console.warn(`Invalid timestamp value: ${candle.timestamp}, using current time as fallback`);
        timestamp = new Date();
      }
      const prevCandle = priceData[i - 1];
    
      // 获取提前结束阈值（默认为10%）
      const earlyStopThreshold = createBacktestDto.earlyStopThreshold || 10;
      const earlyStopThresholdDecimal = new BigNumber(earlyStopThreshold).dividedBy(100);
      
      // 检查资金是否已经低于初始资金的阈值且没有持仓，如果是则提前结束回测
      if (balance.isLessThan(new BigNumber(initialCapital).multipliedBy(earlyStopThresholdDecimal)) && position.isZero()) {
        console.log(`回测提前结束: 资金已低于初始资金的${earlyStopThreshold}%，当前资金: ${balance.toNumber()}, 初始资金: ${initialCapital}`);
        
        // 记录提前结束的信息
        earlyStopInfo = {
          earlyStopped: true,
          earlyStopReason: `资金已低于初始资金的${earlyStopThreshold}%`,
          earlyStopTime: timestamp
        };
        
        // 提前结束回测
        break;
      }
      
      // 检查是否爆仓
      const liquidationResult = this.checkAndHandleLiquidation(
        position, 
        balance, 
        entryPrice, 
        new BigNumber(candle.closePrice),
        timestamp, 
        strategy, 
        trades
      );
      
      if (liquidationResult.liquidated) {
        position = liquidationResult.position;
        balance = liquidationResult.balance;
        losingTrades++;
        // 重置入场价格
        entryPrice = new BigNumber(0);
        continue;
      }

      // 检查止盈止损
      const stopResult = this.checkAndHandleStopLoss(
        position,
        balance,
        entryPrice,
        new BigNumber(candle.closePrice),
        timestamp,
        strategy,
        trades
      );

      if (stopResult.stopped) {
        position = stopResult.position;
        balance = stopResult.balance;
        if (stopResult.profit > 0) {
          winningTrades++;
        } else {
          losingTrades++;
        }
        // 重置入场价格
        entryPrice = new BigNumber(0);
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
        // 买入逻辑：只有在没有多头仓位或策略允许双向交易时才买入
        const price = new BigNumber(candle.closePrice);
        
        // 获取仓位分配参数（默认为1，表示全仓交易）
        const positionDivision = createBacktestDto.positionDivision || 1;
        
        // 计算交易数量，考虑仓位分配
        let amount;
        // 用于计算买入数量的价格
        const tempPrice = price.multipliedBy(strategy.buyFee).plus(price);
        // 用于计算买入手续费的价格
        const buyFeePrice = price.multipliedBy(strategy.buyFee);
        
        if (position.isZero()) {
          // 开仓时按仓位分配
          amount = balance.dividedBy(tempPrice).dividedBy(positionDivision);
        } else if (position.isLessThan(0)) {
          // 平空仓时使用全部持仓
          amount = position.abs();
        } else {
          // 加仓逻辑：已有多头仓位且还有余额
          // 计算当前仓位价值
          const positionValue = position.multipliedBy(price);
          // 计算总价值 = 仓位价值 + 余额
          const totalValue = positionValue.plus(balance);
          // 计算理想加仓金额
          const idealAddAmount = totalValue.dividedBy(positionDivision);
          
          // 如果余额大于理想加仓金额，则使用理想加仓金额
          // 否则全部投入
          const addAmount = balance.isGreaterThan(idealAddAmount) ? 
            idealAddAmount : 
            balance;
            
          // 计算可以购买的数量
          amount = addAmount.dividedBy(tempPrice);
        }

        // 如果amount < 0.000000001 则不交易
        if (!amount.isLessThan(0.000000001)) {
          
          const fee = amount.multipliedBy(buyFeePrice);
          
          // 检查交易后余额是否会为负
          balance = balance.minus(amount.multipliedBy(tempPrice));
          // if (newBalance.isLessThan(0)) {
          //   // 如果余额会为负，调整交易数量
          //   const maxAmount = balance.dividedBy(tempPrice);
          //   amount = BigNumber.max(0, maxAmount);
          //   // 重新计算费用和余额
          //   balance = balance.minus(amount.multipliedBy(tempPrice));
          // } else {
          //   // 更新余额和持仓
          //   balance = newBalance;
          // }
          
          // 保存旧持仓数量，用于判断操作类型
          const oldPosition = position.toNumber();
          position = position.plus(amount);
        
          if (oldPosition === 0) {
            // 开仓
            entryPrice = price;
          } else if (oldPosition < 0 && position.isGreaterThanOrEqualTo(0)) {
            // 平空仓 - 计算利润用于统计，同时更新余额
            const grossProfit = entryPrice.minus(price).multipliedBy(amount.abs());
            const entryFee = amount.abs().multipliedBy(entryPrice).multipliedBy(strategy.sellFee);
            const exitFee = amount.abs().multipliedBy(buyFeePrice);
            const netProfit = grossProfit.minus(entryFee).minus(exitFee);
            
            if (netProfit.isGreaterThan(0)) winningTrades++;
            else losingTrades++;
            
            // 平空仓时：余额 = 余额 + 之前的卖出价的金额（卖出手续费已在开仓时处理）
            // 注意：手续费在每次计算中已经处理，前面处理了平空仓买入的金额，现在要加上空仓卖出的金额
            balance = balance.plus(entryPrice.multipliedBy(amount.abs()));
          } else if (oldPosition > 0) {
            // 加仓 - 计算新的平均持仓价格
            // 计算旧仓位价值
            const oldPositionValue = new BigNumber(oldPosition).multipliedBy(entryPrice);
            // 计算新增仓位价值
            const newPositionValue = amount.multipliedBy(price);
            // 计算总仓位价值
            const totalPositionValue = oldPositionValue.plus(newPositionValue);
            // 计算新的平均持仓价格
            entryPrice = totalPositionValue.dividedBy(position);
          }

          // 记录交易
          let tradeProfit = null;
          let tradeProfitRate = null;
          
          // 如果是平空仓，计算利润
          if (oldPosition < 0 && position.isGreaterThanOrEqualTo(0)) {
            tradeProfit = entryPrice.minus(price).multipliedBy(new BigNumber(Math.min(Math.abs(oldPosition), amount.toNumber())))
              .minus(new BigNumber(Math.min(Math.abs(oldPosition), amount.toNumber())).multipliedBy(entryPrice).multipliedBy(strategy.sellFee))
              .minus(new BigNumber(Math.min(Math.abs(oldPosition), amount.toNumber())).multipliedBy(price).multipliedBy(strategy.buyFee))
              .toNumber();
              
            tradeProfitRate = entryPrice.minus(price).dividedBy(entryPrice).multipliedBy(100)
              .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
              .minus(new BigNumber(strategy.buyFee).multipliedBy(100))
              .toNumber();
          }
              
          trades.push({
            backtestId: null, // 稍后填充
            timestamp,
            tradeType: 'buy',
            price: price.toNumber(),
            amount: amount.toNumber(),
            fee: fee.toNumber(),
            profit: tradeProfit,
            profitRate: tradeProfitRate,
            balance: balance.toNumber(), // 使用实际的现金余额，不包含仓位价值
            signalIndicatorId: buySignalConditionId,
          });
        }
      }
      
      if (sellSignal && (position.isGreaterThan(0) || (strategy.positionType === 'both' && balance.isGreaterThan(0)))) {
        // 卖出逻辑：只有在持有多头仓位或策略允许双向交易且有足够余额时才卖出
        const price = new BigNumber(candle.closePrice);
        
        // 获取仓位分配参数（默认为1，表示全仓交易）
        const positionDivision = createBacktestDto.positionDivision || 1;
        
        // 计算交易数量，考虑仓位分配
        let amount;
        // 用于计算卖出数量的价格包含手续费和保证金
        const tempPrice = price.multipliedBy(strategy.sellFee).plus(price);
        // 用于计算卖出手续费的价格
        const sellFeePrice = price.multipliedBy(strategy.sellFee);
        
        if (position.isZero()) {
          // 开空仓时按仓位分配，但需要有足够余额
          const maxShortAmount = balance.dividedBy(tempPrice).dividedBy(positionDivision);
          // 确保不会卖空超过可用余额
          amount = BigNumber.min(maxShortAmount, balance.dividedBy(tempPrice).multipliedBy(0.95)); // 使用95%的可用余额，留一些缓冲
        } else if (position.isGreaterThan(0)) {
          // 平多仓时使用全部持仓
          amount = position;
        } else {
          // 加仓逻辑：已有空头仓位且还有余额
          // 计算空仓收益 = (开仓价格 - 当前价格) * 仓位数量
          const shortProfit = entryPrice.minus(price).multipliedBy(position.abs());
          // 总价值 = 余额 + 空仓收益
          const totalValue = balance.plus(shortProfit);
          // 计算理想加仓金额
          const idealAddAmount = totalValue.dividedBy(positionDivision);

          // 当前可用余额 = 余额 - 已经空仓的金额
          const availableBalance = balance.minus(entryPrice.multipliedBy(position.abs()));

          // 确保加仓金额不超过可用余额
          const addAmount = totalValue.isGreaterThan(0) && availableBalance.isGreaterThan(idealAddAmount) ? 
            idealAddAmount : 
            BigNumber.max(0, availableBalance);
            
          // 计算可以卖出的数量
          amount = addAmount.dividedBy(tempPrice);
        }

        // 如果amount < 0.000000001 则不交易
        if (!amount.isLessThan(0.000000001)) {
          const fee = amount.multipliedBy(sellFeePrice);
          
          // 做空时余额不会增加，只会减少手续费, 但是要考虑到做空需要支付的保证金
          // 检查余额是否足够支付手续费
          // if (balance.isLessThan(fee)) {
          //   // 如果余额不足以支付手续费，调整交易数量
          //   const maxAmount = balance.dividedBy(tempPrice);
          //   amount = BigNumber.max(0, maxAmount);
          // }
          
          // 更新余额（空仓都减少手续费，平多的时候再去添加卖出金额），
          const adjustedFee = amount.multipliedBy(sellFeePrice);
          balance = balance.minus(adjustedFee);
          
          // 保存旧持仓数量，用于判断操作类型
          const oldPosition = position.toNumber();
          position = position.minus(amount);
          
          if (oldPosition === 0) {
            // 开空仓
            entryPrice = price;
          } else if (oldPosition > 0 && position.isLessThanOrEqualTo(0)) {
            // 平多仓 - 计算利润用于统计，同时更新余额
            const grossProfit = price.minus(entryPrice).multipliedBy(amount);
            const entryFee = amount.multipliedBy(entryPrice).multipliedBy(strategy.buyFee);
            const exitFee = amount.multipliedBy(sellFeePrice);
            const netProfit = grossProfit.minus(entryFee).minus(exitFee);
            
            if (netProfit.isGreaterThan(0)) winningTrades++;
            else losingTrades++;
            
            // 平多仓时：余额 = 余额 + 平仓金额 - 平仓手续费（买入手续费已在开仓时处理）
            // 注意：买入手续费在开多仓时已经处理，这里只处理卖出平仓的手续费, 平仓手续费在上面已处理
            balance = balance.plus(price.multipliedBy(amount));
          } else if (oldPosition < 0) {
            // 加仓 - 计算新的平均持仓价格
            // 计算旧仓位价值
            const oldPositionValue = new BigNumber(Math.abs(oldPosition)).multipliedBy(entryPrice);
            // 计算新增仓位价值
            const newPositionValue = amount.multipliedBy(price);
            // 计算总仓位价值
            const totalPositionValue = oldPositionValue.plus(newPositionValue);
            // 计算新的平均持仓价格
            entryPrice = totalPositionValue.dividedBy(position.abs());
          }

          // 记录交易
          let tradeProfit = null;
          let tradeProfitRate = null;
          
          // 如果是平多仓，计算利润
          if (oldPosition > 0 && position.isLessThanOrEqualTo(0)) {
            tradeProfit = price.minus(entryPrice).multipliedBy(new BigNumber(Math.min(oldPosition, amount.toNumber())))
              .minus(new BigNumber(Math.min(oldPosition, amount.toNumber())).multipliedBy(entryPrice).multipliedBy(strategy.buyFee))
              .minus(new BigNumber(Math.min(oldPosition, amount.toNumber())).multipliedBy(price).multipliedBy(strategy.sellFee))
              .toNumber();
              
            tradeProfitRate = price.minus(entryPrice).dividedBy(entryPrice).multipliedBy(100)
              .minus(new BigNumber(strategy.buyFee).multipliedBy(100))
              .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
              .toNumber();
          }
              
          trades.push({
            backtestId: null, // 稍后填充
            timestamp,
            tradeType: 'sell',
            price: price.toNumber(),
            amount: amount.toNumber(),
            fee: fee.toNumber(),
            profit: tradeProfit,
            profitRate: tradeProfitRate,
            balance: balance.toNumber(), // 使用实际的现金余额，不包含仓位价值
            signalIndicatorId: sellSignalConditionId,
          });
        }
      }

      // 更新最大回撤
      const currentPrice = new BigNumber(candle.closePrice);
      // 计算空仓收益 = (开仓价格 - 当前价格) * 仓位数量
      const shortProfit = position.isLessThan(0) && entryPrice ? 
        entryPrice.minus(currentPrice).multipliedBy(position.abs()) : 
        new BigNumber(0);
      // 计算多仓价值 
      const longProfit = position.isGreaterThan(0) && entryPrice ? 
        currentPrice.multipliedBy(position.abs()) : 
        new BigNumber(0);
      const currentBalance = balance.plus(shortProfit).plus(longProfit);
      
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
    const finalPrice = new BigNumber(finalCandle.closePrice);
    // 计算空仓收益 = (开仓价格 - 最终价格) * 仓位数量
    const finalShortProfit = position.isLessThan(0) && entryPrice ? 
      entryPrice.minus(finalPrice).multipliedBy(position.abs()) : 
      new BigNumber(0);
    const finalCapital = balance.plus(finalShortProfit).plus(finalPrice.multipliedBy(position));
    
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

    // 保存交易记录
    for (const trade of trades) {
      trade.backtestId = backtestId;
    }
    console.log(
      'trades', trades.length,
      'backtestId', backtestId, 
      'initialCapital', initialCapital, 
      'finalCapital', finalCapital
    );
    // 保存交易记录到txt中
    fs.writeFileSync(`./trades.txt`, JSON.stringify(trades));
    // 保存交易记录
    await this.backtestTradeRepository.save(trades);

    // 返回计算结果
    return {
      finalCapital: finalCapital.toNumber(),
      totalProfit: totalProfit.toNumber(),
      profitRate: profitRate.toNumber(),
      maxDrawdown,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      sharpeRatio,
      // 添加提前结束信息
      earlyStopped: earlyStopInfo.earlyStopped,
      earlyStopReason: earlyStopInfo.earlyStopReason,
      earlyStopTime: earlyStopInfo.earlyStopTime,
    } as any;
  }

  private checkCondition(
    condition: any, 
    indicatorValues: any[], 
    index: number, 
    priceData: PriceData[]
  ): boolean {
    // 如果有自定义代码，优先使用代码逻辑
    if (condition.customCode && condition.customCode.trim()) {
      return this.executeCustomCode(condition.customCode, indicatorValues, index, priceData);
    }

    /* 使用指标下标获取指标值 */
    const indicatorIndex = condition.indicatorIndex;
    const indicatorResult = indicatorValues[indicatorIndex];
    if (!indicatorResult) return false;

    /* 从指标结果中提取当前值和前一个值，支持对象属性路径 */
    const currentValue = this.extractValueByPath(indicatorResult[index], condition.currentValuePath);
    const prevValue = this.extractValueByPath(indicatorResult[index - 1], condition.currentValuePath);

    // 根据比较类型和条件类型检测信号
    if (condition.comparisonType === 'indicator') {
      // 与另一个指标比较
      const comparedIndicatorIndex = condition.comparedIndicatorIndex;
      // 验证被比较指标下标是否存在
      if (comparedIndicatorIndex === null || comparedIndicatorIndex === undefined) {
        throw new Error(`条件 ${condition.id} 的比较类型为 indicator，但未提供 comparedIndicatorIndex`);
      }
      const comparedResult = indicatorValues[comparedIndicatorIndex];
      if (!comparedResult) return false;

      /* 从比较指标结果中提取值，支持对象属性路径 */
      const currentComparedValue = this.extractValueByPath(comparedResult[index], condition.comparedValuePath);
      const prevComparedValue = this.extractValueByPath(comparedResult[index - 1], condition.comparedValuePath);

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
      
      if (condition.conditionType === 'crossover') {
        // 交叉条件
        if (condition.operator === '>') {
          // 上穿
          return currentValue > constantValue && prevValue <= constantValue;
        } else if (condition.operator === '<') {
          // 下穿
          return currentValue < constantValue && prevValue >= constantValue;
        }
      } else if (condition.conditionType === 'value') {
        // 值比较
        return this.compareValues(currentValue, constantValue, condition.operator);
      }
    }

    return false;
  }

  /**
   * 执行自定义代码逻辑
   * @param code 要执行的代码
   * @param indicatorValues 指标值数组
   * @param index 当前索引
   * @param priceData 价格数据
   * @returns 执行结果，必须返回boolean
   */
  private executeCustomCode(
    code: string,
    indicatorValues: any[],
    index: number,
    priceData: PriceData[]
  ): boolean {
    try {
      // 创建VM实例，设置超时时间为10分钟
      const vm = new VM({
        timeout: 10 * 60 * 1000, // 10分钟超时
        sandbox: {
          // 提供给代码的上下文变量
          indicatorValues,
          index,
          priceData,
          BigNumber,
          // 提供一些常用的数学函数
          Math,
          // 提供当前和前一个价格数据的快捷访问
          current: priceData[index],
          previous: index > 0 ? priceData[index - 1] : null,
          // 提供计算平均值的辅助函数
          average: (arr: number[]) => {
            if (!arr || arr.length === 0) return 0;
            const sum = arr.reduce((a, b) => a + b, 0);
            return sum / arr.length;
          },
          // 提供计算标准差的辅助函数
          standardDeviation: (arr: number[]) => {
            if (!arr || arr.length === 0) return 0;
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
            return Math.sqrt(avgSquareDiff);
          },
          // 提供获取历史数据的辅助函数
          getHistoricalData: (startIndex: number, endIndex: number) => {
            const start = Math.max(0, startIndex);
            const end = Math.min(priceData.length - 1, endIndex);
            return priceData.slice(start, end + 1);
          },
          // 提供获取指标历史数据的辅助函数
          getIndicatorHistoricalData: (indicatorIndex: number, startIndex: number, endIndex: number) => {
            if (!indicatorValues[indicatorIndex]) return [];
            const start = Math.max(0, startIndex);
            const end = Math.min(indicatorValues[indicatorIndex].length - 1, endIndex);
            return indicatorValues[indicatorIndex].slice(start, end + 1);
          }
        }
      });

      // 执行代码并获取结果
      const result = vm.run(`
        // 用户代码在这里执行
        (function() {
          ${code}
        })()
      `);

      // 确保返回值是boolean类型
      if (typeof result !== 'boolean') {
        console.warn(`自定义代码返回值不是boolean类型，实际返回: ${typeof result}, 值: ${result}`);
        return Boolean(result);
      }

      return result;
    } catch (error) {
      console.error('执行自定义代码时发生错误:', error);
      // 代码执行失败时返回false，避免影响回测
      return false;
    }
  }

  /* 从对象中根据属性路径提取值，支持点分隔的深层属性访问 */
  private extractValueByPath(obj: any, path?: string): any {
    /* 如果没有指定路径，直接返回对象本身 */
    if (!path || path.trim() === '') {
      return obj;
    }

    /* 如果对象为 null 或 undefined，返回 null */
    if (obj == null) {
      return null;
    }

    /* 按点分隔路径，逐层访问对象属性 */
    const pathParts = path.split('.');
    let result = obj;

    for (const part of pathParts) {
      if (result == null || typeof result !== 'object') {
        return null;
      }
      result = result[part];
    }

    return result;
  }

  private compareValues(value1: any, value2: any, operator: string): boolean {
    /* 如果任一值为 null 或 undefined，返回 false */
    if (value1 == null || value2 == null) {
      return false;
    }

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

  async getBacktestFromRedis(backtestId: number): Promise<(BacktestResult & { trades: BacktestTrade[] }) | null> {
    return this.redisService.getOrSet(
      `backtest:${backtestId}`,
      async () => {
        // 当Redis中没有数据时，这个函数会被调用
        const backtest = await this.backtestResultRepository.findOne({ where: { id: backtestId } });
        if (!backtest) {
          return null;
        }
        
        // 获取交易记录
        const trades = await this.backtestTradeRepository.find({ 
          where: { backtestId },
          order: { timestamp: 'ASC' }
        });
        
        // 返回完整的回测对象
        return {
          ...backtest,
          trades,
        };
      },
      3600 // 缓存1小时
    );
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

  /**
   * 检查并处理止盈止损
   * @param position 当前持仓
   * @param balance 当前余额
   * @param entryPrice 开仓价格
   * @param currentPrice 当前价格
   * @param timestamp 当前时间戳
   * @param strategy 策略信息
   * @param trades 交易记录数组
   * @returns 处理结果，包含是否触发止盈止损、更新后的持仓和余额、利润
   */
  private checkAndHandleStopLoss(
    position: BigNumber,
    balance: BigNumber,
    entryPrice: BigNumber,
    currentPrice: BigNumber,
    timestamp: Date,
    strategy: any,
    trades: any[]
  ): { stopped: boolean; position: BigNumber; balance: BigNumber; profit: number } {
    // 默认返回值：未触发止盈止损，持仓和余额保持不变
    const result = { stopped: false, position, balance, profit: 0 };
    
    // 只有在有持仓且有入场价格时才检查止盈止损
    if (position.isZero() || entryPrice.isZero()) {
      return result;
    }

    let shouldStop = false;
    let stopType = '';
    let stopRatio = new BigNumber(0);

    if (position.isGreaterThan(0)) {
      // 多头持仓
      const currentRatio = currentPrice.dividedBy(entryPrice).multipliedBy(100);
      
      // 检查止盈
      if (strategy.takeProfitRatio && currentRatio.isGreaterThanOrEqualTo(strategy.takeProfitRatio)) {
        shouldStop = true;
        stopType = 'take_profit';
        stopRatio = new BigNumber(strategy.takeProfitRatio);
      }
      // 检查止损
      else if (strategy.stopLossRatio && currentRatio.isLessThanOrEqualTo(strategy.stopLossRatio)) {
        shouldStop = true;
        stopType = 'stop_loss';
        stopRatio = new BigNumber(strategy.stopLossRatio);
      }
    } else if (position.isLessThan(0)) {
      // 空头持仓
      const currentRatio = entryPrice.dividedBy(currentPrice).multipliedBy(100);
      
      // 检查止盈（空头：价格下跌时止盈）
      if (strategy.takeProfitRatio && currentRatio.isGreaterThanOrEqualTo(strategy.takeProfitRatio)) {
        shouldStop = true;
        stopType = 'take_profit';
        stopRatio = new BigNumber(strategy.takeProfitRatio);
      }
      // 检查止损（空头：价格上涨时止损）
      else if (strategy.stopLossRatio && currentRatio.isLessThanOrEqualTo(strategy.stopLossRatio)) {
        shouldStop = true;
        stopType = 'stop_loss';
        stopRatio = new BigNumber(strategy.stopLossRatio);
      }
    }

    if (shouldStop) {
      // 计算平仓手续费
      const fee = position.abs().multipliedBy(currentPrice).multipliedBy(
        position.isGreaterThan(0) ? strategy.sellFee : strategy.buyFee
      );

      // 计算利润
      let profit: BigNumber;
      if (position.isGreaterThan(0)) {
        // 多头平仓利润 = (当前价格 - 入场价格) * 持仓数量 - 开仓手续费 - 平仓手续费
        const openFee = position.multipliedBy(entryPrice).multipliedBy(strategy.buyFee);
        profit = currentPrice.minus(entryPrice).multipliedBy(position).minus(openFee).minus(fee);
      } else {
        // 空头平仓利润 = (入场价格 - 当前价格) * 持仓数量 - 开仓手续费 - 平仓手续费
        const openFee = position.abs().multipliedBy(entryPrice).multipliedBy(strategy.sellFee);
        profit = entryPrice.minus(currentPrice).multipliedBy(position.abs()).minus(openFee).minus(fee);
      }

      // 计算利润率
      const profitRate = position.isGreaterThan(0) 
        ? currentPrice.minus(entryPrice).dividedBy(entryPrice).multipliedBy(100)
            .minus(new BigNumber(strategy.buyFee).multipliedBy(100))
            .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
        : entryPrice.minus(currentPrice).dividedBy(entryPrice).multipliedBy(100)
            .minus(new BigNumber(strategy.sellFee).multipliedBy(100))
            .minus(new BigNumber(strategy.buyFee).multipliedBy(100));

      // 更新余额
      const newBalance = balance.plus(profit);

      // 记录止盈止损交易
      trades.push({
        backtestId: null,
        timestamp,
        tradeType: stopType,
        price: currentPrice.toNumber(),
        amount: position.abs().toNumber(),
        fee: fee.toNumber(),
        profit: profit.toNumber(),
        profitRate: profitRate.toNumber(),
        balance: newBalance.toNumber(),
        signalIndicatorId: null,
      });

      // 更新结果
      result.stopped = true;
      result.position = new BigNumber(0); // 清空持仓
      result.balance = newBalance;
      result.profit = profit.toNumber();
    }

    return result;
  }
}
