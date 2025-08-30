# 价格数据管理 API

价格数据管理模块提供价格数据、交易对和时间框架的管理功能。

## 价格数据接口

### 1. 创建价格数据

**POST** `/price-data`

创建新的价格数据记录。

**请求体：**
```json
{
  "pairId": 1,
  "timeframeId": 1,
  "timestamp": 1704067200000,
  "openPrice": 50000.00,
  "highPrice": 51000.00,
  "lowPrice": 49500.00,
  "closePrice": 50500.00,
  "volume": 1000.50,
  "volumeCurrency": 1000.50,
  "volumeCurrencyQuote": 50250000.00,
  "confirmed": 1
}
```

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间框架ID |
| timestamp | number | 是 | 时间戳（Unix时间戳） |
| openPrice | number | 是 | 开盘价 |
| highPrice | number | 是 | 最高价 |
| lowPrice | number | 是 | 最低价 |
| closePrice | number | 是 | 收盘价 |
| volume | number | 是 | 成交量 |
| volumeCurrency | number | 是 | 基础货币成交量 |
| volumeCurrencyQuote | number | 是 | 计价货币成交量 |
| confirmed | number | 否 | 确认状态，默认0 |

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "pairId": 1,
    "timeframeId": 1,
    "timestamp": 1704067200000,
    "openPrice": 50000.00,
    "highPrice": 51000.00,
    "lowPrice": 49500.00,
    "closePrice": 50500.00,
    "volume": 1000.50,
    "volumeCurrency": 1000.50,
    "volumeCurrencyQuote": 50250000.00,
    "confirmed": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "价格数据创建成功",
  "timestamp": 1704067200000,
  "path": "/price-data"
}
```

### 2. 获取所有价格数据

**GET** `/price-data`

获取所有价格数据记录。

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pairId": 1,
      "timeframeId": 1,
      "timestamp": 1704067200000,
      "openPrice": 50000.00,
      "highPrice": 51000.00,
      "lowPrice": 49500.00,
      "closePrice": 50500.00,
      "volume": 1000.50,
      "volumeCurrency": 1000.50,
      "volumeCurrencyQuote": 50250000.00,
      "confirmed": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "价格数据查询成功",
  "timestamp": 1704067200000,
  "path": "/price-data"
}
```

### 3. 按范围获取价格数据

**GET** `/price-data/range`

根据时间范围和其他条件获取价格数据。

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pairId | number | 是 | 交易对ID |
| timeframeId | number | 是 | 时间框架ID |
| startTime | string | 是 | 开始时间 |
| endTime | string | 是 | 结束时间 |

**请求示例：**
```
GET /price-data/range?pairId=1&timeframeId=1&startTime=2024-01-01T00:00:00.000Z&endTime=2024-01-31T23:59:59.000Z
```

### 4. 获取单个价格数据

**GET** `/price-data/:id`

根据ID获取特定的价格数据记录。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 价格数据ID |

## 交易对管理接口

### 1. 创建交易对

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

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 交易对符号 |
| baseAsset | string | 是 | 基础资产 |
| quoteAsset | string | 是 | 计价资产 |
| description | string | 否 | 交易对描述 |

### 2. 获取所有交易对

**GET** `/price-data/trading-pairs`

获取所有交易对列表。

### 3. 获取单个交易对

**GET** `/price-data/trading-pairs/:id`

根据ID获取特定交易对。

### 4. 根据符号获取交易对

**GET** `/price-data/trading-pairs/symbol/:symbol`

根据交易对符号获取交易对信息。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 交易对符号（如：BTCUSDT） |

## 时间框架管理接口

### 1. 创建时间框架

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

**参数说明：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 时间框架名称 |
| intervalMinutes | number | 是 | 间隔分钟数 |
| description | string | 否 | 时间框架描述 |

### 2. 获取所有时间框架

**GET** `/price-data/timeframes`

获取所有时间框架列表。

### 3. 获取单个时间框架

**GET** `/price-data/timeframes/:id`

根据ID获取特定时间框架。

### 4. 根据名称获取时间框架

**GET** `/price-data/timeframes/name/:name`

根据时间框架名称获取时间框架信息。

**路径参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 时间框架名称（如：1h, 4h, 1d） |

## 常见时间框架

| 名称 | intervalMinutes | 描述 |
|------|-----------------|------|
| 1m | 1 | 1分钟K线 |
| 5m | 5 | 5分钟K线 |
| 15m | 15 | 15分钟K线 |
| 30m | 30 | 30分钟K线 |
| 1h | 60 | 1小时K线 |
| 4h | 240 | 4小时K线 |
| 1d | 1440 | 1天K线 |
| 1w | 10080 | 1周K线 |

## 注意事项

1. 价格数据的timestamp必须与timeframe的间隔对齐
2. 同一交易对和时间框架下，timestamp不能重复
3. 价格字段支持最多8位小数
4. 成交量字段支持最多8位小数
5. 建议按时间顺序批量导入价格数据以提高性能