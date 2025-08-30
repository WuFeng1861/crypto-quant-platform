# 量化回测平台 API 使用示例

本文档提供了量化回测平台各个API接口的详细使用示例，包括请求格式、响应格式和常见使用场景。

## 目录

1. [价格数据管理示例](#价格数据管理示例)
2. [指标管理示例](#指标管理示例)
3. [策略管理示例](#策略管理示例)
4. [回测系统示例](#回测系统示例)
5. [完整工作流示例](#完整工作流示例)

## 价格数据管理示例

### 1. 创建交易对

```bash
curl -X POST http://localhost:3000/price-data/trading-pairs \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "baseAsset": "BTC",
    "quoteAsset": "USDT",
    "description": "Bitcoin/Tether"
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "BTCUSDT",
    "baseAsset": "BTC",
    "quoteAsset": "USDT",
    "description": "Bitcoin/Tether",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "交易对创建成功",
  "timestamp": 1704067200000,
  "path": "/price-data/trading-pairs"
}
```

### 2. 创建时间框架

```bash
curl -X POST http://localhost:3000/price-data/timeframes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1h",
    "intervalMinutes": 60,
    "description": "1小时K线"
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "1h",
    "intervalMinutes": 60,
    "description": "1小时K线",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "时间框架创建成功",
  "timestamp": 1704067200000,
  "path": "/price-data/timeframes"
}
```

### 3. 批量创建价格数据

```bash
curl -X POST http://localhost:3000/price-data \
  -H "Content-Type: application/json" \
  -d '{
    "tradingPairId": 1,
    "timeframeId": 1,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "open": 42000.00,
    "high": 43500.00,
    "low": 41800.00,
    "close": 43200.00,
    "volume": 1250.75
  }'
```

### 4. 按范围查询价格数据

```bash
curl -X GET "http://localhost:3000/price-data/range?tradingPairId=1&timeframeId=1&startTime=2024-01-01T00:00:00.000Z&endTime=2024-01-31T23:59:59.000Z"
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tradingPairId": 1,
      "timeframeId": 1,
      "timestamp": "2024-01-01T00:00:00.000Z",
      "open": 42000.00,
      "high": 43500.00,
      "low": 41800.00,
      "close": 43200.00,
      "volume": 1250.75,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "价格数据查询成功",
  "timestamp": 1704067200000,
  "path": "/price-data/range"
}
```

## 指标管理示例

### 1. 创建SMA指标

```bash
curl -X POST http://localhost:3000/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SMA",
    "displayName": "简单移动平均线",
    "description": "计算指定周期的简单移动平均值",
    "category": "trend",
    "parameters": [
      {
        "name": "period",
        "displayName": "周期",
        "type": "number",
        "defaultValue": 20,
        "minValue": 1,
        "maxValue": 200,
        "description": "计算移动平均的周期数"
      }
    ]
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "SMA",
    "displayName": "简单移动平均线",
    "description": "计算指定周期的简单移动平均值",
    "category": "trend",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "parameters": [
      {
        "id": 1,
        "indicatorId": 1,
        "name": "period",
        "displayName": "周期",
        "type": "number",
        "defaultValue": 20,
        "minValue": 1,
        "maxValue": 200,
        "description": "计算移动平均的周期数"
      }
    ]
  },
  "message": "指标创建成功",
  "timestamp": 1704067200000,
  "path": "/indicators"
}
```

### 2. 创建EMA指标

```bash
curl -X POST http://localhost:3000/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EMA",
    "displayName": "指数移动平均线",
    "description": "计算指定周期的指数移动平均值",
    "category": "trend",
    "parameters": [
      {
        "name": "period",
        "displayName": "周期",
        "type": "number",
        "defaultValue": 12,
        "minValue": 1,
        "maxValue": 200,
        "description": "计算指数移动平均的周期数"
      }
    ]
  }'
```

### 3. 计算指标值

```bash
curl -X POST http://localhost:3000/indicators/1/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "priceData": [
      {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "open": 42000,
        "high": 43500,
        "low": 41800,
        "close": 43200,
        "volume": 1250
      },
      {
        "timestamp": "2024-01-01T01:00:00.000Z",
        "open": 43200,
        "high": 44000,
        "low": 42800,
        "close": 43800,
        "volume": 1180
      }
    ],
    "parameters": {
      "period": 20
    }
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "indicator": "SMA",
    "parameters": {
      "period": 20
    },
    "values": [
      {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "value": null
      },
      {
        "timestamp": "2024-01-01T01:00:00.000Z",
        "value": 43500.0
      }
    ]
  },
  "message": "指标计算成功",
  "timestamp": 1704067200000,
  "path": "/indicators/1/calculate"
}
```

## 策略管理示例

### 1. 创建MA交叉策略

```bash
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MA交叉策略",
    "description": "基于短期和长期移动平均线交叉的交易策略",
    "indicators": [
      {
        "indicatorId": 1,
        "alias": "sma_short",
        "parameters": [
          {
            "name": "period",
            "value": 10
          }
        ]
      },
      {
        "indicatorId": 1,
        "alias": "sma_long",
        "parameters": [
          {
            "name": "period",
            "value": 30
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "buy",
        "logic": "sma_short > sma_long AND prev(sma_short) <= prev(sma_long)"
      },
      {
        "type": "sell",
        "logic": "sma_short < sma_long AND prev(sma_short) >= prev(sma_long)"
      }
    ]
  }'
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "MA交叉策略",
    "description": "基于短期和长期移动平均线交叉的交易策略",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "indicators": [
      {
        "id": 1,
        "strategyId": 1,
        "indicatorId": 1,
        "alias": "sma_short",
        "parameters": [
          {
            "id": 1,
            "strategyIndicatorId": 1,
            "name": "period",
            "value": "10"
          }
        ]
      },
      {
        "id": 2,
        "strategyId": 1,
        "indicatorId": 1,
        "alias": "sma_long",
        "parameters": [
          {
            "id": 2,
            "strategyIndicatorId": 2,
            "name": "period",
            "value": "30"
          }
        ]
      }
    ],
    "conditions": [
      {
        "id": 1,
        "strategyId": 1,
        "type": "buy",
        "logic": "sma_short > sma_long AND prev(sma_short) <= prev(sma_long)"
      },
      {
        "id": 2,
        "strategyId": 1,
        "type": "sell",
        "logic": "sma_short < sma_long AND prev(sma_short) >= prev(sma_long)"
      }
    ]
  },
  "message": "策略创建成功",
  "timestamp": 1704067200000,
  "path": "/strategies"
}
```

### 2. 创建RSI策略

```bash
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RSI超买超卖策略",
    "description": "基于RSI指标的超买超卖交易策略",
    "indicators": [
      {
        "indicatorId": 3,
        "alias": "rsi",
        "parameters": [
          {
            "name": "period",
            "value": 14
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "buy",
        "logic": "rsi < 30 AND prev(rsi) >= 30"
      },
      {
        "type": "sell",
        "logic": "rsi > 70 AND prev(rsi) <= 70"
      }
    ]
  }'
```

### 3. 获取策略详情

```bash
curl -X GET http://localhost:3000/strategies/1
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "MA交叉策略",
    "description": "基于短期和长期移动平均线交叉的交易策略",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "indicators": [
      {
        "id": 1,
        "alias": "sma_short",
        "indicator": {
          "id": 1,
          "name": "SMA",
          "displayName": "简单移动平均线"
        },
        "parameters": [
          {
            "name": "period",
            "value": "10"
          }
        ]
      }
    ],
    "conditions": [
      {
        "id": 1,
        "type": "buy",
        "logic": "sma_short > sma_long AND prev(sma_short) <= prev(sma_long)"
      }
    ]
  },
  "message": "策略查询成功",
  "timestamp": 1704067200000,
  "path": "/strategies/1"
}
```

## 回测系统示例

### 1. 执行基础回测

```bash
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 1,
    "tradingPairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 10000
  }'
```

**响应：**
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
    "finalCapital": 12500.75,
    "totalProfit": 2500.75,
    "totalReturn": 25.01,
    "totalTrades": 48,
    "winningTrades": 31,
    "losingTrades": 17,
    "winRate": 64.58,
    "maxDrawdown": 12.5,
    "sharpeRatio": 1.35,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  },
  "message": "回测执行成功",
  "timestamp": 1704096000000,
  "path": "/backtest"
}
```

### 2. 执行带提前停止的回测

```bash
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 1,
    "tradingPairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 10000,
    "earlyStopThreshold": 15
  }'
```

### 3. 获取回测交易记录

```bash
curl -X GET http://localhost:3000/backtest/1/trades
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "backtestResultId": 1,
      "type": "buy",
      "timestamp": "2024-01-15T09:30:00.000Z",
      "price": 43200.00,
      "quantity": 0.23148,
      "amount": 10000.00,
      "commission": 10.00,
      "balance": 0.00,
      "position": 0.23148,
      "createdAt": "2024-01-01T10:15:00.000Z"
    },
    {
      "id": 2,
      "backtestResultId": 1,
      "type": "sell",
      "timestamp": "2024-02-10T14:45:00.000Z",
      "price": 45800.00,
      "quantity": 0.23148,
      "amount": 10602.18,
      "commission": 10.60,
      "balance": 10591.58,
      "position": 0,
      "createdAt": "2024-01-01T10:20:00.000Z"
    }
  ],
  "message": "交易记录查询成功",
  "timestamp": 1704096000000,
  "path": "/backtest/1/trades"
}
```

### 4. 获取所有回测结果

```bash
curl -X GET http://localhost:3000/backtest
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "strategyId": 1,
      "tradingPairId": 1,
      "timeframeId": 1,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-12-31T23:59:59.000Z",
      "initialCapital": 10000,
      "finalCapital": 12500.75,
      "totalProfit": 2500.75,
      "totalReturn": 25.01,
      "totalTrades": 48,
      "winningTrades": 31,
      "losingTrades": 17,
      "winRate": 64.58,
      "maxDrawdown": 12.5,
      "sharpeRatio": 1.35,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:30:00.000Z"
    }
  ],
  "message": "回测结果查询成功",
  "timestamp": 1704096000000,
  "path": "/backtest"
}
```

## 完整工作流示例

以下是一个完整的量化交易策略开发和回测流程：

### 步骤1：准备基础数据

```bash
# 1. 创建交易对
curl -X POST http://localhost:3000/price-data/trading-pairs \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "ETHUSDT",
    "baseAsset": "ETH",
    "quoteAsset": "USDT",
    "description": "Ethereum/Tether"
  }'

# 2. 创建时间框架
curl -X POST http://localhost:3000/price-data/timeframes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "4h",
    "intervalMinutes": 240,
    "description": "4小时K线"
  }'

# 3. 批量导入价格数据（示例单条）
curl -X POST http://localhost:3000/price-data \
  -H "Content-Type: application/json" \
  -d '{
    "tradingPairId": 2,
    "timeframeId": 2,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "open": 2300.00,
    "high": 2350.00,
    "low": 2280.00,
    "close": 2320.00,
    "volume": 850.25
  }'
```

### 步骤2：创建技术指标

```bash
# 1. 创建MACD指标
curl -X POST http://localhost:3000/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MACD",
    "displayName": "MACD指标",
    "description": "移动平均收敛散度指标",
    "category": "momentum",
    "parameters": [
      {
        "name": "fastPeriod",
        "displayName": "快线周期",
        "type": "number",
        "defaultValue": 12,
        "minValue": 1,
        "maxValue": 50
      },
      {
        "name": "slowPeriod",
        "displayName": "慢线周期",
        "type": "number",
        "defaultValue": 26,
        "minValue": 1,
        "maxValue": 100
      },
      {
        "name": "signalPeriod",
        "displayName": "信号线周期",
        "type": "number",
        "defaultValue": 9,
        "minValue": 1,
        "maxValue": 50
      }
    ]
  }'

# 2. 创建布林带指标
curl -X POST http://localhost:3000/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BOLLINGER",
    "displayName": "布林带",
    "description": "布林带指标",
    "category": "volatility",
    "parameters": [
      {
        "name": "period",
        "displayName": "周期",
        "type": "number",
        "defaultValue": 20,
        "minValue": 5,
        "maxValue": 100
      },
      {
        "name": "stdDev",
        "displayName": "标准差倍数",
        "type": "number",
        "defaultValue": 2,
        "minValue": 1,
        "maxValue": 3
      }
    ]
  }'
```

### 步骤3：创建复合策略

```bash
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MACD+布林带组合策略",
    "description": "结合MACD和布林带的复合交易策略",
    "indicators": [
      {
        "indicatorId": 4,
        "alias": "macd",
        "parameters": [
          {
            "name": "fastPeriod",
            "value": 12
          },
          {
            "name": "slowPeriod",
            "value": 26
          },
          {
            "name": "signalPeriod",
            "value": 9
          }
        ]
      },
      {
        "indicatorId": 5,
        "alias": "bb",
        "parameters": [
          {
            "name": "period",
            "value": 20
          },
          {
            "name": "stdDev",
            "value": 2
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "buy",
        "logic": "macd.line > macd.signal AND prev(macd.line) <= prev(macd.signal) AND close < bb.lower"
      },
      {
        "type": "sell",
        "logic": "macd.line < macd.signal AND prev(macd.line) >= prev(macd.signal) OR close > bb.upper"
      }
    ]
  }'
```

### 步骤4：执行回测并分析结果

```bash
# 1. 执行回测
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 3,
    "tradingPairId": 2,
    "timeframeId": 2,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-06-30T23:59:59.000Z",
    "initialCapital": 50000,
    "earlyStopThreshold": 20
  }'

# 2. 查看回测结果
curl -X GET http://localhost:3000/backtest/3

# 3. 分析交易记录
curl -X GET http://localhost:3000/backtest/3/trades
```

## 错误处理示例

### 1. 参数验证错误

**请求：**
```bash
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": "invalid",
    "initialCapital": -1000
  }'
```

**响应：**
```json
{
  "success": false,
  "data": null,
  "message": "请求参数验证失败",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      "strategyId must be a number",
      "initialCapital must be greater than 0"
    ]
  },
  "timestamp": 1704067200000,
  "path": "/backtest"
}
```

### 2. 资源不存在错误

**请求：**
```bash
curl -X GET http://localhost:3000/strategies/999
```

**响应：**
```json
{
  "success": false,
  "data": null,
  "message": "策略不存在",
  "error": {
    "code": "STRATEGY_NOT_FOUND",
    "details": "Strategy with ID 999 not found"
  },
  "timestamp": 1704067200000,
  "path": "/strategies/999"
}
```

## 性能优化建议

1. **批量操作**：对于大量价格数据，建议使用批量导入接口
2. **分页查询**：对于大量结果集，建议实现分页查询
3. **缓存策略**：频繁查询的指标计算结果可以考虑缓存
4. **异步处理**：长时间运行的回测任务建议使用异步处理

## 集成示例

### JavaScript/Node.js 集成

```javascript
const axios = require('axios');

class QuantPlatformClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createStrategy(strategyData) {
    try {
      const response = await this.client.post('/strategies', strategyData);
      return response.data;
    } catch (error) {
      console.error('创建策略失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async runBacktest(backtestData) {
    try {
      const response = await this.client.post('/backtest', backtestData);
      return response.data;
    } catch (error) {
      console.error('回测执行失败:', error.response?.data || error.message);
      throw error;
    }
  }

  async getBacktestTrades(backtestId) {
    try {
      const response = await this.client.get(`/backtest/${backtestId}/trades`);
      return response.data;
    } catch (error) {
      console.error('获取交易记录失败:', error.response?.data || error.message);
      throw error;
    }
  }
}

// 使用示例
const client = new QuantPlatformClient();

async function runCompleteBacktest() {
  try {
    // 创建策略
    const strategy = await client.createStrategy({
      name: "测试策略",
      description: "API集成测试策略",
      indicators: [/* ... */],
      conditions: [/* ... */]
    });

    // 执行回测
    const backtest = await client.runBacktest({
      strategyId: strategy.data.id,
      tradingPairId: 1,
      timeframeId: 1,
      startTime: "2024-01-01T00:00:00.000Z",
      endTime: "2024-06-30T23:59:59.000Z",
      initialCapital: 10000
    });

    // 获取交易记录
    const trades = await client.getBacktestTrades(backtest.data.id);
    
    console.log('回测完成:', backtest.data);
    console.log('交易记录:', trades.data);
  } catch (error) {
    console.error('回测流程失败:', error);
  }
}
```

### Python 集成

```python
import requests
import json
from datetime import datetime

class QuantPlatformClient:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def create_strategy(self, strategy_data):
        """创建交易策略"""
        response = self.session.post(f"{self.base_url}/strategies", 
                                   json=strategy_data)
        response.raise_for_status()
        return response.json()
    
    def run_backtest(self, backtest_data):
        """执行回测"""
        response = self.session.post(f"{self.base_url}/backtest", 
                                   json=backtest_data)
        response.raise_for_status()
        return response.json()
    
    def get_backtest_trades(self, backtest_id):
        """获取回测交易记录"""
        response = self.session.get(f"{self.base_url}/backtest/{backtest_id}/trades")
        response.raise_for_status()
        return response.json()

# 使用示例
client = QuantPlatformClient()

# 创建并运行回测
strategy_data = {
    "name": "Python测试策略",
    "description": "Python API集成测试",
    "indicators": [
        {
            "indicatorId": 1,
            "alias": "sma",
            "parameters": [{"name": "period", "value": 20}]
        }
    ],
    "conditions": [
        {
            "type": "buy",
            "logic": "close > sma"
        },
        {
            "type": "sell", 
            "logic": "close < sma"
        }
    ]
}

try:
    strategy = client.create_strategy(strategy_data)
    print(f"策略创建成功: {strategy['data']['id']}")
    
    backtest_data = {
        "strategyId": strategy['data']['id'],
        "tradingPairId": 1,
        "timeframeId": 1,
        "startTime": "2024-01-01T00:00:00.000Z",
        "endTime": "2024-06-30T23:59:59.000Z",
        "initialCapital": 10000
    }
    
    backtest = client.run_backtest(backtest_data)
    print(f"回测完成，收益率: {backtest['data']['totalReturn']}%")
    
    trades = client.get_backtest_trades(backtest['data']['id'])
    print(f"总交易次数: {len(trades['data'])}")
    
except requests.exceptions.RequestException as e:
    print(f"API请求失败: {e}")
```

这些示例展示了如何在实际项目中集成和使用量化回测平台的API接口。