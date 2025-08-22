# 量化回测平台 API 文档

## 目录

1. [API 响应格式](#api-响应格式)
2. [指标管理 API](#指标管理-api)
3. [策略管理 API](#策略管理-api)
4. [回测系统 API](#回测系统-api)
5. [使用示例](api-examples.md)

## API 响应格式

所有 API 响应都遵循统一的格式：

```json
{
  "code": 200,       // HTTP 状态码
  "message": "操作成功", // 操作结果描述
  "data": {},        // 实际数据内容
  "timestamp": 1755860989513 // 响应时间戳
}
```

错误响应格式：

```json
{
  "code": 400,       // HTTP 错误状态码
  "message": "错误描述", // 错误信息
  "data": null,      // 错误时数据为 null
  "timestamp": 1755860989513, // 响应时间戳
  "path": "/api/path" // 请求路径
}
```

## 指标管理 API

### 创建指标

- **URL**: `/indicators`
- **方法**: `POST`
- **描述**: 创建新的技术指标
- **请求体**:

```json
{
  "name": "指标名称",
  "description": "指标描述",
  "calculationCode": "function calculate(priceData, parameters) { /* 计算逻辑 */ return result; }",
  "parameters": [
    {
      "name": "参数名称",
      "description": "参数描述",
      "defaultValue": "默认值",
      "paramType": "number|string|boolean"
    }
  ]
}
```

- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "指标名称",
    "description": "指标描述",
    "calculationCode": "function calculate(priceData, parameters) { /* 计算逻辑 */ return result; }",
    "createdAt": "2025-08-22T11:00:00.000Z",
    "updatedAt": "2025-08-22T11:00:00.000Z"
  },
  "timestamp": 1755860989513
}
```

### 获取所有指标

- **URL**: `/indicators`
- **方法**: `GET`
- **描述**: 获取所有技术指标
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "name": "简单移动平均线",
      "description": "计算价格的简单移动平均线",
      "calculationCode": "...",
      "createdAt": "2025-08-22T11:00:00.000Z",
      "updatedAt": "2025-08-22T11:00:00.000Z"
    }
  ],
  "timestamp": 1755860989513
}
```

### 获取单个指标

- **URL**: `/indicators/:id`
- **方法**: `GET`
- **描述**: 获取指定 ID 的技术指标
- **参数**: `id` - 指标 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "简单移动平均线",
    "description": "计算价格的简单移动平均线",
    "calculationCode": "...",
    "createdAt": "2025-08-22T11:00:00.000Z",
    "updatedAt": "2025-08-22T11:00:00.000Z"
  },
  "timestamp": 1755860989513
}
```

### 获取指标参数

- **URL**: `/indicators/:id/parameters`
- **方法**: `GET`
- **描述**: 获取指定指标的参数
- **参数**: `id` - 指标 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "indicatorId": 1,
      "name": "period",
      "description": "周期",
      "defaultValue": "14",
      "paramType": "number",
      "createdAt": "2025-08-22T11:00:00.000Z",
      "updatedAt": "2025-08-22T11:00:00.000Z"
    }
  ],
  "timestamp": 1755860989513
}
```

### 计算指标值

- **URL**: `/indicators/:id/calculate`
- **方法**: `POST`
- **描述**: 使用指定指标计算价格数据
- **参数**: `id` - 指标 ID
- **请求体**:

```json
{
  "priceData": [
    {
      "timestamp": 1755860000000,
      "open_price": 50000,
      "high_price": 51000,
      "low_price": 49500,
      "close_price": 50500,
      "volume": 100
    }
  ],
  "parameters": {
    "period": 14
  }
}
```

- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [null, null, ..., 50500],
  "timestamp": 1755860989513
}
```

## 策略管理 API

### 创建策略

- **URL**: `/strategies`
- **方法**: `POST`
- **描述**: 创建新的交易策略
- **请求体**:

```json
{
  "name": "策略名称",
  "description": "策略描述",
  "positionType": "long|short|both",
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
          "value": "20"
        }
      ]
    }
  ],
  "conditions": [
    {
      "indicatorId": 1,
      "comparisonType": "indicator|constant",
      "comparedIndicatorId": 2,
      "constantValue": "50",
      "operator": ">|<|>=|<=|==|!=",
      "conditionType": "crossover|value",
      "action": "buy|sell|none",
      "group": 1,
      "priority": 0
    }
  ]
}
```

- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "策略名称",
    "description": "策略描述",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "createdAt": "2025-08-22T11:00:00.000Z",
    "updatedAt": "2025-08-22T11:00:00.000Z"
  },
  "timestamp": 1755860989513
}
```

### 获取所有策略

- **URL**: `/strategies`
- **方法**: `GET`
- **描述**: 获取所有交易策略
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "name": "双均线策略",
      "description": "使用短期和长期均线交叉产生交易信号",
      "positionType": "both",
      "buyFee": 0.001,
      "sellFee": 0.001,
      "createdAt": "2025-08-22T11:00:00.000Z",
      "updatedAt": "2025-08-22T11:00:00.000Z"
    }
  ],
  "timestamp": 1755860989513
}
```

### 获取单个策略

- **URL**: `/strategies/:id`
- **方法**: `GET`
- **描述**: 获取指定 ID 的交易策略
- **参数**: `id` - 策略 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "双均线策略",
    "description": "使用短期和长期均线交叉产生交易信号",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "createdAt": "2025-08-22T11:00:00.000Z",
    "updatedAt": "2025-08-22T11:00:00.000Z"
  },
  "timestamp": 1755860989513
}
```

### 获取策略指标

- **URL**: `/strategies/:id/indicators`
- **方法**: `GET`
- **描述**: 获取指定策略的指标配置
- **参数**: `id` - 策略 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "strategyId": 1,
      "indicatorId": 1,
      "priority": 0,
      "parameters": [
        {
          "id": 1,
          "strategyIndicatorId": 1,
          "parameterId": 1,
          "value": "5"
        }
      ]
    },
    {
      "id": 2,
      "strategyId": 1,
      "indicatorId": 1,
      "priority": 1,
      "parameters": [
        {
          "id": 2,
          "strategyIndicatorId": 2,
          "parameterId": 1,
          "value": "20"
        }
      ]
    }
  ],
  "timestamp": 1755860989513
}
```

### 获取策略条件

- **URL**: `/strategies/:id/conditions`
- **方法**: `GET`
- **描述**: 获取指定策略的条件配置
- **参数**: `id` - 策略 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "strategyId": 1,
      "indicatorId": 1,
      "comparisonType": "indicator",
      "comparedIndicatorId": 2,
      "constantValue": null,
      "operator": ">",
      "conditionType": "crossover",
      "action": "buy",
      "priority": 0,
      "createdAt": "2025-08-22T11:00:00.000Z",
      "updatedAt": "2025-08-22T11:00:00.000Z"
    },
    {
      "id": 2,
      "strategyId": 1,
      "indicatorId": 1,
      "comparisonType": "indicator",
      "comparedIndicatorId": 2,
      "constantValue": null,
      "operator": "<",
      "conditionType": "crossover",
      "action": "sell",
      "priority": 1,
      "createdAt": "2025-08-22T11:00:00.000Z",
      "updatedAt": "2025-08-22T11:00:00.000Z"
    }
  ],
  "timestamp": 1755860989513
}
```

## 回测系统 API

### 执行回测

- **URL**: `/backtest`
- **方法**: `POST`
- **描述**: 使用指定策略执行回测
- **请求体**:

```json
{
  "strategyId": 1,
  "pairId": 1,
  "timeframeId": 1,
  "startTime": "2025-01-01T00:00:00.000Z",
  "endTime": "2025-08-01T00:00:00.000Z",
  "initialCapital": 10000,
  "earlyStopThreshold": 10
}
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| strategyId | number | 是 | 策略ID |
| pairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间周期ID |
| startTime | string | 是 | 回测开始时间 |
| endTime | string | 是 | 回测结束时间 |
| initialCapital | number | 是 | 初始资金 |
| earlyStopThreshold | number | 否 | 提前结束阈值，默认为10（表示当资金低于初始资金的10%且无持仓时提前结束回测） |

- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2025-01-01T00:00:00.000Z",
    "endTime": "2025-08-01T00:00:00.000Z",
    "initialCapital": 10000,
    "finalCapital": 12500,
    "totalProfit": 2500,
    "profitRate": 25,
    "maxDrawdown": 10,
    "totalTrades": 15,
    "winningTrades": 10,
    "losingTrades": 5,
    "winRate": 66.67,
    "sharpeRatio": 1.5,
    "earlyStopped": false,
    "earlyStopReason": null,
    "earlyStopTime": null,
    "createdAt": "2025-08-22T11:00:00.000Z",
    "updatedAt": "2025-08-22T11:00:00.000Z"
  },
  "timestamp": 1755860989513
}
```

### 获取所有回测结果

- **URL**: `/backtest`
- **方法**: `GET`
- **描述**: 获取所有回测结果
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "strategyId": 1,
      "pairId": 1,
      "timeframeId": 1,
      "startTime": "2025-01-01T00:00:00.000Z",
      "endTime": "2025-08-01T00:00:00.000Z",
      "initialCapital": 10000,
      "finalCapital": 12500,
      "totalProfit": 2500,
      "profitRate": 25,
      "maxDrawdown": 10,
      "totalTrades": 15,
      "winningTrades": 10,
      "losingTrades": 5,
      "winRate": 66.67,
      "sharpeRatio": 1.5,
      "earlyStopped": false,
      "earlyStopReason": null,
      "earlyStopTime": null,
      "createdAt": "2025-08-22T11:00:00.000Z",
      "updatedAt": "2025-08-22T11:00:00.000Z"
    }
  ],
  "timestamp": 1755860989513
}
```

### 获取单个回测结果

- **URL**: `/backtest/:id`
- **方法**: `GET`
- **描述**: 获取指定 ID 的回测结果
- **参数**: `id` - 回测 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2025-01-01T00:00:00.000Z",
    "endTime": "2025-08-01T00:00:00.000Z",
    "initialCapital": 10000,
    "finalCapital": 12500,
    "totalProfit": 2500,
    "profitRate": 25,
    "maxDrawdown": 10,
    "totalTrades": 15,
    "winningTrades": 10,
    "losingTrades": 5,
    "winRate": 66.67,
    "sharpeRatio": 1.5,
    "earlyStopped": false,
    "earlyStopReason": null,
    "earlyStopTime": null,
    "createdAt": "2025-08-22T11:00:00.000Z",
    "updatedAt": "2025-08-22T11:00:00.000Z"
  },
  "timestamp": 1755860989513
}
```

### 获取回测交易记录

- **URL**: `/backtest/:id/trades`
- **方法**: `GET`
- **描述**: 获取指定回测的交易记录
- **参数**: `id` - 回测 ID
- **响应**:

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "backtestId": 1,
      "timestamp": "2025-01-15T10:30:00.000Z",
      "tradeType": "buy",
      "price": 50000,
      "amount": 0.1,
      "fee": 5,
      "profit": null,
      "profitRate": null,
      "balance": 5000,
      "signalIndicatorId": 1,
      "createdAt": "2025-08-22T11:00:00.000Z"
    },
    {
      "id": 2,
      "backtestId": 1,
      "timestamp": "2025-02-01T14:45:00.000Z",
      "tradeType": "sell",
      "price": 55000,
      "amount": 0.1,
      "fee": 5.5,
      "profit": 500,
      "profitRate": 10,
      "balance": 5500,
      "signalIndicatorId": 2,
      "createdAt": "2025-08-22T11:00:00.000Z"
    }
  ],
  "timestamp": 1755860989513
}