# 批量回测功能 PRD 文档

## 文档信息
- **文档版本**: v1.1
- **创建日期**: 2026-03-15
- **更新日期**: 2026-03-15
- **产品负责人**: Product Manager
- **状态**: 已确认

---

## 一、背景与目标

### 1.1 背景
当前回测系统仅支持单个交易对的回测。用户需要测试策略在多个交易对上的表现时，需要手动逐个执行，效率低下且难以统一管理。

### 1.2 目标
提供一个批量回测功能，允许用户：
1. 一键对所有或指定交易对执行回测
2. 实时跟踪回测进度
3. 灵活控制回测任务（暂停/继续/关闭/重试）
4. 获取汇总和详细的回测结果

---

## 二、功能范围

### 2.1 In Scope
- 批量回测任务创建与管理
- 串行执行批量回测
- 实时进度跟踪
- 任务控制（关闭/暂停/继续/重试）
- 批量回测结果汇总与详情

### 2.2 Out of Scope
- 并行执行（V2版本支持）
- 分布式回测
- 回测结果可视化图表（复用现有功能）

---

## 三、用户故事

### US-001: 创建批量回测任务
**作为** 策略研究员  
**我希望** 能够对所有交易对一键发起回测  
**以便** 快速验证策略的普适性

**验收标准**:
- [ ] 支持不传 pairId，自动获取所有交易对
- [ ] 支持传入指定交易对列表
- [ ] 返回批量任务ID供后续查询

### US-002: 实时查看回测进度
**作为** 策略研究员  
**我希望** 能够实时查看批量回测的进度  
**以便** 了解任务执行情况

**验收标准**:
- [ ] 显示总体进度（已完成数/总数）
- [ ] 显示当前执行的交易对
- [ ] 显示每个交易对的状态
- [ ] 显示预估剩余时间

### US-003: 暂停和继续回测
**作为** 策略研究员  
**我希望** 能够暂停正在执行的批量回测  
**以便** 在需要时释放系统资源

**验收标准**:
- [ ] 支持暂停功能（等待当前交易对完成后暂停）
- [ ] 支持继续功能，从暂停处恢复
- [ ] 暂停后保留已完成的回测结果
- [ ] 暂停超时时间为 5 分钟，超时后强制取消当前子任务

### US-004: 关闭回测任务
**作为** 策略研究员  
**我希望** 能够关闭正在执行或暂停的回测任务  
**以便** 终止不需要的任务

**验收标准**:
- [ ] 支持关闭运行中的任务
- [ ] 支持关闭暂停的任务
- [ ] 关闭后保留已完成的回测结果

### US-005: 重新执行回测
**作为** 策略研究员  
**我希望** 能够重新执行失败的回测  
**以便** 修复问题后重试

**验收标准**:
- [ ] 支持重试失败的任务
- [ ] 支持选择性重试指定交易对
- [ ] 重试时保留之前的配置参数
- [ ] 每个子任务最大重试 3 次
- [ ] 提供强制重试接口，绕过次数限制

### US-006: 查看批量回测结果
**作为** 策略研究员  
**我希望** 能够查看批量回测的汇总和详细结果  
**以便** 评估策略在不同交易对上的表现

**验收标准**:
- [ ] 提供汇总统计（平均收益率、胜率等）
- [ ] 提供每个交易对的详细结果列表
- [ ] 支持按收益率等指标排序

---

## 四、功能需求详解

### 4.1 批量回测任务创建

#### API: POST /backtest/batch

**请求参数**:
```typescript
export class CreateBatchBacktestDto {
  strategyId: number;              // 策略ID（必填）
  pairIds?: number[];              // 指定交易对列表（可选，不传则全部，最多500个）
  timeframeId: number;             // 时间框架ID（必填）
  startTime: string;               // 开始时间（必填）
  endTime: string;                 // 结束时间（必填）
  initialCapital: number;          // 初始资金（必填）
  earlyStopThreshold?: number;     // 提前停止阈值（可选）
  positionDivision?: number;       // 仓位分割（可选）
}
```

**约束条件**:
- 交易对数量上限：500 个
- 超过上限时返回错误码：`PAIR_LIMIT_EXCEEDED`
- 错误信息："交易对数量超过上限（最大 500 个），当前数量：{count}"

**响应示例**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "totalPairs": 50,
    "status": "pending",
    "createdAt": "2026-03-15T10:00:00.000Z"
  },
  "message": "批量回测任务创建成功"
}
```

### 4.2 批量回测状态查询

#### API: GET /backtest/batch/:batchId

**响应示例**:
```json
{
  "success": true,
  "data": {
    "batchId": 1001,
    "status": "running",
    "totalPairs": 50,
    "completedPairs": 25,
    "failedPairs": 2,
    "currentPair": "BTC/USDT",
    "progress": 50,
    "estimatedRemainingTime": 1800,
    "createdAt": "2026-03-15T10:00:00.000Z",
    "startedAt": "2026-03-15T10:00:05.000Z",
    "pairs": [
      {
        "pairId": 1,
        "symbol": "BTC/USDT",
        "status": "completed",
        "backtestId": 2001,
        "profitRate": 15.5,
        "winRate": 62.5
      },
      {
        "pairId": 2,
        "symbol": "ETH/USDT",
        "status": "running"
      },
      {
        "pairId": 3,
        "symbol": "SOL/USDT",
        "status": "pending"
      }
    ]
  }
}
```

### 4.3 任务控制 API

#### 暂停任务: POST /backtest/batch/:batchId/pause
```json
{
  "success": true,
  "message": "批量回测任务已暂停"
}
```

#### 继续任务: POST /backtest/batch/:batchId/resume
```json
{
  "success": true,
  "message": "批量回测任务已继续"
}
```

#### 关闭任务: POST /backtest/batch/:batchId/cancel
```json
{
  "success": true,
  "message": "批量回测任务已关闭"
}
```

#### 重新执行: POST /backtest/batch/:batchId/retry

**请求参数**:
```json
{
  "pairIds": [5, 10]  // 可选，不传则重试所有失败任务
}
```

**约束条件**:
- 每个子任务最大重试次数：3 次
- 超过 3 次的子任务不会自动重试
- 返回错误码：`MAX_RETRIES_REACHED`

**成功响应**:
```json
{
  "success": true,
  "data": {
    "retryCount": 2,
    "retryPairIds": [5, 10]
  },
  "message": "失败任务重试已启动"
}
```

**错误响应（无重试任务）**:
```json
{
  "success": false,
  "error": {
    "code": "NO_RETRYABLE_TASKS",
    "message": "没有可重试的失败任务"
  }
}
```

**错误响应（达到重试上限）**:
```json
{
  "success": false,
  "error": {
    "code": "MAX_RETRIES_REACHED",
    "message": "子任务已达到最大重试次数（3次）",
    "details": {
      "pairId": 5,
      "retries": 3
    }
  }
}
```

#### 强制重新执行: POST /backtest/batch/:batchId/force-retry

**说明**: 绕过重试次数限制，强制重试指定子任务

**请求参数**:
```json
{
  "pairIds": [5, 10]  // 必填
}
```

**成功响应**:
```json
{
  "success": true,
  "data": {
    "retryCount": 2,
    "retryPairIds": [5, 10]
  },
  "message": "强制重试已启动"
}
```

### 4.4 批量回测结果汇总

#### API: GET /backtest/batch/:batchId/summary

**响应示例**:
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
      {"pairId": 10, "symbol": "PEPE/USDT", "profitRate": 45.2},
      {"pairId": 15, "symbol": "DOGE/USDT", "profitRate": 38.7}
    ],
    "worstPerformers": [
      {"pairId": 22, "symbol": "LUNA/USDT", "profitRate": -15.3}
    ]
  }
}
```

---

## 五、数据模型

### 5.1 新增实体: BatchBacktest（批量回测任务）

```typescript
@Entity('batch_backtests')
export class BatchBacktest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'timeframe_id' })
  timeframeId: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'initial_capital', type: 'decimal', precision: 20, scale: 8 })
  initialCapital: number;

  @Column({ name: 'early_stop_threshold', type: 'decimal', precision: 10, scale: 4, nullable: true })
  earlyStopThreshold: number;

  @Column({ name: 'position_division', nullable: true })
  positionDivision: number;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: BatchBacktestStatus, 
    default: BatchBacktestStatus.PENDING 
  })
  status: BatchBacktestStatus;

  @Column({ name: 'total_pairs' })
  totalPairs: number;

  @Column({ name: 'completed_pairs', default: 0 })
  completedPairs: number;

  @Column({ name: 'failed_pairs', default: 0 })
  failedPairs: number;

  @Column({ name: 'current_pair_id', nullable: true })
  currentPairId: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export enum BatchBacktestStatus {
  PENDING = 'pending',       // 待执行
  RUNNING = 'running',       // 执行中
  PAUSED = 'paused',         // 已暂停
  COMPLETED = 'completed',   // 已完成
  CANCELLED = 'cancelled',   // 已取消
  FAILED = 'failed'          // 失败
}
```

### 5.2 新增实体: BatchBacktestItem（批量回测子任务）

```typescript
@Entity('batch_backtest_items')
export class BatchBacktestItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batchId: number;

  @Column({ name: 'pair_id' })
  pairId: number;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: BatchBacktestItemStatus, 
    default: BatchBacktestItemStatus.PENDING 
  })
  status: BatchBacktestItemStatus;

  @Column({ name: 'backtest_result_id', nullable: true })
  backtestResultId: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retries', default: 0 })
  retries: number;  // 重试次数

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
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

## 六、状态流转图

```
                    ┌─────────────┐
                    │   PENDING   │
                    │   (待执行)   │
                    └──────┬──────┘
                           │ 开始执行
                           ▼
                    ┌─────────────┐     ┌─────────────┐
         ┌─────────│   RUNNING   │────▶│  COMPLETED  │
         │         │   (执行中)   │     │   (已完成)   │
         │         └──────┬──────┘     └─────────────┘
         │                │
   暂停   │                │ 完成/失败
         │                ▼
         │         ┌─────────────┐     ┌─────────────┐
         └────────▶│   PAUSED    │     │    FAILED   │
                   │   (已暂停)   │     │   (失败)    │
                   └──────┬──────┘     └─────────────┘
                          │
                          │ 继续
                          ▼
                   ┌─────────────┐
                   │   CANCELLED │
                   │   (已取消)   │
                   └─────────────┘
```

---

## 七、验收标准

### 7.1 功能验收

| 验收项 | 验收标准 | 优先级 |
|--------|----------|--------|
| 批量任务创建 | 能成功创建批量回测任务，返回正确任务ID | P0 |
| 自动获取交易对 | 不传pairIds时能自动获取所有交易对 | P0 |
| 串行执行 | 交易对按顺序逐个执行回测 | P0 |
| 进度跟踪 | 能实时查询到准确的进度信息 | P0 |
| 暂停功能 | 能正常暂停，等待当前完成后停止 | P0 |
| 继续功能 | 能从暂停处继续执行 | P0 |
| 关闭功能 | 能正常关闭任务 | P0 |
| 重试功能 | 能重试失败的任务 | P1 |
| 重试次数限制 | 每个子任务最大重试3次 | P1 |
| 强制重试 | 提供强制重试接口 | P2 |
| 交易对数量限制 | 最大支持500个交易对 | P0 |
| 暂停超时 | 暂停超时5分钟后强制取消 | P1 |
| 子任务超时 | 单个子任务执行超时30分钟 | P1 |
| 结果汇总 | 能正确生成汇总统计 | P0 |
| 结果详情 | 能查看每个交易对的详细结果 | P0 |

### 7.2 非功能验收

| 验收项 | 验收标准 | 优先级 |
|--------|----------|--------|
| 性能 | 单个交易对回测时间不超过现有单回测的120% | P1 |
| 可靠性 | 系统重启后能恢复进行中的批量任务 | P0 |
| 兼容性 | 不影响现有单交易对回测功能 | P0 |

---

## 八、附录

### 8.1 术语表

| 术语 | 说明 |
|------|------|
| 批量回测 | 对多个交易对执行相同策略的回测 |
| 批量任务 | 管理批量回测的父任务 |
| 子任务 | 单个交易对的回测任务 |
| 串行执行 | 按顺序逐个执行任务 |

### 8.2 参考文档
- [需求调研记录](./01_需求调研记录.md)
- [现有回测API文档](../../docs/api/backtest.md)

---

## 附录

### A.1 错误码定义

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| STRATEGY_NOT_FOUND | 策略不存在 | 400 |
| PAIR_NOT_FOUND | 交易对不存在 | 400 |
| PAIR_LIMIT_EXCEEDED | 交易对数量超过上限（500） | 400 |
| BATCH_NOT_FOUND | 批量任务不存在 | 404 |
| INVALID_STATUS | 状态冲突，操作不被允许 | 400 |
| NO_RETRYABLE_TASKS | 没有可重试的失败任务 | 400 |
| MAX_RETRIES_REACHED | 子任务已达到最大重试次数 | 400 |

### A.2 系统约束

| 约束项 | 限制值 | 说明 |
|--------|--------|------|
| 交易对数量上限 | 500 | 单次批量任务最大交易对数 |
| 暂停超时时间 | 5分钟 | 暂停等待的超时时间 |
| 子任务重试次数 | 3次 | 自动重试的最大次数 |
| 子任务执行超时 | 30分钟 | 单个子任务执行超时时间 |
| 进度轮询频率 | 3秒 | 前端建议的轮询间隔 |

### A.3 依赖服务中断处理

#### 数据库连接中断
- 当前子任务标记为 FAILED
- 批量任务状态变为 PAUSED
- 记录错误信息："数据库连接中断"
- 用户可手动恢复或重试

#### Redis 不可用
- 降级处理，不使用缓存
- 继续执行任务
- 记录警告日志

---

## 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-03-15 | 初始版本 | PM |
| v1.1 | 2026-03-15 | 根据QA反馈更新：新增交易对数量限制、暂停超时、重试次数限制、子任务超时、依赖服务中断处理等 | PM |
