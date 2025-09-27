# 策略管理 CRUD API 文档

## 概述

本文档描述了策略管理系统的完整CRUD功能，包括策略、指标和条件的创建、读取、更新和删除操作。

## 基础策略操作

### 1. 创建策略
```http
POST /strategies
Content-Type: application/json

{
  "name": "MACD交叉策略",
  "description": "基于MACD指标的交叉策略",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 90,
  "takeProfitRatio": 120,
  "stopLossRatio": 10,
  "indicators": [
    {
      "indicatorId": 1,
      "priority": 1,
      "parameters": [
        {
          "parameterId": 1,
          "value": "12"
        },
        {
          "parameterId": 2,
          "value": "26"
        }
      ]
    }
  ],
  "conditions": [
    {
      "indicatorIndex": 0,
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 0,
      "currentValuePath": "macd",
      "comparedValuePath": "signal",
      "operator": ">",
      "conditionType": "crossover",
      "action": "buy",
      "group": 1,
      "priority": 1,
      "customCode": "return indicatorValues[0].macd > indicatorValues[0].signal;"
    }
  ]
}
```

### 2. 获取所有策略
```http
GET /strategies
```

### 3. 获取单个策略
```http
GET /strategies/{id}
```

### 4. 获取策略详细信息（包含指标和条件）
```http
GET /strategies/with-details/{id}
```

### 5. 获取所有策略详细信息
```http
GET /strategies/with-details/all
```

### 6. 更新策略 ⭐ 新功能
```http
PUT /strategies/{id}
Content-Type: application/json

{
  "name": "更新后的策略名称",
  "description": "更新后的描述",
  "buyFee": 0.002,
  "indicators": [
    {
      "id": 1,  // 更新现有指标
      "indicatorId": 1,
      "priority": 2,
      "parameters": [
        {
          "parameterId": 1,
          "value": "14"
        }
      ]
    },
    {
      // 新增指标（没有id字段）
      "indicatorId": 2,
      "priority": 1,
      "parameters": [
        {
          "parameterId": 3,
          "value": "20"
        }
      ]
    }
  ],
  "conditions": [
    {
      "id": 1,  // 更新现有条件
      "operator": ">=",
      "group": 1,
      "customCode": "return indicatorValues[0].macd >= indicatorValues[0].signal;"
    },
    {
      // 新增条件（没有id字段）
      "indicatorIndex": 1,
      "comparisonType": "constant",
      "constantValue": "0",
      "operator": ">",
      "conditionType": "value",
      "action": "sell",
      "group": 2,
      "priority": 2
    }
  ]
}
```

### 7. 删除策略 ⭐ 新功能
```http
DELETE /strategies/{id}
```

## 指标管理操作

### 1. 获取策略指标
```http
GET /strategies/{id}/indicators
```

### 2. 更新策略指标 ⭐ 新功能
```http
PUT /strategies/{strategyId}/indicators/{indicatorId}
Content-Type: application/json

{
  "priority": 2,
  "parameters": [
    {
      "parameterId": 1,
      "value": "15"
    },
    {
      "parameterId": 2,
      "value": "30"
    }
  ]
}
```

### 3. 删除策略指标 ⭐ 新功能
```http
DELETE /strategies/{strategyId}/indicators/{indicatorId}
```

## 条件管理操作

### 1. 更新策略条件 ⭐ 新功能
```http
PUT /strategies/{strategyId}/conditions/{conditionId}
Content-Type: application/json

{
  "operator": ">=",
  "constantValue": "0.5",
  "action": "sell",
  "group": 1,
  "priority": 3,
  "customCode": "return indicatorValues[0].rsi >= 70;"
}
```

### 2. 删除策略条件 ⭐ 新功能
```http
DELETE /strategies/{strategyId}/conditions/{conditionId}
```

## 响应格式

### 成功响应
```json
{
  "id": 1,
  "name": "策略名称",
  "description": "策略描述",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 90,
  "takeProfitRatio": 120,
  "stopLossRatio": 10,
  "createdAt": "2025-09-27T01:00:00.000Z",
  "updatedAt": "2025-09-27T01:00:00.000Z"
}
```

### 错误响应
```json
{
  "statusCode": 404,
  "message": "策略不存在"
}
```

```json
{
  "statusCode": 400,
  "message": "更新策略失败: 详细错误信息"
}
```

## 条件分组逻辑说明

### group 参数详解
`group`参数用于控制条件之间的逻辑关系：

- **同一组内的条件**：使用 **AND** 逻辑连接
- **不同组之间**：使用 **OR** 逻辑连接
- **默认值**：如果不指定，默认为 `group: 1`

### 条件分组示例
```json
{
  "conditions": [
    {
      "indicatorIndex": 0,
      "operator": ">",
      "constantValue": "50",
      "action": "buy",
      "group": 1,
      "priority": 1
    },
    {
      "indicatorIndex": 1,
      "operator": "<",
      "constantValue": "30",
      "action": "buy", 
      "group": 1,
      "priority": 2
    },
    {
      "indicatorIndex": 2,
      "operator": ">",
      "constantValue": "0",
      "action": "buy",
      "group": 2,
      "priority": 3
    }
  ]
}
```

**逻辑解释**：
- 条件1和条件2属于group 1，它们之间是AND关系
- 条件3属于group 2
- 最终逻辑：`(条件1 AND 条件2) OR 条件3`

### 实际应用场景
```javascript
// 场景1：多重确认买入信号
// RSI > 50 AND MACD > 0 (两个条件都满足才买入)
{
  "conditions": [
    {
      "indicatorIndex": 0, // RSI
      "operator": ">",
      "constantValue": "50",
      "action": "buy",
      "group": 1
    },
    {
      "indicatorIndex": 1, // MACD
      "operator": ">", 
      "constantValue": "0",
      "action": "buy",
      "group": 1
    }
  ]
}

// 场景2：多种买入信号
// RSI超卖 OR 价格跌破支撑位 (任一条件满足就买入)
{
  "conditions": [
    {
      "indicatorIndex": 0, // RSI
      "operator": "<",
      "constantValue": "30",
      "action": "buy", 
      "group": 1
    },
    {
      "indicatorIndex": 1, // 价格
      "operator": "<",
      "constantValue": "100",
      "action": "buy",
      "group": 2
    }
  ]
}

// 场景3：复杂组合逻辑
// (RSI > 70 AND MACD < 0) OR (价格 > MA20 AND 成交量 > 平均值)
{
  "conditions": [
    {
      "indicatorIndex": 0, // RSI
      "operator": ">",
      "constantValue": "70", 
      "action": "sell",
      "group": 1
    },
    {
      "indicatorIndex": 1, // MACD
      "operator": "<",
      "constantValue": "0",
      "action": "sell",
      "group": 1
    },
    {
      "indicatorIndex": 2, // 价格
      "operator": ">",
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 3, // MA20
      "action": "sell",
      "group": 2
    },
    {
      "indicatorIndex": 4, // 成交量
      "operator": ">",
      "constantValue": "1000000",
      "action": "sell", 
      "group": 2
    }
  ]
}
```

## 更新操作说明

### 策略更新规则
1. **部分更新**：只需要传入需要更新的字段
2. **指标更新**：
   - 有`id`字段的指标会被更新
   - 没有`id`字段的指标会被新增
   - 不在更新列表中的现有指标会被删除
3. **条件更新**：
   - 有`id`字段的条件会被更新
   - 没有`id`字段的条件会被新增
   - 不在更新列表中的现有条件会被删除

### 级联删除
- 删除策略时，会自动删除关联的所有指标、指标参数和条件
- 删除指标时，会自动删除关联的所有指标参数
- 所有删除操作都会清除相关的Redis缓存

### 缓存管理
- 所有更新和删除操作都会自动清除相关的Redis缓存
- 确保数据的一致性和实时性

## 使用示例

### 完整的策略更新流程
```javascript
// 1. 获取现有策略
const strategy = await fetch('/strategies/with-details/1').then(r => r.json());

// 2. 修改策略信息
strategy.name = "更新后的策略名称";
strategy.indicators[0].priority = 2;  // 更新第一个指标的优先级
strategy.conditions[0].operator = ">=";  // 更新第一个条件的操作符

// 3. 添加新的条件
strategy.conditions.push({
  indicatorIndex: 1,
  comparisonType: "constant",
  constantValue: "0.8",
  operator: ">",
  conditionType: "value",
  action: "sell",
  group: 2,
  priority: 3
});

// 4. 提交更新
await fetch('/strategies/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(strategy)
});
```

### 单独更新指标参数
```javascript
// 更新MACD指标的参数
await fetch('/strategies/1/indicators/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    parameters: [
      { parameterId: 1, value: "14" },  // 快线周期
      { parameterId: 2, value: "28" }   // 慢线周期
    ]
  })
});
```

### 更新条件的自定义代码
```javascript
// 更新条件的自定义代码逻辑
await fetch('/strategies/1/conditions/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customCode: `
      // 更复杂的交叉逻辑
      const currentMACD = indicatorValues[0].macd;
      const currentSignal = indicatorValues[0].signal;
      const prevMACD = getHistoricalData(index - 1, 0)?.macd;
      const prevSignal = getHistoricalData(index - 1, 0)?.signal;
      
      // 金叉：MACD从下方穿越信号线
      return prevMACD <= prevSignal && currentMACD > currentSignal;
    `
  })
});
```

## 注意事项

1. **数据验证**：所有输入数据都会进行严格的验证
2. **事务处理**：复杂的更新操作使用数据库事务确保数据一致性
3. **错误处理**：提供详细的错误信息帮助调试
4. **性能优化**：使用Redis缓存提高查询性能
5. **安全性**：自定义代码在安全的沙箱环境中执行