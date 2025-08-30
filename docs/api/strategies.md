# 策略管理 API

策略管理模块提供交易策略的创建、查询和配置管理功能。

## 策略接口

### 1. 创建策略

**POST** `/strategies`

创建新的交易策略。

**请求体：**
```json
{
  "name": "MA交叉策略",
  "description": "基于短期和长期移动平均线交叉的交易策略",
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
          "value": "10"
        }
      ]
    },
    {
      "indicatorId": 1,
      "priority": 1,
      "parameters": [
        {
          "parameterId": 1,
          "value": "30"
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
| positionType | string | 否 | 仓位类型（long, short, both），默认both |
| buyFee | number | 否 | 买入手续费率，默认0 |
| sellFee | number | 否 | 卖出手续费率，默认0 |
| liquidationThreshold | number | 否 | 清仓阈值（%），默认90 |
| indicators | array | 是 | 策略使用的指标配置 |
| conditions | array | 是 | 交易条件配置 |

**指标配置说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| indicatorId | number | 是 | 指标ID |
| priority | number | 否 | 指标优先级，默认0 |
| parameters | array | 是 | 指标参数配置 |

**参数配置说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| parameterId | number | 是 | 参数ID |
| value | string | 是 | 参数值（字符串格式） |

**条件配置说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 条件类型（buy, sell） |
| logic | string | 是 | 条件逻辑表达式 |

**响应示例：**
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

### 2. 获取所有策略

**GET** `/strategies`

获取所有交易策略列表。

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "MA交叉策略",
      "description": "基于短期和长期移动平均线交叉的交易策略",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "RSI超买超卖策略",
      "description": "基于RSI指标的超买超卖交易策略",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "策略查询成功",
  "timestamp": 1704067200000,
  "path": "/strategies"
}
```

### 3. 获取单个策略

**GET** `/strategies/:id`

根据ID获取特定策略的详细信息。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 策略ID |

**响应示例：**
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
      },
      {
        "id": 2,
        "alias": "sma_long",
        "indicator": {
          "id": 1,
          "name": "SMA",
          "displayName": "简单移动平均线"
        },
        "parameters": [
          {
            "name": "period",
            "value": "30"
          }
        ]
      }
    ],
    "conditions": [
      {
        "id": 1,
        "type": "buy",
        "logic": "sma_short > sma_long AND prev(sma_short) <= prev(sma_long)"
      },
      {
        "id": 2,
        "type": "sell",
        "logic": "sma_short < sma_long AND prev(sma_short) >= prev(sma_long)"
      }
    ]
  },
  "message": "策略查询成功",
  "timestamp": 1704067200000,
  "path": "/strategies/1"
}
```

### 4. 获取策略指标

**GET** `/strategies/:id/indicators`

获取指定策略使用的所有指标配置。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 策略ID |

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "strategyId": 1,
      "indicatorId": 1,
      "alias": "sma_short",
      "indicator": {
        "id": 1,
        "name": "SMA",
        "displayName": "简单移动平均线",
        "description": "计算指定周期的简单移动平均值"
      },
      "parameters": [
        {
          "id": 1,
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
      "indicator": {
        "id": 1,
        "name": "SMA",
        "displayName": "简单移动平均线",
        "description": "计算指定周期的简单移动平均值"
      },
      "parameters": [
        {
          "id": 2,
          "name": "period",
          "value": "30"
        }
      ]
    }
  ],
  "message": "策略指标查询成功",
  "timestamp": 1704067200000,
  "path": "/strategies/1/indicators"
}
```

## 条件逻辑表达式

策略条件支持以下逻辑表达式语法：

### 基本操作符
- `>` : 大于
- `<` : 小于
- `>=` : 大于等于
- `<=` : 小于等于
- `==` : 等于
- `!=` : 不等于

### 逻辑操作符
- `AND` : 逻辑与
- `OR` : 逻辑或
- `NOT` : 逻辑非

### 特殊函数
- `prev(indicator)` : 获取指标的前一个值
- `cross_above(a, b)` : a上穿b
- `cross_below(a, b)` : a下穿b
- `highest(indicator, period)` : 指定周期内的最高值
- `lowest(indicator, period)` : 指定周期内的最低值

### 示例表达式

**均线交叉：**
```
sma_short > sma_long AND prev(sma_short) <= prev(sma_long)
```

**RSI超买超卖：**
```
rsi < 30 AND prev(rsi) >= 30
```

**MACD金叉：**
```
cross_above(macd_line, macd_signal)
```

**复合条件：**
```
sma_short > sma_long AND rsi < 70 AND volume > prev(volume)
```

## 策略类型

### 1. 趋势跟踪策略
- 移动平均线交叉策略
- 趋势线突破策略
- 通道突破策略

### 2. 均值回归策略
- RSI超买超卖策略
- 布林带策略
- 支撑阻力策略

### 3. 动量策略
- MACD策略
- KDJ策略
- 价格动量策略

### 4. 复合策略
- 多指标确认策略
- 多时间框架策略
- 风险管理策略

## 最佳实践

1. **指标选择**：选择互补性强的指标组合，避免信号冗余
2. **参数优化**：根据历史数据优化指标参数
3. **条件设计**：设计清晰的买卖条件，避免过于复杂的逻辑
4. **风险控制**：在策略中加入止损和止盈条件
5. **回测验证**：创建策略后进行充分的回测验证

## 注意事项

1. 策略名称在系统中必须唯一
2. 指标别名在同一策略中必须唯一
3. 条件逻辑表达式必须语法正确
4. 建议在创建策略前先测试指标计算结果
5. 复杂策略可能影响回测性能，建议适度优化