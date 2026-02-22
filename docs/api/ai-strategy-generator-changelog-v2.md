# AI策略生成器接口变更文档 (更新)

## 变更概述

本次更新修改了 `/ai-strategy-generator/generate` 接口的逻辑，现在该接口会将生成的指标写入数据库，并返回完整的策略格式。

---

## 接口变更列表

| 接口 | 变更类型 | 影响程度 |
|------|---------|---------|
| `/ai-strategy-generator/generate` | 逻辑变更 + 响应格式变更 | **高** |

---

## 1. `/ai-strategy-generator/generate` 接口变更

### 变更前

```json
{
  "success": true,
  "generatedStrategy": {
    "name": "策略名称",
    "description": "策略描述",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": null,
    "stopLossRatio": null,
    "indicatorNews": [...],
    "indicators": [...],
    "conditions": [...]
  }
}
```

### 变更后

```json
{
  "success": true,
  "generatedStrategy": {
    "name": "策略名称",
    "description": "策略描述",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": 0.1,
    "stopLossRatio": 0.05,
    "indicators": [
      {
        "id": 1,
        "name": "AI_MA_5",
        "description": "[AI生成] 5日移动平均线",
        "indicatorNewsIndex": 0,
        "parameters": [
          {
            "id": 1,
            "name": "period",
            "value": "5"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "currentValuePath": "",
        "comparedValuePath": "",
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "group": 1,
        "priority": 1,
        "customCode": ""
      }
    ]
  },
  "createdIndicators": [
    {
      "id": 1,
      "name": "AI_MA_5",
      "description": "[AI生成] 5日移动平均线",
      "calculationCode": "function calculate...",
      "parameters": [
        {
          "id": 1,
          "name": "period",
          "description": "计算周期",
          "paramType": "number",
          "defaultValue": "5"
        }
      ]
    }
  ]
}
```

### 主要变化

| 变化项 | 变更前 | 变更后 |
|------|--------|--------|
| 指标写入数据库 | ❌ 不写入 | ✅ 写入数据库 |
| 返回指标ID | ❌ 无ID | ✅ 包含数据库ID |
| `indicatorNews` 字段 | ✅ 存在 | ❌ 移除 (改用 indicators) |
| `indicators` 字段 | 只有索引 | 包含完整指标信息 + ID |
| `createdIndicators` 字段 | ❌ 不存在 | ✅ 新增，包含已创建的指标 |

---

## 2. 新增字段说明

### 2.1 generatedStrategy.indicators

```typescript
interface StrategyIndicator {
  id: number;                  // 数据库中的指标ID
  name: string;                // 指标名称
  description: string;         // 指标描述
  indicatorNewsIndex: number;  // 原始索引
  parameters: Array<{
    id: number;      // 参数ID
    name: string;   // 参数名称
    value: string;  // 参数值
  }>;
}
```

### 2.2 createdIndicators

```typescript
interface CreatedIndicator {
  id: number;              // 数据库中的指标ID
  name: string;            // 指标名称
  description: string;     // 指标描述
  calculationCode: string; // 计算代码
  parameters: Array<{
    id: number;           // 参数ID
    name: string;         // 参数名称
    description: string;  // 参数描述
    paramType: string;    // 参数类型
    defaultValue: string; // 默认值
  }>;
}
```

---

## 3. 前端修改指南

### 3.1 响应处理修改

**变更前**:
```typescript
const response = await api.generate(userInput);
const strategy = response.generatedStrategy;
// 指标没有ID，无法直接使用
const indicators = strategy.indicatorNews;
```

**变更后**:
```typescript
const response = await api.generate(userInput);
const strategy = response.generatedStrategy;
// 指标已写入数据库，包含ID
const indicators = strategy.indicators;
const createdIndicators = response.createdIndicators;

// 可以直接使用指标ID进行后续操作
const indicatorIds = indicators.map(i => i.id);
```

### 3.2 TypeScript 类型定义更新

```typescript
// 更新类型定义
interface GenerateResponse {
  success: boolean;
  generatedStrategy: {
    name: string;
    description: string;
    positionType: 'long' | 'short' | 'both';
    buyFee: number;
    sellFee: number;
    liquidationThreshold: number;
    takeProfitRatio: number | null;
    stopLossRatio: number | null;
    indicators: Array<{
      id: number;
      name: string;
      description: string;
      indicatorNewsIndex: number;
      parameters: Array<{
        id: number;
        name: string;
        value: string;
      }>;
    }>;
    conditions: Array<{
      indicatorIndex: number;
      comparisonType: 'constant' | 'indicator';
      comparedIndicatorIndex?: number;
      constantValue?: string;
      currentValuePath: string;
      comparedValuePath: string;
      operator: '>' | '>=' | '==' | '!=' | '<' | '<=';
      conditionType: 'value' | 'crossover';
      action: 'buy' | 'sell';
      group: number;
      priority: number;
      customCode: string;
    }>;
  };
  createdIndicators: Array<{
    id: number;
    name: string;
    description: string;
    calculationCode: string;
    parameters: Array<{
      id: number;
      name: string;
      description: string;
      paramType: string;
      defaultValue: string;
    }>;
  }>;
}
```

---

## 4. 注意事项

1. **指标已写入数据库**: generate 接口现在会将指标写入数据库，前端无需再调用 create 接口来保存指标
2. **包含数据库ID**: 返回的指标包含数据库ID，可以直接用于后续操作
3. **止盈止损**: AI会根据用户描述设置止盈止损值，如果用户未提及则为 null

---

## 5. 迁移检查清单

- [ ] 更新 TypeScript 类型定义
- [ ] 修改响应数据解析逻辑
- [ ] 更新 UI 展示组件
- [ ] 测试 generate 接口
