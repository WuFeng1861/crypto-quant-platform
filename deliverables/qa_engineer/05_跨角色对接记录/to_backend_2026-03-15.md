# 接口契约对接文档 - 致后端开发

## 对接信息
- **对接日期**: 2026-03-15
- **发送方**: QA Engineer
- **接收方**: Backend Developer
- **状态**: [等待Backend确认]

---

## 一、接口契约确认请求

基于 PRD 文档，需要与后端开发确认以下接口契约细节：

### 1.1 请求确认项

| 序号 | 确认项 | 当前假设 | 需要确认 |
|------|--------|----------|----------|
| 1 | 批量任务创建响应码 | 201 Created | 是否使用 201？ |
| 2 | 错误响应格式 | 统一错误格式 | 具体格式定义 |
| 3 | 分页参数 | page, limit | 参数命名 |
| 4 | 排序参数 | sortBy, order | 参数命名和取值 |
| 5 | 时间戳格式 | ISO 8601 | 是否统一 |

### 1.2 待定义的错误码

| 场景 | 建议状态码 | 建议错误码 | 需要确认 |
|------|------------|------------|----------|
| 策略不存在 | 400 | STRATEGY_NOT_FOUND | ✅ |
| 交易对不存在 | 400 | PAIR_NOT_FOUND | ✅ |
| 任务不存在 | 404 | BATCH_NOT_FOUND | ✅ |
| 状态冲突 | 400 | INVALID_STATUS | ✅ |
| 无重试任务 | 400 | NO_RETRYABLE_TASKS | ✅ |

---

## 二、建议的接口契约

### 2.1 统一响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": 1704096000000
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "STRATEGY_NOT_FOUND",
    "message": "策略不存在",
    "details": { "strategyId": 99999 }
  },
  "timestamp": 1704096000000
}
```

### 2.2 接口详细契约

#### POST /backtest/batch

**请求**:
```json
{
  "strategyId": 1,
  "pairIds": [1, 2, 3],
  "timeframeId": 1,
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-12-31T23:59:59.000Z",
  "initialCapital": 10000,
  "earlyStopThreshold": 10,
  "positionDivision": 1
}
```

**成功响应 (201)**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "totalPairs": 3,
    "status": "pending",
    "createdAt": "2026-03-15T10:00:00.000Z"
  },
  "message": "批量回测任务创建成功"
}
```

**错误响应 (400)**:
```json
{
  "success": false,
  "error": {
    "code": "STRATEGY_NOT_FOUND",
    "message": "策略不存在: id=99999"
  }
}
```

#### GET /backtest/batch/:id

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1001,
    "strategyId": 1,
    "timeframeId": 1,
    "status": "running",
    "totalPairs": 50,
    "completedPairs": 25,
    "failedPairs": 2,
    "currentPairId": 26,
    "currentPairSymbol": "ETH/USDT",
    "progress": 50,
    "estimatedRemainingTime": 1800,
    "createdAt": "2026-03-15T10:00:00.000Z",
    "startedAt": "2026-03-15T10:00:05.000Z"
  }
}
```

#### GET /backtest/batch/:id/items

**查询参数**:
- `status`: 筛选状态 (pending/running/completed/failed/cancelled)
- `sortBy`: 排序字段 (profitRate/winRate/completedAt)
- `order`: 排序方向 (asc/desc)
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20, 最大 100)

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "pairId": 1,
        "symbol": "BTC/USDT",
        "status": "completed",
        "backtestResultId": 2001,
        "profitRate": 15.5,
        "winRate": 62.5,
        "completedAt": "2026-03-15T10:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

#### POST /backtest/batch/:id/pause

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "pausing",
    "message": "任务暂停中，当前交易对完成后暂停"
  }
}
```

**错误响应 (400)**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "任务未在执行中，无法暂停",
    "currentStatus": "pending"
  }
}
```

#### POST /backtest/batch/:id/resume

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "running"
  },
  "message": "任务已继续执行"
}
```

#### POST /backtest/batch/:id/cancel

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "cancelling"
  },
  "message": "任务取消中"
}
```

#### POST /backtest/batch/:id/retry

**请求**:
```json
{
  "pairIds": [5, 10]
}
```
> 不传 pairIds 时重试所有失败任务

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "retryCount": 2,
    "retryPairIds": [5, 10],
    "status": "running"
  }
}
```

**错误响应 (400)**:
```json
{
  "success": false,
  "error": {
    "code": "NO_RETRYABLE_TASKS",
    "message": "没有可重试的失败任务"
  }
}
```

#### GET /backtest/batch/:id/summary

**成功响应 (200)**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "totalPairs": 50,
    "completedPairs": 48,
    "failedPairs": 2,
    "summary": {
      "avgProfitRate": 12.5,
      "maxProfitRate": 45.2,
      "minProfitRate": -15.3,
      "avgWinRate": 58.3,
      "profitablePairs": 35,
      "losingPairs": 13
    },
    "topPerformers": [
      {"pairId": 10, "symbol": "PEPE/USDT", "profitRate": 45.2}
    ],
    "worstPerformers": [
      {"pairId": 22, "symbol": "LUNA/USDT", "profitRate": -15.3}
    ]
  }
}
```

---

## 三、测试关注点

### 3.1 契约测试重点

1. **响应格式一致性**: 所有接口遵循统一响应格式
2. **状态码正确性**: 成功/错误使用正确的 HTTP 状态码
3. **错误信息清晰**: 错误信息包含足够上下文
4. **字段完整性**: 响应包含所有必需字段
5. **数据类型正确**: 字段类型符合定义

### 3.2 边界条件测试

1. **空数组处理**: pairIds: [] 的处理
2. **大数据量**: 分页功能正确性
3. **并发控制**: 同时操作同一任务的处理
4. **状态冲突**: 非法状态转换的拒绝

---

## 四、确认回复模板

请后端开发回复以下格式：

```markdown
## 接口契约确认回复

### 通用格式确认
- 响应格式: [确认 / 建议修改]
- 错误码定义: [确认 / 建议修改]

### 接口确认

#### POST /backtest/batch
- URL: [确认 / 建议修改]
- 请求参数: [确认 / 建议修改]
- 响应格式: [确认 / 建议修改]
- 状态码: [确认 / 建议修改]

#### GET /backtest/batch/:id
- URL: [确认 / 建议修改]
- 响应格式: [确认 / 建议修改]

#### POST /backtest/batch/:id/pause
- URL: [确认 / 建议修改]
- 异步处理: [确认 / 建议修改]

#### POST /backtest/batch/:id/resume
- URL: [确认 / 建议修改]

#### POST /backtest/batch/:id/cancel
- URL: [确认 / 建议修改]
- 异步处理: [确认 / 建议修改]

#### POST /backtest/batch/:id/retry
- URL: [确认 / 建议修改]
- 请求参数: [确认 / 建议修改]

#### GET /backtest/batch/:id/summary
- URL: [确认 / 建议修改]
- 响应格式: [确认 / 建议修改]

#### GET /backtest/batch/:id/items
- URL: [确认 / 建议修改]
- 查询参数: [确认 / 建议修改]

### 其他说明
[其他需要沟通的事项]
```

---

## 五、参考文档

- [PRD文档](../../product_manager/02_PRD文档.md)
- [后端对接文档](../../product_manager/04_跨角色对接记录/to_backend_2026-03-15.md)
- [测试用例集](../04_测试用例集.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-15 | 初始版本 | QA |
