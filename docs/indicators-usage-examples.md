# Indicators模块使用示例

## 新增功能：使用price-data模块数据计算指标

现在indicators模块支持直接使用price-data模块中的数据进行指标计算，无需手动传入价格数据。

### 新增API接口

#### 1. 使用价格数据ID计算指标
```
POST /indicators/:id/calculate-with-data
```

请求体：
```json
{
  "pairId": 1,
  "timeframeId": 1,
  "startTime": 1640995200000,
  "endTime": 1641081600000,
  "parameters": {
    "period": 14,
    "smoothing": 2
  }
}
```

#### 2. 使用交易对符号计算指标
```
POST /indicators/:id/calculate-by-symbol
```

请求体：
```json
{
  "symbol": "BTCUSDT",
  "timeframeName": "1h",
  "startTime": 1640995200000,
  "endTime": 1641081600000,
  "parameters": {
    "period": 14,
    "smoothing": 2
  }
}
```

### 使用场景

1. **历史数据分析**：分析特定时间段的技术指标
2. **回测系统**：为策略回测提供指标数据
3. **实时监控**：获取最新的指标计算结果
4. **批量计算**：对多个时间段进行批量指标计算

### 数据格式

价格数据会被自动转换为以下格式供指标计算使用：
```javascript
{
  timestamp: 1640995200000,
  open: 47000.50,
  high: 47500.00,
  low: 46800.00,
  close: 47200.25,
  volume: 1250.75,
  volumeCurrency: 58759375.00,
  volumeCurrencyQuote: 58759375.00
}
```

### 错误处理

- 如果指定的交易对不存在，返回错误：`未找到交易对: SYMBOL`
- 如果指定的时间框架不存在，返回错误：`未找到时间框架: TIMEFRAME`
- 如果指定时间范围内没有数据，返回错误：`未找到指定时间范围内的价格数据`

### 性能优化

- 指标定义缓存在Redis中，提升计算性能
- **价格数据Redis缓存**：按pairId和timeframeId缓存所有价格数据
- 价格数据查询使用索引优化
- 支持大批量数据的高效处理

## 价格数据缓存管理

### 预加载缓存
```bash
# 预加载指定交易对和时间框架的数据
POST /price-data/cache/preload/1/1

# 预加载所有价格数据到Redis
POST /price-data/cache/preload-all
```

### 清除缓存
```bash
# 清除指定交易对和时间框架的缓存
POST /price-data/cache/clear/1/1

# 清除所有价格数据缓存
POST /price-data/cache/clear-all
```

### 缓存策略

1. **自动缓存**：首次查询时自动将数据缓存到Redis
2. **智能过滤**：从缓存中按时间范围过滤数据，避免重复数据库查询
3. **缓存更新**：新增价格数据时自动更新对应缓存
4. **过期时间**：缓存数据1小时后自动过期

### 缓存Key格式
```
price_data:{pairId}:{timeframeId}
```

例如：`price_data:1:1` 表示交易对ID为1，时间框架ID为1的价格数据缓存