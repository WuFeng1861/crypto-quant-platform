# 指标管理 API

指标管理模块提供技术指标的创建、查询、参数管理和计算功能。

## 指标接口

### 1. 创建指标

**POST** `/indicators`

创建新的技术指标。

**请求体：**
```json
{
  "name": "SMA",
  "description": "计算指定周期的简单移动平均值",
  "calculationCode": "function calculate(data, params) { /* 计算逻辑 */ }",
  "parameters": [
    {
      "name": "period",
      "description": "计算移动平均的周期数",
      "defaultValue": "20",
      "paramType": "number"
    }
  ]
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 指标名称（唯一标识） |
| description | string | 否 | 指标描述 |
| calculationCode | string | 是 | 指标计算代码 |
| parameters | array | 是 | 指标参数配置 |

**参数配置说明：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 参数名称 |
| description | string | 否 | 参数描述 |
| defaultValue | string | 否 | 默认值（字符串格式） |
| paramType | string | 是 | 参数类型（number, string, boolean） |

**响应示例：**
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

### 2. 获取所有指标

**GET** `/indicators`

获取所有可用的技术指标列表。

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "SMA",
      "displayName": "简单移动平均线",
      "description": "计算指定周期的简单移动平均值",
      "category": "trend",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "EMA",
      "displayName": "指数移动平均线",
      "description": "计算指定周期的指数移动平均值",
      "category": "trend",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "指标查询成功",
  "timestamp": 1704067200000,
  "path": "/indicators"
}
```

### 3. 获取单个指标

**GET** `/indicators/:id`

根据ID获取特定指标的详细信息。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 指标ID |

**响应示例：**
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
  "message": "指标查询成功",
  "timestamp": 1704067200000,
  "path": "/indicators/1"
}
```

### 4. 获取指标参数

**GET** `/indicators/:id/parameters`

获取指定指标的所有参数配置。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 指标ID |

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "indicatorId": 1,
      "name": "period",
      "displayName": "周期",
      "type": "number",
      "defaultValue": 20,
      "minValue": 1,
      "maxValue": 200,
      "description": "计算移动平均的周期数",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "参数查询成功",
  "timestamp": 1704067200000,
  "path": "/indicators/1/parameters"
}
```

### 5. 更新指标

**PATCH** `/indicators/:id`

更新已存在的指标信息及其参数。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 指标ID |

**请求体：**
```json
{
  "name": "增强型下跌指标",
  "description": "下跌指标的新描述",
  "calculationCode": "function calculate(priceData, parameters) { /* 新代码逻辑 */ }",
  "parameters": [
    {
      "name": "threshold",
      "description": "下跌阈值",
      "defaultValue": "0.01",
      "paramType": "number"
    }
  ]
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| **name** | `string` | 否 | 指标名称 |
| **description** | `string` | 否 | 指标描述 |
| **calculationCode** | `string` | 否 | 指标计算逻辑（JavaScript 代码字符串） |
| **parameters** | `Array<Object>` | 否 | 指标参数列表（若提供，将完全覆盖原参数） |

**parameters 数组项结构：**
| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| **name** | `string` | 是 | 参数变量名 |
| **description** | `string` | 否 | 参数描述 |
| **defaultValue** | `string` | 否 | 默认值（字符串格式） |
| **paramType** | `string` | 是 | 参数类型（'number', 'string', 'boolean'） |

**响应示例：**
```json
{
  "id": 45,
  "name": "增强型下跌指标",
  "description": "下跌指标",
  "calculationCode": "function calculate(priceData, parameters) { ... }",
  "createdAt": "2026-03-08T14:47:40.280Z",
  "updatedAt": "2026-03-09T08:30:00.000Z",
  "parameters": [
    {
      "id": 10,
      "indicatorId": 45,
      "name": "threshold",
      "description": "下跌阈值",
      "defaultValue": "0.01",
      "paramType": "number",
      "createdAt": "2026-03-09T08:30:00.000Z",
      "updatedAt": "2026-03-09T08:30:00.000Z"
    }
  ]
}
```

### 6. 删除指标

**DELETE** `/indicators/:id`

删除指定的指标及其关联的参数。

**注意**：如果该指标正在被某些策略使用，删除操作可能会因为数据库外键约束而失败。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 指标ID |

**响应示例：**
```json
{
  "success": true,
  "message": "指标删除成功"
}
```

### 7. 计算指标值

**POST** `/indicators/:id/calculate`

计算指定指标在给定数据上的值。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 指标ID |

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
    },
    {
      "timestamp": "2024-01-01T01:00:00.000Z",
      "open": 50500,
      "high": 51500,
      "low": 50000,
      "close": 51000,
      "volume": 1200
    }
  ],
  "parameters": {
    "period": 20
  }
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| priceData | array | 是 | 价格数据数组 |
| parameters | object | 是 | 指标参数配置 |

**价格数据字段：**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| timestamp | string | 是 | 时间戳 |
| open | number | 是 | 开盘价 |
| high | number | 是 | 最高价 |
| low | number | 是 | 最低价 |
| close | number | 是 | 收盘价 |
| volume | number | 是 | 成交量 |

**响应示例：**
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
        "value": 50750.0
      }
    ]
  },
  "message": "指标计算成功",
  "timestamp": 1704067200000,
  "path": "/indicators/1/calculate"
}
```

## 指标分类

| 分类 | 英文名 | 说明 | 常见指标 |
|------|--------|------|----------|
| 趋势指标 | trend | 识别价格趋势方向 | SMA, EMA, MACD |
| 动量指标 | momentum | 衡量价格变化速度 | RSI, KDJ, CCI |
| 波动率指标 | volatility | 衡量价格波动程度 | Bollinger Bands, ATR |
| 成交量指标 | volume | 分析成交量变化 | OBV, VWAP |

## 常用指标参数

### SMA (简单移动平均线)
- period: 周期数，常用值：5, 10, 20, 50, 200

### EMA (指数移动平均线)
- period: 周期数，常用值：12, 26, 50, 200

### RSI (相对强弱指数)
- period: 周期数，常用值：14
- overbought: 超买线，常用值：70
- oversold: 超卖线，常用值：30

### MACD
- fastPeriod: 快线周期，常用值：12
- slowPeriod: 慢线周期，常用值：26
- signalPeriod: 信号线周期，常用值：9

### Bollinger Bands (布林带)
- period: 周期数，常用值：20
- stdDev: 标准差倍数，常用值：2

## 注意事项

1. 指标计算需要足够的历史数据，建议至少提供指标周期2倍的数据量
2. 某些指标在数据不足时会返回null值
3. 复合指标（如MACD）可能返回对象格式的值
4. 指标参数的有效性会在计算前进行验证
5. 建议缓存指标计算结果以提高性能