# 量化回测平台 API 使用示例

## 指标示例

### 1. 创建简单移动平均线(SMA)指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "简单移动平均线",
    "description": "计算价格的简单移动平均线",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push(null); continue; } let sum = 0; for (let j = 0; j < period; j++) { sum += priceData[i - j].close_price; } result.push(sum / period); } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "14",
        "paramType": "number"
      }
    ]
  }'
```

### 2. 创建指数移动平均线(EMA)指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "指数移动平均线",
    "description": "计算价格的指数移动平均线",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; let ema = null; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push(null); continue; } if (ema === null) { let sum = 0; for (let j = 0; j < period; j++) { sum += priceData[i - j].close_price; } ema = sum / period; } else { const k = 2 / (period + 1); ema = priceData[i].close_price * k + ema * (1 - k); } result.push(ema); } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "14",
        "paramType": "number"
      }
    ]
  }'
```

### 3. 创建相对强弱指数(RSI)指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "相对强弱指数",
    "description": "计算价格的相对强弱指数",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; let gains = 0; let losses = 0; for (let i = 0; i < priceData.length; i++) { if (i === 0) { result.push(null); continue; } const change = priceData[i].close_price - priceData[i-1].close_price; if (i < period) { if (change >= 0) gains += change; else losses -= change; if (i === period - 1) { const avgGain = gains / period; const avgLoss = losses / period; const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; const rsi = 100 - (100 / (1 + rs)); result.push(rsi); } else { result.push(null); } } else { let avgGain = (gains * (period - 1) + (change >= 0 ? change : 0)) / period; let avgLoss = (losses * (period - 1) + (change < 0 ? -change : 0)) / period; gains = avgGain; losses = avgLoss; const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; const rsi = 100 - (100 / (1 + rs)); result.push(rsi); } } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "14",
        "paramType": "number"
      }
    ]
  }'
```

### 4. 创建布林带(Bollinger Bands)指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "布林带",
    "description": "计算价格的布林带上中下轨",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 20; const stdDev = parameters.stdDev || 2; const result = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push({ middle: null, upper: null, lower: null }); continue; } let sum = 0; for (let j = 0; j < period; j++) { sum += priceData[i - j].close_price; } const sma = sum / period; let sumSquares = 0; for (let j = 0; j < period; j++) { sumSquares += Math.pow(priceData[i - j].close_price - sma, 2); } const std = Math.sqrt(sumSquares / period); result.push({ middle: sma, upper: sma + stdDev * std, lower: sma - stdDev * std }); } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "20",
        "paramType": "number"
      },
      {
        "name": "stdDev",
        "description": "标准差倍数",
        "defaultValue": "2",
        "paramType": "number"
      }
    ]
  }'
```

### 5. 创建MACD指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MACD",
    "description": "计算价格的MACD指标",
    "calculationCode": "function calculate(priceData, parameters) { const fastPeriod = parameters.fastPeriod || 12; const slowPeriod = parameters.slowPeriod || 26; const signalPeriod = parameters.signalPeriod || 9; const result = []; let fastEMA = null; let slowEMA = null; let macdLine = []; let signalLine = null; for (let i = 0; i < priceData.length; i++) { // 计算快速EMA if (i < fastPeriod - 1) { result.push({ macd: null, signal: null, histogram: null }); continue; } if (fastEMA === null) { let sum = 0; for (let j = 0; j < fastPeriod; j++) { sum += priceData[i - j].close_price; } fastEMA = sum / fastPeriod; } else { const k = 2 / (fastPeriod + 1); fastEMA = priceData[i].close_price * k + fastEMA * (1 - k); } // 计算慢速EMA if (i < slowPeriod - 1) { result.push({ macd: null, signal: null, histogram: null }); continue; } if (slowEMA === null) { let sum = 0; for (let j = 0; j < slowPeriod; j++) { sum += priceData[i - j].close_price; } slowEMA = sum / slowPeriod; } else { const k = 2 / (slowPeriod + 1); slowEMA = priceData[i].close_price * k + slowEMA * (1 - k); } // 计算MACD线 const macd = fastEMA - slowEMA; macdLine.push(macd); // 计算信号线 if (macdLine.length >= signalPeriod) { if (signalLine === null) { let sum = 0; for (let j = 0; j < signalPeriod; j++) { sum += macdLine[macdLine.length - 1 - j]; } signalLine = sum / signalPeriod; } else { const k = 2 / (signalPeriod + 1); signalLine = macd * k + signalLine * (1 - k); } // 计算柱状图 const histogram = macd - signalLine; result.push({ macd, signal: signalLine, histogram }); } else { result.push({ macd, signal: null, histogram: null }); } } return result; }",
    "parameters": [
      {
        "name": "fastPeriod",
        "description": "快线周期",
        "defaultValue": "12",
        "paramType": "number"
      },
      {
        "name": "slowPeriod",
        "description": "慢线周期",
        "defaultValue": "26",
        "paramType": "number"
      },
      {
        "name": "signalPeriod",
        "description": "信号线周期",
        "defaultValue": "9",
        "paramType": "number"
      }
    ]
  }'
```

### 6. 创建KDJ指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "KDJ",
    "description": "计算价格的KDJ随机指标",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 9; const kPeriod = parameters.kPeriod || 3; const dPeriod = parameters.dPeriod || 3; const result = []; let kValues = []; let dValues = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push({ k: null, d: null, j: null }); continue; } let highestHigh = -Infinity; let lowestLow = Infinity; for (let j = 0; j < period; j++) { const high = priceData[i - j].high_price; const low = priceData[i - j].low_price; if (high > highestHigh) highestHigh = high; if (low < lowestLow) lowestLow = low; } const close = priceData[i].close_price; const rsv = (highestHigh === lowestLow) ? 50 : ((close - lowestLow) / (highestHigh - lowestLow)) * 100; let k; if (kValues.length === 0) { k = rsv; } else { k = (kValues[kValues.length - 1] * (kPeriod - 1) + rsv) / kPeriod; } kValues.push(k); let d; if (dValues.length === 0) { d = k; } else { d = (dValues[dValues.length - 1] * (dPeriod - 1) + k) / dPeriod; } dValues.push(d); const j = 3 * k - 2 * d; result.push({ k, d, j }); } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "9",
        "paramType": "number"
      },
      {
        "name": "kPeriod",
        "description": "K值周期",
        "defaultValue": "3",
        "paramType": "number"
      },
      {
        "name": "dPeriod",
        "description": "D值周期",
        "defaultValue": "3",
        "paramType": "number"
      }
    ]
  }'
```

### 7. 创建ATR指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ATR",
    "description": "计算价格的平均真实波幅",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; let atr = null; for (let i = 0; i < priceData.length; i++) { if (i === 0) { result.push(null); continue; } const high = priceData[i].high_price; const low = priceData[i].low_price; const prevClose = priceData[i-1].close_price; const tr1 = high - low; const tr2 = Math.abs(high - prevClose); const tr3 = Math.abs(low - prevClose); const tr = Math.max(tr1, tr2, tr3); if (atr === null) { if (i >= period) { let sum = 0; for (let j = 0; j < period; j++) { const h = priceData[i - j].high_price; const l = priceData[i - j].low_price; const pc = priceData[i - j - 1].close_price; sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)); } atr = sum / period; result.push(atr); } else { result.push(null); } } else { atr = ((atr * (period - 1)) + tr) / period; result.push(atr); } } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "14",
        "paramType": "number"
      }
    ]
  }'
```

## 策略示例

### 1. 创建双均线交叉策略

```bash
curl -X POST http://localhost:3099/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "双均线交叉策略",
    "description": "当短期均线上穿长期均线时买入，下穿时卖出",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "indicators": [
      {
        "indicatorId": 1,
        "priority": 0,
        "parameters": [
          {
            "parameterId": 1,
            "value": "5"
          }
        ]
      },
      {
        "indicatorId": 1,
        "priority": 1,
        "parameters": [
          {
            "parameterId": 1,
            "value": "20"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorId": 1,
        "comparisonType": "indicator",
        "comparedIndicatorId": 2,
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "priority": 0
      },
      {
        "indicatorId": 1,
        "comparisonType": "indicator",
        "comparedIndicatorId": 2,
        "operator": "<",
        "conditionType": "crossover",
        "action": "sell",
        "priority": 1
      }
    ]
  }'
```

### 2. 创建RSI超买超卖策略

```bash
curl -X POST http://localhost:3099/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RSI超买超卖策略",
    "description": "当RSI低于30时买入，高于70时卖出",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "indicators": [
      {
        "indicatorId": 3,
        "priority": 0,
        "parameters": [
          {
            "parameterId": 1,
            "value": "14"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorId": 1,
        "comparisonType": "constant",
        "constantValue": "30",
        "operator": "<",
        "conditionType": "value",
        "action": "buy",
        "group": 1,
        "priority": 0
      },
      {
        "indicatorId": 1,
        "comparisonType": "constant",
        "constantValue": "70",
        "operator": ">",
        "conditionType": "value",
        "action": "sell",
        "group": 2,
        "priority": 0
      }
    ]
  }'
```

### 4. 创建复合条件策略

```bash
curl -X POST http://localhost:3099/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "均线+RSI复合策略",
    "description": "当短期均线上穿长期均线且RSI低于40时买入，当短期均线下穿长期均线或RSI高于70时卖出",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "indicators": [
      {
        "indicatorId": 1,
        "priority": 0,
        "parameters": [
          {
            "parameterId": 1,
            "value": "5"
          }
        ]
      },
      {
        "indicatorId": 1,
        "priority": 1,
        "parameters": [
          {
            "parameterId": 1,
            "value": "20"
          }
        ]
      },
      {
        "indicatorId": 3,
        "priority": 2,
        "parameters": [
          {
            "parameterId": 1,
            "value": "14"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorId": 1,
        "comparisonType": "indicator",
        "comparedIndicatorId": 2,
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "group": 1,
        "priority": 0
      },
      {
        "indicatorId": 3,
        "comparisonType": "constant",
        "constantValue": "40",
        "operator": "<",
        "conditionType": "value",
        "action": "buy",
        "group": 1,
        "priority": 1
      },
      {
        "indicatorId": 1,
        "comparisonType": "indicator",
        "comparedIndicatorId": 2,
        "operator": "<",
        "conditionType": "crossover",
        "action": "sell",
        "group": 2,
        "priority": 0
      },
      {
        "indicatorId": 3,
        "comparisonType": "constant",
        "constantValue": "70",
        "operator": ">",
        "conditionType": "value",
        "action": "sell",
        "group": 3,
        "priority": 0
      }
    ]
  }'
```

### 3. 创建MACD金叉死叉策略

```bash
curl -X POST http://localhost:3099/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MACD金叉死叉策略",
    "description": "当MACD线上穿信号线时买入，下穿时卖出",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "indicators": [
      {
        "indicatorId": 5,
        "priority": 0,
        "parameters": [
          {
            "parameterId": 1,
            "value": "12"
          },
          {
            "parameterId": 2,
            "value": "26"
          },
          {
            "parameterId": 3,
            "value": "9"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorId": 1,
        "comparisonType": "indicator",
        "comparedIndicatorId": 2,
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "priority": 0
      },
      {
        "indicatorId": 1,
        "comparisonType": "indicator",
        "comparedIndicatorId": 2,
        "operator": "<",
        "conditionType": "crossover",
        "action": "sell",
        "priority": 1
      }
    ]
  }'
```

## 回测示例

### 1. 执行双均线交叉策略回测

```bash
curl -X POST http://localhost:3099/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2025-01-01T00:00:00.000Z",
    "endTime": "2025-08-01T00:00:00.000Z",
    "initialCapital": 10000
  }'
```

### 2. 执行RSI超买超卖策略回测

```bash
curl -X POST http://localhost:3099/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 2,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2025-01-01T00:00:00.000Z",
    "endTime": "2025-08-01T00:00:00.000Z",
    "initialCapital": 10000
  }'
```

### 3. 查询回测结果

```bash
curl -X GET http://localhost:3099/backtest/1
```

### 4. 查询回测交易记录

```bash
curl -X GET http://localhost:3099/backtest/1/trades