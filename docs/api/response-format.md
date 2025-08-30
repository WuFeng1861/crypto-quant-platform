# API 响应格式

所有 API 响应都遵循统一的格式规范。

## 成功响应格式

```json
{
  "success": true,
  "data": {}, // 响应数据
  "message": "操作成功",
  "timestamp": 1755860989513, // 响应时间戳
  "path": "/api/path" // 请求路径
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 请求是否成功 |
| data | any | 实际返回的数据内容 |
| message | string | 操作结果描述信息 |
| timestamp | number | 响应时间戳（毫秒） |
| path | string | 请求的API路径 |

## 错误响应格式

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

### 错误字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 固定为 false |
| data | null | 错误时数据为 null |
| message | string | 错误描述信息 |
| error | object | 错误详情对象 |
| error.code | string | 错误代码 |
| error.details | string | 详细错误信息 |
| timestamp | number | 响应时间戳（毫秒） |
| path | string | 请求的API路径 |

## 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| STRATEGY_NOT_FOUND | 404 | 策略不存在 |
| INDICATOR_NOT_FOUND | 404 | 指标不存在 |
| TRADING_PAIR_NOT_FOUND | 404 | 交易对不存在 |
| TIMEFRAME_NOT_FOUND | 404 | 时间框架不存在 |
| INSUFFICIENT_DATA | 400 | 数据不足，无法执行操作 |
| BACKTEST_FAILED | 500 | 回测执行失败 |
| CALCULATION_ERROR | 500 | 指标计算失败 |

## 分页响应格式

对于支持分页的接口，响应格式如下：

```json
{
  "success": true,
  "data": {
    "items": [], // 数据列表
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "message": "查询成功",
  "timestamp": 1755860989513,
  "path": "/api/path"
}
```

## 注意事项

1. 所有时间参数都使用ISO 8601格式（YYYY-MM-DDTHH:mm:ss.sssZ）
2. 价格和金额字段支持最多8位小数
3. API响应中的timestamp字段为Unix时间戳（毫秒）
4. 建议在生产环境中使用适当的认证和授权机制
5. 请求超时时间建议设置为30秒