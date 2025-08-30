# 回测系统 API

回测系统模块提供策略回测执行、结果查询和交易记录分析功能。

## 回测接口

### 1. 运行回测

**POST** `/backtest`

执行策略回测。

**请求体：**
```json
{
  "strategyId": 1,
  "pairId": 1,
  "timeframeId": 1,
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.000Z",
  "initialCapital": 10000,
  "earlyStopThreshold": 10,
  "positionDivision": 1
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| strategyId | number | 是 | 策略ID |
| pairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间框架ID |
| startTime | string | 是 | 回测开始时间 |
| endTime | string | 是 | 回测结束时间 |
| initialCapital | number | 是 | 初始资金 |
| earlyStopThreshold | number | 否 | 提前结束阈值（百分比），默认为10 |
| positionDivision | number | 否 | 仓位分割数，默认为1（全仓交易） |

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 10000,
    "finalCapital": 12500,
    "totalProfit": 2500,
    "totalReturn": 25.0,
    "totalTrades": 45,
    "winningTrades": 28,
    "losingTrades": 17,
    "winRate": 62.22,
    "maxDrawdown": 8.5,
    "sharpeRatio": 1.45,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  },
  "message": "回测执行成功",
  "timestamp": 1704096000000,
  "path": "/backtest"
}
```

**回测结果字段说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 回测结果ID |
| strategyId | number | 使用的策略ID |
| pairId | number | 交易对ID |
| timeframeId | number | 时间框架ID |
| startTime | string | 回测开始时间 |
| endTime | string | 回测结束时间 |
| initialCapital | number | 初始资金 |
| finalCapital | number | 最终资金 |
| totalProfit | number | 总盈亏 |
| totalReturn | number | 总收益率（%） |
| totalTrades | number | 总交易次数 |
| winningTrades | number | 盈利交易次数 |
| losingTrades | number | 亏损交易次数 |
| winRate | number | 胜率（%） |
| maxDrawdown | number | 最大回撤（%） |
| sharpeRatio | number | 夏普比率 |

### 2. 获取所有回测结果

**GET** `/backtest`

获取所有回测结果列表。

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-12-31T23:59:59.000Z",
      "initialCapital": 10000,
      "finalCapital": 12500,
      "totalProfit": 2500,
      "totalReturn": 25.0,
      "totalTrades": 45,
      "winningTrades": 28,
      "losingTrades": 17,
      "winRate": 62.22,
      "maxDrawdown": 8.5,
      "sharpeRatio": 1.45,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:30:00.000Z"
    }
  ],
  "message": "回测结果查询成功",
  "timestamp": 1704096000000,
  "path": "/backtest"
}
```

### 3. 获取单个回测结果

**GET** `/backtest/:id`

根据ID获取特定回测结果的详细信息。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 回测结果ID |

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "strategyId": 1,
    "tradingPairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 10000,
    "finalCapital": 12500,
    "totalProfit": 2500,
    "totalReturn": 25.0,
    "totalTrades": 45,
    "winningTrades": 28,
    "losingTrades": 17,
    "winRate": 62.22,
    "maxDrawdown": 8.5,
    "sharpeRatio": 1.45,
    "strategy": {
      "id": 1,
      "name": "MA交叉策略",
      "description": "基于短期和长期移动平均线交叉的交易策略"
    },
    "tradingPair": {
      "id": 1,
      "symbol": "BTCUSDT",
      "baseAsset": "BTC",
      "quoteAsset": "USDT"
    },
    "timeframe": {
      "id": 1,
      "name": "1h",
      "intervalMinutes": 60
    },
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  },
  "message": "回测结果查询成功",
  "timestamp": 1704096000000,
  "path": "/backtest/1"
}
```

### 4. 获取回测交易记录

**GET** `/backtest/:id/trades`

获取指定回测的所有交易记录。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 回测结果ID |

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "backtestResultId": 1,
      "type": "buy",
      "timestamp": "2024-01-15T09:30:00.000Z",
      "price": 50500.00,
      "quantity": 0.1,
      "amount": 5050.00,
      "commission": 5.05,
      "balance": 4944.95,
      "position": 0.1,
      "createdAt": "2024-01-01T10:15:00.000Z"
    },
    {
      "id": 2,
      "backtestResultId": 1,
      "type": "sell",
      "timestamp": "2024-01-20T14:45:00.000Z",
      "price": 52000.00,
      "quantity": 0.1,
      "amount": 5200.00,
      "commission": 5.20,
      "balance": 10139.75,
      "position": 0,
      "createdAt": "2024-01-01T10:20:00.000Z"
    }
  ],
  "message": "交易记录查询成功",
  "timestamp": 1704096000000,
  "path": "/backtest/1/trades"
}
```

**交易记录字段说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 交易记录ID |
| backtestResultId | number | 回测结果ID |
| type | string | 交易类型（buy, sell） |
| timestamp | string | 交易时间 |
| price | number | 交易价格 |
| quantity | number | 交易数量 |
| amount | number | 交易金额 |
| commission | number | 手续费 |
| balance | number | 交易后余额 |
| position | number | 交易后持仓 |

## 回测性能指标

### 1. 收益指标
- **总收益率 (Total Return)**: (最终资金 - 初始资金) / 初始资金 × 100%
- **年化收益率 (Annualized Return)**: 按年计算的平均收益率
- **总盈亏 (Total Profit)**: 最终资金 - 初始资金

### 2. 风险指标
- **最大回撤 (Max Drawdown)**: 从峰值到谷值的最大跌幅百分比
- **波动率 (Volatility)**: 收益率的标准差
- **下行风险 (Downside Risk)**: 负收益的标准差

### 3. 风险调整收益指标
- **夏普比率 (Sharpe Ratio)**: (年化收益率 - 无风险利率) / 年化波动率
- **索提诺比率 (Sortino Ratio)**: (年化收益率 - 无风险利率) / 下行风险
- **卡尔马比率 (Calmar Ratio)**: 年化收益率 / 最大回撤

### 4. 交易指标
- **胜率 (Win Rate)**: 盈利交易次数 / 总交易次数 × 100%
- **盈亏比 (Profit Factor)**: 总盈利 / 总亏损
- **平均盈利 (Average Win)**: 总盈利 / 盈利交易次数
- **平均亏损 (Average Loss)**: 总亏损 / 亏损交易次数

## 回测配置建议

### 1. 时间范围选择
- **训练期**: 用于策略开发和参数优化
- **验证期**: 用于策略验证和过拟合检测
- **测试期**: 用于最终策略评估

### 2. 数据质量要求
- 确保价格数据的完整性和准确性
- 处理数据缺失和异常值
- 考虑股票分割、分红等企业行为

### 3. 交易成本设置
- 设置合理的手续费率
- 考虑滑点成本
- 包含资金成本

### 4. 风险管理
- 设置合理的止损止盈
- 控制单笔交易风险
- 设置最大回撤限制

## 回测局限性

### 1. 历史数据局限
- 历史表现不代表未来结果
- 市场环境可能发生变化
- 数据可能存在偏差

### 2. 执行假设
- 假设所有订单都能按预期价格成交
- 忽略了市场流动性影响
- 没有考虑极端市场情况

### 3. 过拟合风险
- 策略可能过度适应历史数据
- 参数优化可能导致过拟合
- 需要样本外验证

## 最佳实践

1. **多时间段验证**: 在不同市场环境下测试策略
2. **样本外测试**: 保留部分数据用于最终验证
3. **蒙特卡洛模拟**: 评估策略的稳健性
4. **敏感性分析**: 测试参数变化对结果的影响
5. **基准比较**: 与买入持有等基准策略比较

## 注意事项

1. 回测执行可能需要较长时间，建议异步处理
2. 大量历史数据可能影响回测性能
3. 建议设置合理的提前结束阈值避免过度亏损
4. 回测结果仅供参考，实际交易需谨慎
5. 定期更新和验证策略的有效性