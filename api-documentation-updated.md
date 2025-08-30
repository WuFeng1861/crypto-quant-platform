# 量化回测平台 API 文档

本文档描述了量化回测平台的所有API接口，包括价格数据管理、指标管理、策略管理和回测系统。

## 目录

1. [API 响应格式](#api-响应格式)
2. [价格数据管理 API](#价格数据管理-api)
3. [指标管理 API](#指标管理-api)
4. [策略管理 API](#策略管理-api)
5. [回测系统 API](#回测系统-api)
6. [使用示例](api-examples.md)

## API 响应格式

所有 API 响应都遵循统一的格式：

```json
{
  "success": true,
  "data": {}, // 响应数据
  "message": "操作成功",
  "timestamp": 1755860989513, // 响应时间戳
  "path": "/api/path" // 请求路径
}
```

## 价格数据管理 API

### 1. 创建价格数据

**POST** `/price-data`

创建新的价格数据记录。

**请求体：**
```json
{
  "tradingPairId": 1,
  "timeframeId": 1,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "open": 50000.00,
  "high": 51000.00,
  "low": 49500.00,
  "close": 50500.00,
  "volume": 1000.50
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tradingPairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间框架ID |
| timestamp | string | 是 | 时间戳 |
| open | number | 是 | 开盘价 |
| high | number | 是 | 最高价 |
| low | number | 是 | 最低价 |
| close | number | 是 | 收盘价 |
| volume | number | 是 | 成交量 |

### 2. 获取所有价格数据

**GET** `/price-data`

获取所有价格数据记录。

### 3. 按范围获取价格数据

**GET** `/price-data/range`

根据时间范围和其他条件获取价格数据。

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tradingPairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间框架ID |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |

### 4. 获取单个价格数据

**GET** `/price-data/:id`

根据ID获取特定的价格数据记录。

### 交易对管理

### 5. 创建交易对

**POST** `/price-data/trading-pairs`

创建新的交易对。

**请求体：**
```json
{
  "symbol": "BTCUSDT",
  "baseAsset": "BTC",
  "quoteAsset": "USDT",
  "description": "Bitcoin/Tether"
}
```

### 6. 获取所有交易对

**GET** `/price-data/trading-pairs`

获取所有交易对列表。

### 7. 获取单个交易对

**GET** `/price-data/trading-pairs/:id`

根据ID获取特定交易对。

### 8. 根据符号获取交易对

**GET** `/price-data/trading-pairs/symbol/:symbol`

根据交易对符号获取交易对信息。

### 时间框架管理

### 9. 创建时间框架

**POST** `/price-data/timeframes`

创建新的时间框架。

**请求体：**
```json
{
  "name": "1h",
  "intervalMinutes": 60,
  "description": "1小时K线"
}
```

### 10. 获取所有时间框架

**GET** `/price-data/timeframes`

获取所有时间框架列表。

### 11. 获取单个时间框架

**GET** `/price-data/timeframes/:id`

根据ID获取特定时间框架。

### 12. 根据名称获取时间框架

**GET** `/price-data/timeframes/name/:name`

根据时间框架名称获取时间框架信息。

## 指标管理 API

### 1. 创建指标

**POST** `/indicators`

创建新的技术指标。

**请求体：**
```json
{
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
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 指标名称（唯一标识） |
| displayName | string | 是 | 显示名称 |
| description | string | 否 | 指标描述 |
| category | string | 否 | 指标分类 |
| parameters | array | 否 | 指标参数配置 |

### 2. 获取所有指标

**GET** `/indicators`

获取所有可用的技术指标列表。

### 3. 获取单个指标

**GET** `/indicators/:id`

根据ID获取特定指标的详细信息。

### 4. 获取指标参数

**GET** `/indicators/:id/parameters`

获取指定指标的所有参数配置。

### 5. 计算指标值

**POST** `/indicators/:id/calculate`

计算指定指标在给定数据上的值。

**请求体：**
```json
{
  "priceData": [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "open": 50000,
      "high": 51000,
      "low": 49500,
      "close": 50500,
      "volume": 1000
    }
  ],
  "parameters": {
    "period": 20
  }
}
```

## 策略管理 API

### 1. 创建策略

**POST** `/strategies`

创建新的交易策略。

**请求体：**
```json
{
  "name": "MA交叉策略",
  "description": "基于移动平均线交叉的交易策略",
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
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 策略名称 |
| description | string | 否 | 策略描述 |
| indicators | array | 是 | 策略使用的指标配置 |
| conditions | array | 是 | 交易条件配置 |

### 2. 获取所有策略

**GET** `/strategies`

获取所有交易策略列表。

### 3. 获取单个策略

**GET** `/strategies/:id`

根据ID获取特定策略的详细信息。

### 4. 获取策略指标

**GET** `/strategies/:id/indicators`

获取指定策略使用的所有指标配置。

## 回测系统 API

### 1. 运行回测

**POST** `/backtest`

执行策略回测。

**请求体：**
```json
{
  "strategyId": 1,
  "tradingPairId": 1,
  "timeframeId": 1,
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.000Z",
  "initialCapital": 10000,
  "earlyStopThreshold": 10
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| strategyId | number | 是 | 策略ID |
| tradingPairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间框架ID |
| startTime | string | 是 | 回测开始时间 |
| endTime | string | 是 | 回测结束时间 |
| initialCapital | number | 是 | 初始资金 |
| earlyStopThreshold | number | 否 | 提前结束阈值（百分比），默认为10 |

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
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:30:00.000Z"
  },
  "message": "回测执行成功",
  "timestamp": 1704096000000,
  "path": "/backtest"
}
```

### 2. 获取所有回测结果

**GET** `/backtest`

获取所有回测结果列表。

### 3. 获取单个回测结果

**GET** `/backtest/:id`

根据ID获取特定回测结果的详细信息。

### 4. 获取回测交易记录

**GET** `/backtest/:id/trades`

获取指定回测的所有交易记录。

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
  "message": "获取交易记录成功",
  "timestamp": 1704096000000,
  "path": "/backtest/1/trades"
}
```

## 错误响应格式

当API请求失败时，响应格式如下：

```json
{
  "success": false,
  "data": null,
  "message": "错误描述",
  "error": {
    "code": "ERROR_CODE",
    "details": "详细错误信息"
  },
  "timestamp": 1755860989513,
  "path": "/api/path"
}
```

## 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| STRATEGY_NOT_FOUND | 404 | 策略不存在 |
| INDICATOR_NOT_FOUND | 404 | 指标不存在 |
| INSUFFICIENT_DATA | 400 | 数据不足，无法执行回测 |
| BACKTEST_FAILED | 500 | 回测执行失败 |

## 注意事项

1. 所有时间参数都使用ISO 8601格式（YYYY-MM-DDTHH:mm:ss.sssZ）
2. 价格和金额字段支持最多8位小数
3. 回测执行是异步操作，可能需要一定时间完成
4. 建议在生产环境中使用适当的认证和授权机制
5. API响应中的timestamp字段为Unix时间戳（毫秒）