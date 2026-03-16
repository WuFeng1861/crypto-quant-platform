# 跨角色对接文档 - Backend

## 对接信息
- **对接日期**: 2026-03-15
- **对接角色**: Backend Developer
- **相关文档**: 
  - [需求调研记录](../01_需求调研记录.md)
  - [PRD文档](../02_PRD文档.md)
  - [版本规划](../03_版本规划.md)

---

## 一、任务概述

实现批量回测功能的后端服务，支持：
1. 批量回测任务创建与管理
2. 串行执行多个交易对的回测
3. 实时进度跟踪
4. 任务控制（暂停/继续/取消/重试）
5. 结果汇总与查询

---

## 二、数据库设计

### 2.1 新增表: batch_backtests

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
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batch_backtests_status ON batch_backtests(status);
CREATE INDEX idx_batch_backtests_strategy_id ON batch_backtests(strategy_id);
```

### 2.2 新增表: batch_backtest_items

```sql
CREATE TABLE batch_backtest_items (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batch_backtests(id) ON DELETE CASCADE,
    pair_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    backtest_result_id INTEGER,
    error_message TEXT,
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

## 三、API 接口清单

### 3.1 批量回测任务管理

| 方法 | 路径 | 功能 | 优先级 |
|------|------|------|--------|
| POST | /backtest/batch | 创建批量回测任务 | P0 |
| GET | /backtest/batch | 获取批量任务列表 | P1 |
| GET | /backtest/batch/:id | 获取批量任务详情 | P0 |
| POST | /backtest/batch/:id/pause | 暂停任务 | P1 |
| POST | /backtest/batch/:id/resume | 继续任务 | P1 |
| POST | /backtest/batch/:id/cancel | 取消任务 | P0 |
| POST | /backtest/batch/:id/retry | 重试失败任务 | P1 |
| DELETE | /backtest/batch/:id | 删除任务 | P2 |

### 3.2 批量回测结果

| 方法 | 路径 | 功能 | 优先级 |
|------|------|------|--------|
| GET | /backtest/batch/:id/summary | 获取汇总结果 | P0 |
| GET | /backtest/batch/:id/items | 获取子任务列表 | P0 |

---

## 四、DTO 定义

### 4.1 CreateBatchBacktestDto

```typescript
export class CreateBatchBacktestDto {
  @IsNumber()
  @IsNotEmpty()
  strategyId: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pairIds?: number[];

  @IsNumber()
  @IsNotEmpty()
  timeframeId: number;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  initialCapital: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  earlyStopThreshold?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  positionDivision?: number;
}
```

### 4.2 BatchBacktestResponseDto

```typescript
export class BatchBacktestResponseDto {
  id: number;
  strategyId: number;
  timeframeId: number;
  status: BatchBacktestStatus;
  totalPairs: number;
  completedPairs: number;
  failedPairs: number;
  currentPairId?: number;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

### 4.3 BatchBacktestDetailDto

```typescript
export class BatchBacktestDetailDto extends BatchBacktestResponseDto {
  items: BatchBacktestItemDto[];
}

export class BatchBacktestItemDto {
  id: number;
  pairId: number;
  symbol: string;
  status: BatchBacktestItemStatus;
  backtestResultId?: number;
  profitRate?: number;
  winRate?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}
```

---

## 五、核心服务接口

### 5.1 BatchBacktestService

```typescript
@Injectable()
export class BatchBacktestService {
  // 创建批量回测任务
  async createBatchBacktest(dto: CreateBatchBacktestDto): Promise<BatchBacktest>;

  // 执行批量回测（串行）
  async executeBatchBacktest(batchId: number): Promise<void>;

  // 暂停任务
  async pauseBatchBacktest(batchId: number): Promise<void>;

  // 继续任务
  async resumeBatchBacktest(batchId: number): Promise<void>;

  // 取消任务
  async cancelBatchBacktest(batchId: number): Promise<void>;

  // 重试失败任务
  async retryFailedItems(batchId: number, pairIds?: number[]): Promise<void>;

  // 获取任务详情
  async getBatchBacktestDetail(batchId: number): Promise<BatchBacktestDetailDto>;

  // 获取汇总结果
  async getBatchBacktestSummary(batchId: number): Promise<BatchBacktestSummaryDto>;

  // 恢复进行中的任务（启动时调用）
  async recoverRunningBatches(): Promise<void>;
}
```

---

## 六、状态枚举

```typescript
export enum BatchBacktestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum BatchBacktestItemStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

---

## 七、关键实现要点

### 7.1 串行执行逻辑

```typescript
async executeBatchBacktest(batchId: number): Promise<void> {
  // 1. 获取所有待执行的子任务
  // 2. 按顺序逐个执行
  // 3. 每个执行完成后更新进度
  // 4. 检查是否收到暂停/取消信号
  // 5. 全部完成后更新任务状态
}
```

### 7.2 进度跟踪

- 使用 Redis 缓存实时进度（可选优化）
- 每个子任务完成后更新 batch_backtests 表的进度字段
- 提供 WebSocket 推送（可选，V1.1考虑）

### 7.3 暂停实现

- 优雅暂停：等待当前交易对回测完成后停止
- 使用标志位控制暂停信号
- 暂停时保留已完成的回测结果

### 7.4 启动恢复

- 在 StartupService 中添加批量任务恢复逻辑
- 恢复 RUNNING 状态的任务
- 恢复 PAUSED 状态的任务（保持暂停）

---

## 八、与现有功能的集成

### 8.1 复用组件

| 组件 | 复用方式 | 说明 |
|------|----------|------|
| BacktestService | 依赖注入 | 调用单回测执行逻辑 |
| PriceDataService | 依赖注入 | 获取价格数据 |
| StrategiesService | 依赖注入 | 获取策略配置 |
| RedisService | 依赖注入 | 缓存进度信息 |

### 8.2 兼容性要求

- 不修改现有 backtest_results 表结构
- 不修改现有单回测 API
- 新增 API 路径以 /backtest/batch 为前缀

---

## 九、测试要求

### 9.1 单元测试

- BatchBacktestService 所有公共方法
- Controller 所有端点
- 状态流转逻辑

### 9.2 集成测试

- 完整批量回测流程
- 暂停/继续流程
- 重试流程
- 启动恢复流程

### 9.3 性能测试

- 50个交易对串行执行时间
- 数据库写入性能
- 内存占用监控

---

## 十、待确认问题

1. **[待确认]** 是否需要 WebSocket 实时推送进度？
2. **[待确认]** 批量任务的最大交易对数量限制？
3. **[待确认]** 是否需要支持定时启动批量任务？

---

## 十一、参考代码

### 11.1 现有回测服务
- `src/modules/backtest/backtest.service.ts`
- `src/modules/backtest/backtest.controller.ts`

### 11.2 启动恢复参考
- `src/modules/system/startup.service.ts`

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-15 | 初始版本 | PM |
