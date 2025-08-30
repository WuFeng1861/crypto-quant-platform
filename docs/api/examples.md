# API 使用示例

本文档提供了量化回测平台各个API接口的详细使用示例，包括完整的工作流程和编程语言集成示例。

## 目录

1. [完整工作流示例](#完整工作流示例)
2. [价格数据管理示例](#价格数据管理示例)
3. [指标管理示例](#指标管理示例)
4. [策略管理示例](#策略管理示例)
5. [回测系统示例](#回测系统示例)
6. [编程语言集成](#编程语言集成)
7. [错误处理示例](#错误处理示例)

## 完整工作流示例

以下是一个完整的量化交易策略开发和回测流程：

### 步骤1：准备基础数据

```bash
# 1. 创建交易对
curl -X POST http://localhost:3000/price-data/trading-pairs \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "baseAsset": "BTC",
    "quoteAsset": "USDT",
    "description": "Bitcoin/Tether"
  }'

# 2. 创建时间框架
curl -X POST http://localhost:3000/price-data/timeframes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1h",
    "intervalMinutes": 60,
    "description": "1小时K线"
  }'

# 3. 批量导入价格数据（示例单条）
curl -X POST http://localhost:3000/price-data \
  -H "Content-Type: application/json" \
  -d '{
    "pairId": 1,
    "timeframeId": 1,
    "timestamp": 1704067200000,
    "openPrice": 42000.00,
    "highPrice": 43500.00,
    "lowPrice": 41800.00,
    "closePrice": 43200.00,
    "volume": 1250.75,
    "volumeCurrency": 1250.75,
    "volumeCurrencyQuote": 52650000.00,
    "confirmed": 1
  }'
```

### 步骤2：创建技术指标

```bash
# 1. 创建SMA指标
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

# 2. 创建RSI指标
curl -X POST http://localhost:3000/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RSI",
    "displayName": "相对强弱指数",
    "description": "计算价格的相对强弱指数",
    "category": "momentum",
    "parameters": [
      {
        "name": "period",
        "displayName": "周期",
        "type": "number",
        "defaultValue": 14,
        "minValue": 2,
        "maxValue": 100,
        "description": "计算RSI的周期数"
      }
    ]
  }'
```

### 步骤3：创建交易策略

```bash
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MA+RSI复合策略",
    "description": "结合移动平均线和RSI的复合交易策略",
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
      },
      {
        "indicatorId": 2,
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
        "logic": "sma_short > sma_long AND prev(sma_short) <= prev(sma_long) AND rsi < 70"
      },
      {
        "type": "sell",
        "logic": "sma_short < sma_long AND prev(sma_short) >= prev(sma_long) OR rsi > 80"
      }
    ]
  }'
```

### 步骤4：执行回测

```bash
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 10000,
    "earlyStopThreshold": 10
  }'
```

### 步骤5：分析结果

```bash
# 查看回测结果
curl -X GET http://localhost:3000/backtest/1

# 查看交易记录
curl -X GET http://localhost:3000/backtest/1/trades
```

## 价格数据管理示例

### 创建多个时间框架

```bash
# 创建1分钟时间框架
curl -X POST http://localhost:3000/price-data/timeframes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1m",
    "intervalMinutes": 1,
    "description": "1分钟K线"
  }'

# 创建4小时时间框架
curl -X POST http://localhost:3000/price-data/timeframes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "4h",
    "intervalMinutes": 240,
    "description": "4小时K线"
  }'

# 创建日线时间框架
curl -X POST http://localhost:3000/price-data/timeframes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1d",
    "intervalMinutes": 1440,
    "description": "日K线"
  }'
```

### 批量查询价格数据

```bash
# 查询指定范围的价格数据
curl -X GET "http://localhost:3000/price-data/range?pairId=1&timeframeId=1&startTime=2024-01-01T00:00:00.000Z&endTime=2024-01-31T23:59:59.000Z"

# 查询所有交易对
curl -X GET http://localhost:3000/price-data/trading-pairs

# 根据符号查询交易对
curl -X GET http://localhost:3000/price-data/trading-pairs/symbol/BTCUSDT
```

## 指标管理示例

### 创建复杂指标

```bash
# 创建MACD指标
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
        "maxValue": 50,
        "description": "快速EMA周期"
      },
      {
        "name": "slowPeriod",
        "displayName": "慢线周期",
        "type": "number",
        "defaultValue": 26,
        "minValue": 1,
        "maxValue": 100,
        "description": "慢速EMA周期"
      },
      {
        "name": "signalPeriod",
        "displayName": "信号线周期",
        "type": "number",
        "defaultValue": 9,
        "minValue": 1,
        "maxValue": 50,
        "description": "信号线EMA周期"
      }
    ]
  }'

# 创建布林带指标
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
        "maxValue": 100,
        "description": "移动平均周期"
      },
      {
        "name": "stdDev",
        "displayName": "标准差倍数",
        "type": "number",
        "defaultValue": 2,
        "minValue": 1,
        "maxValue": 3,
        "description": "标准差倍数"
      }
    ]
  }'
```

### 计算指标值

```bash
# 计算SMA指标
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

## 策略管理示例

### 创建不同类型的策略

```bash
# 1. 双均线交叉策略
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "双均线交叉策略",
    "description": "当短期均线上穿长期均线时买入，下穿时卖出",
    "indicators": [
      {
        "indicatorId": 1,
        "alias": "sma_short",
        "parameters": [
          {
            "name": "period",
            "value": 5
          }
        ]
      },
      {
        "indicatorId": 1,
        "alias": "sma_long",
        "parameters": [
          {
            "name": "period",
            "value": 20
          }
        ]
      }
    ],
    "conditions": [
      {
        "type": "buy",
        "logic": "cross_above(sma_short, sma_long)"
      },
      {
        "type": "sell",
        "logic": "cross_below(sma_short, sma_long)"
      }
    ]
  }'

# 2. RSI超买超卖策略
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RSI超买超卖策略",
    "description": "当RSI低于30时买入，高于70时卖出",
    "indicators": [
      {
        "indicatorId": 2,
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

# 3. MACD金叉死叉策略
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MACD金叉死叉策略",
    "description": "当MACD线上穿信号线时买入，下穿时卖出",
    "indicators": [
      {
        "indicatorId": 3,
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
      }
    ],
    "conditions": [
      {
        "type": "buy",
        "logic": "cross_above(macd.line, macd.signal)"
      },
      {
        "type": "sell",
        "logic": "cross_below(macd.line, macd.signal)"
      }
    ]
  }'
```

## 回测系统示例

### 不同配置的回测

```bash
# 1. 基础回测
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-06-30T23:59:59.000Z",
    "initialCapital": 10000
  }'

# 2. 带提前停止的回测
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 2,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 50000,
    "earlyStopThreshold": 15
  }'

# 3. 长期回测
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 3,
    "pairId": 1,
    "timeframeId": 3,
    "startTime": "2020-01-01T00:00:00.000Z",
    "endTime": "2024-12-31T23:59:59.000Z",
    "initialCapital": 100000,
    "earlyStopThreshold": 20
  }'
```

### 批量回测比较

```bash
# 对同一策略进行不同时间段的回测
for year in 2020 2021 2022 2023 2024; do
  curl -X POST http://localhost:3000/backtest \
    -H "Content-Type: application/json" \
    -d "{
      \"strategyId\": 1,
      \"tradingPairId\": 1,
      \"timeframeId\": 1,
      \"startTime\": \"${year}-01-01T00:00:00.000Z\",
      \"endTime\": \"${year}-12-31T23:59:59.000Z\",
      \"initialCapital\": 10000
    }"
done
```

## 编程语言集成

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

  // 创建交易对
  async createTradingPair(pairData) {
    try {
      const response = await this.client.post('/price-data/trading-pairs', pairData);
      return response.data;
    } catch (error) {
      console.error('创建交易对失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 创建指标
  async createIndicator(indicatorData) {
    try {
      const response = await this.client.post('/indicators', indicatorData);
      return response.data;
    } catch (error) {
      console.error('创建指标失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 创建策略
  async createStrategy(strategyData) {
    try {
      const response = await this.client.post('/strategies', strategyData);
      return response.data;
    } catch (error) {
      console.error('创建策略失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 执行回测
  async runBacktest(backtestData) {
    try {
      const response = await this.client.post('/backtest', backtestData);
      return response.data;
    } catch (error) {
      console.error('回测执行失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 获取回测交易记录
  async getBacktestTrades(backtestId) {
    try {
      const response = await this.client.get(`/backtest/${backtestId}/trades`);
      return response.data;
    } catch (error) {
      console.error('获取交易记录失败:', error.response?.data || error.message);
      throw error;
    }
  }

  // 批量导入价格数据
  async batchImportPriceData(priceDataArray) {
    const results = [];
    for (const priceData of priceDataArray) {
      try {
        const response = await this.client.post('/price-data', priceData);
        results.push(response.data);
      } catch (error) {
        console.error('导入价格数据失败:', error.response?.data || error.message);
        results.push({ error: error.message, data: priceData });
      }
    }
    return results;
  }
}

// 使用示例
async function runCompleteWorkflow() {
  const client = new QuantPlatformClient();

  try {
    // 1. 创建交易对
    const tradingPair = await client.createTradingPair({
      symbol: "ETHUSDT",
      baseAsset: "ETH",
      quoteAsset: "USDT",
      description: "Ethereum/Tether"
    });
    console.log('交易对创建成功:', tradingPair.data.id);

    // 2. 创建指标
    const smaIndicator = await client.createIndicator({
      name: "SMA",
      displayName: "简单移动平均线",
      description: "计算指定周期的简单移动平均值",
      category: "trend",
      parameters: [
        {
          name: "period",
          displayName: "周期",
          type: "number",
          defaultValue: 20,
          minValue: 1,
          maxValue: 200,
          description: "计算移动平均的周期数"
        }
      ]
    });
    console.log('指标创建成功:', smaIndicator.data.id);

    // 3. 创建策略
    const strategy = await client.createStrategy({
      name: "测试策略",
      description: "API集成测试策略",
      indicators: [
        {
          indicatorId: smaIndicator.data.id,
          alias: "sma_short",
          parameters: [
            {
              name: "period",
              value: 10
            }
          ]
        },
        {
          indicatorId: smaIndicator.data.id,
          alias: "sma_long",
          parameters: [
            {
              name: "period",
              value: 30
            }
          ]
        }
      ],
      conditions: [
        {
          type: "buy",
          logic: "cross_above(sma_short, sma_long)"
        },
        {
          type: "sell",
          logic: "cross_below(sma_short, sma_long)"
        }
      ]
    });
    console.log('策略创建成功:', strategy.data.id);

    // 4. 执行回测
    const backtest = await client.runBacktest({
      strategyId: strategy.data.id,
      pairId: tradingPair.data.id,
      timeframeId: 1,
      startTime: "2024-01-01T00:00:00.000Z",
      endTime: "2024-06-30T23:59:59.000Z",
      initialCapital: 10000
    });
    console.log('回测完成，收益率:', backtest.data.totalReturn + '%');

    // 5. 获取交易记录
    const trades = await client.getBacktestTrades(backtest.data.id);
    console.log('总交易次数:', trades.data.length);

  } catch (error) {
    console.error('工作流执行失败:', error);
  }
}

// 运行完整工作流
runCompleteWorkflow();
```

### Python 集成

```python
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional

class QuantPlatformClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def create_trading_pair(self, pair_data: Dict) -> Dict:
        """创建交易对"""
        response = self.session.post(f"{self.base_url}/price-data/trading-pairs", 
                                   json=pair_data)
        response.raise_for_status()
        return response.json()
    
    def create_indicator(self, indicator_data: Dict) -> Dict:
        """创建指标"""
        response = self.session.post(f"{self.base_url}/indicators", 
                                   json=indicator_data)
        response.raise_for_status()
        return response.json()
    
    def create_strategy(self, strategy_data: Dict) -> Dict:
        """创建策略"""
        response = self.session.post(f"{self.base_url}/strategies", 
                                   json=strategy_data)
        response.raise_for_status()
        return response.json()
    
    def run_backtest(self, backtest_data: Dict) -> Dict:
        """执行回测"""
        response = self.session.post(f"{self.base_url}/backtest", 
                                   json=backtest_data)
        response.raise_for_status()
        return response.json()
    
    def get_backtest_trades(self, backtest_id: int) -> Dict:
        """获取回测交易记录"""
        response = self.session.get(f"{self.base_url}/backtest/{backtest_id}/trades")
        response.raise_for_status()
        return response.json()
    
    def batch_import_price_data(self, price_data_list: List[Dict]) -> List[Dict]:
        """批量导入价格数据"""
        results = []
        for price_data in price_data_list:
            try:
                response = self.session.post(f"{self.base_url}/price-data", 
                                           json=price_data)
                response.raise_for_status()
                results.append(response.json())
            except requests.exceptions.RequestException as e:
                results.append({"error": str(e), "data": price_data})
        return results
    
    def get_all_strategies(self) -> Dict:
        """获取所有策略"""
        response = self.session.get(f"{self.base_url}/strategies")
        response.raise_for_status()
        return response.json()
    
    def compare_strategies(self, strategy_ids: List[int], 
                          trading_pair_id: int, timeframe_id: int,
                          start_time: str, end_time: str, 
                          initial_capital: float = 10000) -> List[Dict]:
        """比较多个策略的回测结果"""
        results = []
        for strategy_id in strategy_ids:
            try:
                backtest_data = {
                    "strategyId": strategy_id,
                    "pairId": trading_pair_id,
                    "timeframeId": timeframe_id,
                    "startTime": start_time,
                    "endTime": end_time,
                    "initialCapital": initial_capital
                }
                result = self.run_backtest(backtest_data)
                results.append({
                    "strategyId": strategy_id,
                    "result": result
                })
            except requests.exceptions.RequestException as e:
                results.append({
                    "strategyId": strategy_id,
                    "error": str(e)
                })
        return results

# 使用示例
def main():
    client = QuantPlatformClient()
    
    try:
        # 创建多个指标
        indicators = []
        
        # SMA指标
        sma_indicator = client.create_indicator({
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
        })
        indicators.append(sma_indicator['data'])
        
        # RSI指标
        rsi_indicator = client.create_indicator({
            "name": "RSI",
            "displayName": "相对强弱指数",
            "description": "计算价格的相对强弱指数",
            "category": "momentum",
            "parameters": [
                {
                    "name": "period",
                    "displayName": "周期",
                    "type": "number",
                    "defaultValue": 14,
                    "minValue": 2,
                    "maxValue": 100,
                    "description": "计算RSI的周期数"
                }
            ]
        })
        indicators.append(rsi_indicator['data'])
        
        print(f"创建了 {len(indicators)} 个指标")
        
        # 创建多个策略
        strategies = []
        
        # 双均线策略
        ma_strategy = client.create_strategy({
            "name": "双均线交叉策略",
            "description": "基于短期和长期移动平均线交叉的交易策略",
            "indicators": [
                {
                    "indicatorId": sma_indicator['data']['id'],
                    "alias": "sma_short",
                    "parameters": [{"name": "period", "value": 10}]
                },
                {
                    "indicatorId": sma_indicator['data']['id'],
                    "alias": "sma_long",
                    "parameters": [{"name": "period", "value": 30}]
                }
            ],
            "conditions": [
                {
                    "type": "buy",
                    "logic": "cross_above(sma_short, sma_long)"
                },
                {
                    "type": "sell",
                    "logic": "cross_below(sma_short, sma_long)"
                }
            ]
        })
        strategies.append(ma_strategy['data'])
        
        # RSI策略
        rsi_strategy = client.create_strategy({
            "name": "RSI超买超卖策略",
            "description": "基于RSI指标的超买超卖交易策略",
            "indicators": [
                {
                    "indicatorId": rsi_indicator['data']['id'],
                    "alias": "rsi",
                    "parameters": [{"name": "period", "value": 14}]
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
        })
        strategies.append(rsi_strategy['data'])
        
        print(f"创建了 {len(strategies)} 个策略")
        
        # 比较策略性能
        strategy_ids = [s['id'] for s in strategies]
        comparison_results = client.compare_strategies(
            strategy_ids=strategy_ids,
            trading_pair_id=1,
            timeframe_id=1,
            start_time="2024-01-01T00:00:00.000Z",
            end_time="2024-06-30T23:59:59.000Z",
            initial_capital=10000
        )
        
        # 分析结果
        print("\n策略比较结果:")
        for result in comparison_results:
            if 'error' in result:
                print(f"策略 {result['strategyId']}: 执行失败 - {result['error']}")
            else:
                data = result['result']['data']
                print(f"策略 {result['strategyId']}: 收益率 {data['totalReturn']:.2f}%, "
                      f"胜率 {data['winRate']:.2f}%, 最大回撤 {data['maxDrawdown']:.2f}%")
        
    except requests.exceptions.RequestException as e:
        print(f"API请求失败: {e}")
    except Exception as e:
        print(f"执行失败: {e}")

if __name__ == "__main__":
    main()
```

## 错误处理示例

### 常见错误及处理方式

```bash
# 1. 参数验证错误
curl -X POST http://localhost:3000/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": "invalid",
    "initialCapital": -1000
  }'

# 响应:
# {
#   "success": false,
#   "data": null,
#   "message": "请求参数验证失败",
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "details": [
#       "strategyId must be a number",
#       "initialCapital must be greater than 0"
#     ]
#   },
#   "timestamp": 1704067200000,
#   "path": "/backtest"
# }

# 2. 资源不存在错误
curl -X GET http://localhost:3000/strategies/999

# 响应:
# {
#   "success": false,
#   "data": null,
#   "message": "策略不存在",
#   "error": {
#     "code": "STRATEGY_NOT_FOUND",
#     "details": "Strategy with ID 999 not found"
#   },
#   "timestamp": 1704067200000,
#   "path": "/strategies/999"
# }
```

### JavaScript 错误处理

```javascript
async function handleApiErrors() {
  const client = new QuantPlatformClient();
  
  try {
    // 尝试获取不存在的策略
    const strategy = await client.getStrategy(999);
  } catch (error) {
    if (error.response) {
      // 服务器返回错误响应
      const { status, data } = error.response;
      console.error(`API错误 ${status}:`, data.message);
      
      switch (data.error?.code) {
        case 'STRATEGY_NOT_FOUND':
          console.log('策略不存在，请检查策略ID');
          break;
        case 'VALIDATION_ERROR':
          console.log('参数验证失败:', data.error.details);
          break;
        default:
          console.log('未知错误:', data.error?.details);
      }
    } else if (error.request) {
      // 网络错误
      console.error('网络连接失败，请检查服务器状态');
    } else {
      // 其他错误
      console.error('请求配置错误:', error.message);
    }
  }
}
```

### Python 错误处理

```python
import requests
from requests.exceptions import RequestException, HTTPError, ConnectionError, Timeout

def handle_api_errors():
    client = QuantPlatformClient()
    
    try:
        # 尝试创建无效的策略
        strategy = client.create_strategy({
            "name": "",  # 无效的名称
            "indicators": [],  # 空的指标列表
            "conditions": []  # 空的条件列表
        })
    except HTTPError as e:
        response = e.response
        if response.status_code == 400:
            error_data = response.json()
            print(f"参数验证失败: {error_data['message']}")
            if 'details' in error_data.get('error', {}):
                for detail in error_data['error']['details']:
                    print(f"  - {detail}")
        elif response.status_code == 404:
            print("资源不存在")
        elif response.status_code == 500:
            print("服务器内部错误")
    except ConnectionError:
        print("无法连接到服务器，请检查网络连接")
    except Timeout:
        print("请求超时，请稍后重试")
    except RequestException as e:
        print(f"请求失败: {e}")
```

## 性能优化建议

### 1. 批量操作

```javascript
// 批量导入价格数据
async function batchImportPriceData(priceDataArray, batchSize = 100) {
  const results = [];
  
  for (let i = 0; i < priceDataArray.length; i += batchSize) {
    const batch = priceDataArray.slice(i, i + batchSize);
    const batchPromises = batch.map(data => 
      client.createPriceData(data).catch(error => ({ error, data }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // 避免过于频繁的请求
    if (i + batchSize < priceDataArray.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
```

### 2. 缓存策略

```javascript
class CachedQuantPlatformClient extends QuantPlatformClient {
  constructor(baseURL) {
    super(baseURL);
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }
  
  async getIndicatorsWithCache() {
    const cacheKey = 'indicators';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const data = await this.getIndicators();
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
}
```

这些示例展示了如何在实际项目中有效使用量化回测平台的API接口，包括完整的工作流程、错误处理和性能优化策略。