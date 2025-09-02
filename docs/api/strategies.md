# 策略管理 API

## 概述

策略管理模块提供了创建、查询和管理量化交易策略的功能。每个策略可以包含多个技术指标和交易条件。

## API 接口

### 获取所有策略（基本信息）
**GET** `/strategies`

返回所有策略的基本信息列表。

#### 响应示例
```json
[
  {
    "id": 1,
    "name": "MA交叉策略",
    "description": "基于移动平均线交叉的交易策略",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 获取单个策略（基本信息）
**GET** `/strategies/{id}`

根据ID获取单个策略的基本信息。

#### 路径参数
- `id` (number): 策略ID

#### 响应示例
```json
{
  "id": 1,
  "name": "MA交叉策略",
  "description": "基于移动平均线交叉的交易策略",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 90,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 获取所有策略（包含指标和条件）
**GET** `/strategies/with-details/all`

返回所有策略及其完整的指标和条件信息。

#### 响应示例
```json
[
  {
    "id": 1,
    "name": "MA交叉策略",
    "description": "基于移动平均线交叉的交易策略",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "indicators": [
      {
        "id": 1,
        "strategyId": 1,
        "indicatorId": 1,
        "priority": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "parameters": [
          {
            "id": 1,
            "strategyIndicatorId": 1,
            "parameterId": 1,
            "value": "5",
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
          }
        ]
      }
    ],
    "conditions": [
      {
        "id": 1,
        "strategyId": 1,
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "priority": 1,
        "group": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
]
```

### 获取单个策略（包含指标和条件）
**GET** `/strategies/with-details/{id}`

根据ID获取单个策略及其完整的指标和条件信息。

#### 路径参数
- `id` (number): 策略ID

#### 响应示例
```json
{
  "id": 1,
  "name": "MA交叉策略",
  "description": "基于移动平均线交叉的交易策略",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 90,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "indicators": [
    {
      "id": 1,
      "strategyId": 1,
      "indicatorId": 1,
      "priority": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "parameters": [
        {
          "id": 1,
          "strategyIndicatorId": 1,
          "parameterId": 1,
          "value": "5",
          "createdAt": "2024-01-01T00:00:00.000Z",
          "updatedAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "conditions": [
    {
      "id": 1,
      "strategyId": 1,
      "indicatorIndex": 0,
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 1,
      "operator": ">",
      "conditionType": "crossover",
      "action": "buy",
      "priority": 1,
      "group": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 获取策略指标
**GET** `/strategies/{id}/indicators`

根据策略ID获取该策略的所有指标配置。

#### 路径参数
- `id` (number): 策略ID

#### 响应示例
```json
[
  {
    "id": 1,
    "strategyId": 1,
    "indicatorId": 1,
    "priority": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "parameters": [
      {
        "id": 1,
        "strategyIndicatorId": 1,
        "parameterId": 1,
        "value": "5",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
]
```

## 数据模型

### Strategy (策略)

| 字段 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| id | number | 策略ID (自动生成) | - |
| name | string | 策略名称 (最大100字符) | - |
| description | string | 策略描述 (可选) | null |
| positionType | enum | 持仓类型: 'long', 'short', 'both' | 'both' |
| buyFee | decimal | 买入手续费 (0-1) | 0 |
| sellFee | decimal | 卖出手续费 (0-1) | 0 |
| liquidationThreshold | decimal | 清算阈值 (0-100) | 90 |
| createdAt | datetime | 创建时间 | - |
| updatedAt | datetime | 更新时间 | - |

### StrategyIndicator (策略指标关联)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | number | 关联ID |
| strategyId | number | 策略ID |
| indicatorId | number | 指标ID |
| priority | number | 优先级 |

### StrategyIndicatorParam (策略指标参数)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | number | 参数ID |
| strategyIndicatorId | number | 策略指标关联ID |
| parameterId | number | 参数ID |
| value | string | 参数值 |

### StrategyCondition (策略条件)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | number | 条件ID |
| strategyId | number | 策略ID |
| indicatorIndex | number | 指标ID |
| comparisonType | enum | 比较类型: 'indicator', 'constant' |
| comparedIndicatorId | number | 被比较的指标ID (可选) |
| constantValue | decimal | 常量值 (可选) |
| operator | enum | 操作符: '>', '<', '>=', '<=', '=', '!=' |
| conditionType | enum | 条件类型: 'crossover', 'value' |
| action | enum | 动作: 'buy', 'sell' |
| priority | number | 优先级 |

### 创建策略

**POST** `/strategies`

创建一个新的交易策略，包括指标配置和交易条件。

#### 请求体

```json
{
  "name": "MA交叉策略",
  "description": "基于MA5和MA20移动平均线交叉的交易策略",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 85,
  "indicators": [
    {
      "indicatorId": 3,
      "priority": 1,
      "parameters": [
        {
          "parameterId": 1,
          "value": "5"
        }
      ]
    },
    {
      "indicatorId": 3,
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
      "indicatorIndex": 0,
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 1,
      "operator": ">",
      "conditionType": "crossover",
      "action": "buy",
      "priority": 1,
      "group": 1
    },
    {
      "indicatorIndex": 0,
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 1,
      "operator": "<",
      "conditionType": "crossover",
      "action": "sell",
      "priority": 1,
      "group": 2
    }
  ]
}
```

#### 请求参数说明

**基础策略信息:**
- `name` (string, 必填): 策略名称
- `description` (string, 可选): 策略描述
- `positionType` (enum, 可选): 持仓类型，可选值: 'long', 'short', 'both'，默认 'both'
- `buyFee` (number, 可选): 买入手续费，范围 0-1，默认 0
- `sellFee` (number, 可选): 卖出手续费，范围 0-1，默认 0
- `liquidationThreshold` (number, 可选): 清算阈值，范围 0-100，默认 90

**指标配置:**
- `indicators` (array): 策略使用的指标列表
  - `indicatorId` (number, 必填): 指标ID
  - `priority` (number, 可选): 优先级，默认 0
  - `parameters` (array): 指标参数列表
    - `parameterId` (number, 必填): 参数ID
    - `value` (string, 必填): 参数值

**交易条件:**
- `conditions` (array): 策略交易条件列表
  - `indicatorIndex` (number, 必填): 指标在策略中的下标位置
  - `comparisonType` (enum, 必填): 比较类型，'indicator' 或 'constant'
  - `comparedIndicatorIndex` (number, 可选): 被比较指标在策略中的下标位置 (当 comparisonType 为 'indicator' 时必填)
  - `constantValue` (number, 可选): 常量值 (当 comparisonType 为 'constant' 时必填)
  - `operator` (enum, 必填): 操作符，可选值: '>', '<', '>=', '<=', '=', '!='
  - `conditionType` (enum, 必填): 条件类型，'entry' 或 'exit'
  - `action` (enum, 必填): 动作，'buy' 或 'sell'
  - `priority` (number, 可选): 优先级，默认 0

#### 响应

```json
{
  "id": 1,
  "name": "MA交叉策略",
  "description": "基于移动平均线交叉的交易策略",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 85,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```



## 错误响应

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "positionType must be one of the following values: long, short, both"
  ],
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Strategy with id 1 not found",
  "error": "Not Found"
}
```

## 使用示例

### 创建一个简单的MA交叉策略

```bash
curl -X POST http://localhost:3000/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "简单MA交叉",
    "description": "20日线上穿50日线买入，下穿卖出",
    "positionType": "long",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "indicators": [
      {
        "indicatorId": 1,
        "priority": 1,
        "parameters": [
          {"parameterId": 1, "value": "5"}
        ]
      },
      {
        "indicatorId": 1,
        "priority": 2,
        "parameters": [
          {"parameterId": 1, "value": "20"}
        ]
      }
    ],
    "conditions": [
      {
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "operator": ">",
        "conditionType": "entry",
        "action": "buy",
        "priority": 1
      },
      {
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "operator": "<",
        "conditionType": "exit",
        "action": "sell",
        "priority": 1
      }
    ]
  }'
```

## 注意事项

1. **指标依赖**: 创建策略时，确保引用的指标ID存在于系统中
2. **参数验证**: 所有数值参数都有范围限制，请确保传入的值在有效范围内
3. **缓存机制**: 策略创建后会自动缓存到Redis，缓存时间为1小时
4. **条件逻辑**: 策略条件按优先级执行，确保设置合理的优先级
5. **手续费**: 手续费以小数形式表示，0.001表示0.1%