# 跨角色对接文档 - Backend (更新版 v1.1)

## 对接信息
- **对接日期**: 2026-03-15
- **对接角色**: Backend Developer
- **相关文档**: 
  - [PRD文档 v1.1](../02_PRD文档.md)
  - [版本规划 v1.1](../03_版本规划.md)
- **状态**: [已更新]

---

## 重要更新说明

本次对接文档基于 QA 可测性分析反馈进行了更新，主要变更如下：

### 新增功能
1. **交易对数量限制**: 最大 500 个
2. **暂停超时机制**: 5 分钟超时强制取消
3. **重试次数限制**: 每个子任务最大 3 次
4. **强制重试接口**: 绕过重试限制
5. **子任务执行超时**: 30 分钟固定超时
6. **依赖服务中断处理**: 数据库/Redis 中断处理

### 新增错误码
- `PAIR_LIMIT_EXCEEDED`: 交易对数量超过上限
- `MAX_RETRIES_REACHED`: 达到最大重试次数

---

## 一、数据库设计更新

### 1.1 新增表: batch_backtests

```sql
CREATE TABLE batch_backtests (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER NOT NULL,
    timeframe_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    initial_capital DECIMAL(20, 8) NOT NULL,
    early_stop_threshold DECIMAL(10, 4),
    position_division INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    total_pairs INTEGER NOT NULL,
    completed_pairs INTEGER DEFAULT 0,
    failed_pairs INTEGER DEFAULT 0,
    current_pair_id INTEGER,
    pause_requested BOOLEAN DEFAULT FALSE,  -- 新增：暂停请求标志
    pause_timeout_at TIMESTAMP,              -- 新增：暂停超时时间
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_backtests_status ON batch_backtests(status);
CREATE INDEX idx_batch_backtests_strategy_id ON batch_backtests(strategy_id);
```

### 1.2 新增表: batch_backtest_items

```sql
CREATE TABLE batch_backtest_items (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batch_backtests(id) ON DELETE CASCADE,
    pair_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    backtest_result_id INTEGER,
    error_message TEXT,
    retries INTEGER DEFAULT 0,              -- 新增：重试次数
    timeout_at TIMESTAMP,                    -- 新增：执行超时时间
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_backtest_items_batch_id ON batch_backtest_items(batch_id);
CREATE INDEX idx_batch_backtest_items_status ON batch_backtest_items(status);
CREATE INDEX idx_batch_backtest_items_pair_id ON batch_backtest_items(pair_id);
```

---

## 二、API 接口清单更新

### 2.1 批量回测任务管理

| 方法 | 路径 | 功能 | 优先级 | 变更 |
|------|------|------|--------|------|
| POST | /backtest/batch | 创建批量回测任务 | P0 | 新增数量限制校验 |
| GET | /backtest/batch | 获取批量任务列表 | P1 | - |
| GET | /backtest/batch/:id | 获取批量任务详情 | P0 | - |
| POST | /backtest/batch/:id/pause | 暂停任务 | P0 | 新增超时处理 |
| POST | /backtest/batch/:id/resume | 继续任务 | P0 | - |
| POST | /backtest/batch/:id/cancel | 取消任务 | P0 | - |
| POST | /backtest/batch/:id/retry | 重试失败任务 | P1 | 新增次数限制 |
| POST | /backtest/batch/:id/force-retry | 强制重试任务 | P2 | **新增** |
| DELETE | /backtest/batch/:id | 删除任务 | P2 | - |

### 2.2 批量回测结果

| 方法 | 路径 | 功能 | 优先级 |
|------|------|------|--------|
| GET | /backtest/batch/:id/summary | 获取汇总结果 | P0 |
| GET | /backtest/batch/:id/items | 获取子任务列表 | P0 |

---

## 三、核心功能实现要点更新

### 3.1 交易对数量限制

```typescript
// 创建批量任务时校验
async createBatchBacktest(dto: CreateBatchBacktestDto): Promise<BatchBacktest> {
  const pairIds = dto.pairIds || await this.getAllPairIds();
  
  if (pairIds.length > 500) {
    throw new BadRequestException({
      code: 'PAIR_LIMIT_EXCEEDED',
      message: `交易对数量超过上限（最大 500 个），当前数量：${pairIds.length}`
    });
  }
  
  // ... 继续创建逻辑
}
```

### 3.2 暂停超时处理

```typescript
// 暂停逻辑
async pauseBatchBacktest(batchId: number): Promise<void> {
  const batch = await this.getBatch(batchId);
  
  if (batch.status !== BatchBacktestStatus.RUNNING) {
    throw new BadRequestException('任务未在执行中');
  }
  
  // 设置暂停请求标志和超时时间
  await this.batchRepo.update(batchId, {
    pauseRequested: true,
    pauseTimeoutAt: new Date(Date.now() + 5 * 60 * 1000) // 5分钟
  });
}

// 执行循环中检查
async executeBatch(batchId: number): Promise<void> {
  for (const item of items) {
    // 检查暂停请求
    const batch = await this.getBatch(batchId);
    
    if (batch.pauseRequested) {
      // 检查是否超时
      if (new Date() > batch.pauseTimeoutAt) {
        // 超时，强制取消当前子任务
        await this.cancelCurrentItem(item.id);
        await this.updateBatchStatus(batchId, BatchBacktestStatus.PAUSED);
        return;
      }
      
      // 当前子任务完成后暂停
      await this.updateBatchStatus(batchId, BatchBacktestStatus.PAUSED);
      return;
    }
    
    // ... 执行子任务
  }
}
```

### 3.3 重试次数限制

```typescript
// 子任务实体新增 retries 字段
@Entity('batch_backtest_items')
export class BatchBacktestItem {
  // ... 其他字段
  
  @Column({ default: 0 })
  retries: number;
}

// 重试逻辑
async retryFailedItems(batchId: number, pairIds?: number[]): Promise<void> {
  const items = await this.getFailedItems(batchId, pairIds);
  
  for (const item of items) {
    if (item.retries >= 3) {
      continue; // 跳过已达到上限的任务
    }
    
    // 增加重试次数
    await this.itemRepo.update(item.id, {
      retries: item.retries + 1,
      status: BatchBacktestItemStatus.PENDING
    });
  }
  
  // 检查是否有可重试的任务
  const retryableCount = items.filter(i => i.retries < 3).length;
  if (retryableCount === 0) {
    throw new BadRequestException({
      code: 'NO_RETRYABLE_TASKS',
      message: '没有可重试的失败任务（已达到最大重试次数）'
    });
  }
  
  // 启动重试
  await this.executeBatch(batchId);
}
```

### 3.4 强制重试接口

```typescript
// 强制重试（绕过重试次数限制）
async forceRetryItems(batchId: number, pairIds: number[]): Promise<void> {
  const items = await this.getItemsByPairIds(batchId, pairIds);
  
  for (const item of items) {
    // 重置重试次数或增加（根据业务需求）
    await this.itemRepo.update(item.id, {
      retries: item.retries, // 不增加次数
      status: BatchBacktestItemStatus.PENDING,
      errorMessage: null
    });
  }
  
  // 启动重试
  await this.executeBatch(batchId);
}
```

### 3.5 子任务执行超时

```typescript
// 执行子任务时设置超时
async executeItem(item: BatchBacktestItem): Promise<void> {
  // 设置超时时间（30分钟）
  const timeoutAt = new Date(Date.now() + 30 * 60 * 1000);
  await this.itemRepo.update(item.id, { timeoutAt });
  
  // 执行回测（使用 Promise.race 实现超时）
  const backtestPromise = this.backtestService.runBacktest({
    pairId: item.pairId,
    // ... 其他参数
  });
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('执行超时')), 30 * 60 * 1000);
  });
  
  try {
    const result = await Promise.race([backtestPromise, timeoutPromise]);
    // 处理成功结果
  } catch (error) {
    if (error.message === '执行超时') {
      await this.itemRepo.update(item.id, {
        status: BatchBacktestItemStatus.FAILED,
        errorMessage: '子任务执行超时（30分钟）',
        completedAt: new Date()
      });
    } else {
      throw error;
    }
  }
}
```

### 3.6 依赖服务中断处理

```typescript
// 数据库连接中断处理
async executeWithDbRecovery(batchId: number): Promise<void> {
  try {
    // 执行回测逻辑
    await this.executeBatch(batchId);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      // 数据库连接中断
      logger.error('数据库连接中断', error);
      
      // 更新当前子任务为失败
      await this.failCurrentItem(batchId, '数据库连接中断');
      
      // 暂停批量任务
      await this.updateBatchStatus(batchId, BatchBacktestStatus.PAUSED);
      
      return;
    }
    throw error;
  }
}

// Redis 不可用降级处理
async getPriceDataWithFallback(pairId: number): Promise<PriceData[]> {
  try {
    // 尝试从 Redis 获取
    return await this.redisService.getOrSet(...);
  } catch (error) {
    if (error.message.includes('Redis')) {
      logger.warn('Redis 不可用，降级到数据库查询');
      // 直接从数据库查询
      return await this.priceDataService.findFromDb(pairId);
    }
    throw error;
  }
}
```

---

## 四、错误码定义

| 错误码 | 说明 | HTTP状态码 | 场景 |
|--------|------|------------|------|
| STRATEGY_NOT_FOUND | 策略不存在 | 400 | 无效 strategyId |
| PAIR_NOT_FOUND | 交易对不存在 | 400 | 无效 pairId |
| PAIR_LIMIT_EXCEEDED | 交易对数量超过上限 | 400 | > 500 个交易对 |
| BATCH_NOT_FOUND | 批量任务不存在 | 404 | 无效 batchId |
| INVALID_STATUS | 状态冲突 | 400 | 非法状态转换 |
| NO_RETRYABLE_TASKS | 没有可重试的任务 | 400 | 无失败任务或都达上限 |
| MAX_RETRIES_REACHED | 达到最大重试次数 | 400 | 子任务已重试 3 次 |

---

## 五、系统约束

| 约束项 | 限制值 | 说明 |
|--------|--------|------|
| 交易对数量上限 | 500 | 单次批量任务最大交易对数 |
| 暂停超时时间 | 5分钟 | 暂停等待的超时时间 |
| 子任务重试次数 | 3次 | 自动重试的最大次数 |
| 子任务执行超时 | 30分钟 | 单个子任务执行超时时间 |

---

## 六、参考文档

- [PRD文档 v1.1](../02_PRD文档.md)
- [版本规划 v1.1](../03_版本规划.md)
- [QA问题清单确认](../../qa_engineer/02_问题清单及确认记录/from_pm_2026-03-15.md)

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-15 | 初始版本 | PM |
| v1.1 | 2026-03-15 | 根据QA反馈更新：新增数量限制、暂停超时、重试限制等 | PM |
