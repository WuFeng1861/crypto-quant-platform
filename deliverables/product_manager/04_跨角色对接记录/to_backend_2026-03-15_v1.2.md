# 跨角色对接文档 - Backend Developer

## 文档信息
- **版本**: v1.2
- **日期**: 2026-03-15
- **发送方**: Product Manager
- **接收方**: Backend Developer
- **主题**: 批量回测功能需求更新（交易对上限提升 + 队列系统）

---

## 一、需求变更摘要

### 1.1 核心变更
1. **交易对数量上限**: 从 500 提升至 **10000**
2. **新增回测队列系统**: 所有回测任务（单回测 + 批量回测）统一进入队列，串行执行
3. **新增队列管理 API**: 查询队列状态、查看等待任务、取消队列任务

### 1.2 变更原因
- 用户数据库有近 8000 个交易对，500 限制无法满足"自动获取所有交易对"的需求
- 串行执行 + 队列机制可避免系统资源压力，支持大规模批量回测

---

## 二、详细需求变更

### 2.1 交易对数量限制调整

**原限制**: 500 个
**新限制**: 10000 个

**影响范围**:
- `CreateBatchBacktestDto` 中的 `@ArrayMaxSize(500)` 需改为 `10000`
- 错误信息中的 "500" 需改为 "10000"

### 2.2 回测队列系统（新增）

#### 核心设计
- **所有回测请求**（包括普通单回测和批量回测）都进入队列
- **串行执行**: 一次只执行一个回测任务
- **队列最大长度**: 100 个任务
- **队列满时**: 返回 `QUEUE_FULL` 错误（429 状态码）

#### 新增实体

```typescript
// BacktestQueueItem - 回测队列项
@Entity('backtest_queue')
export class BacktestQueueItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id' })  // batchId 或 backtestId
  taskId: number;

  @Column({ name: 'task_type' })  // 'batch' | 'single'
  taskType: string;

  @Column({ name: 'strategy_id' })
  strategyId: number;

  @Column({ name: 'total_pairs', nullable: true })  // 批量任务才有
  totalPairs: number;

  @Column({ name: 'status' })  // 'queued' | 'processing' | 'completed' | 'cancelled'
  status: string;

  @Column({ name: 'queued_at', type: 'timestamp' })
  queuedAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'priority', default: 0 })  // 优先级，数字越小优先级越高
  priority: number;
}
```

#### 新增 API

**1. 获取队列状态**
```
GET /backtest/queue/status
```

**2. 获取队列列表**
```
GET /backtest/queue?page=1&limit=20
```

**3. 取消队列中的任务**
```
DELETE /backtest/queue/:taskId
```

### 2.3 错误码更新

| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| QUEUE_FULL | 回测队列已满（100个任务） | 429 |
| TASK_ALREADY_STARTED | 任务已开始执行，无法从队列移除 | 400 |
| TASK_NOT_IN_QUEUE | 任务不在队列中 | 404 |

---

## 三、技术实现建议

### 3.1 队列执行器设计

```typescript
@Injectable()
export class BacktestQueueProcessor {
  private isProcessing = false;
  private queue: BacktestQueueItem[] = [];

  async addToQueue(task: CreateBacktestDto | CreateBatchBacktestDto): Promise<number> {
    // 检查队列长度
    if (this.queue.length >= 100) {
      throw new BadRequestException({
        code: 'QUEUE_FULL',
        message: '回测队列已满，请稍后重试'
      });
    }
    // 添加到队列...
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      await this.executeTask(item);
    }

    this.isProcessing = false;
  }
}
```

### 3.2 修改点清单

1. **DTO 更新**:
   - `create-batch-backtest.dto.ts`: `@ArrayMaxSize(500)` → `10000`

2. **Service 更新**:
   - `batch-backtest.service.ts`: 错误信息中的 "500" → "10000"
   - 创建任务后自动加入队列，不立即执行

3. **新增 Service**:
   - `backtest-queue.service.ts`: 队列管理逻辑
   - `backtest-queue.processor.ts`: 队列执行器

4. **新增 Controller**:
   - `backtest-queue.controller.ts`: 队列管理 API

5. **新增实体**:
   - `backtest-queue-item.entity.ts`

6. **模块更新**:
   - `backtest.module.ts`: 导入队列相关服务和实体

---

## 四、验收标准更新

### 4.1 新增验收项

| 验收项 | 验收标准 | 优先级 |
|--------|----------|--------|
| 交易对数量上限 | 最大支持10000个交易对 | P0 |
| 回测队列 | 所有回测请求进入队列，串行执行 | P0 |
| 队列查询 | 能查看队列状态和等待任务 | P1 |
| 队列取消 | 能取消队列中等待的任务 | P1 |
| 队列满处理 | 队列满时返回 QUEUE_FULL 错误 | P0 |

### 4.2 测试用例更新

**TC-001 更新**:
- 不传 pairIds 时，自动获取所有交易对（最多 10000 个）
- 预期返回 201，totalPairs = 实际交易对数量

**新增测试用例**:
- TC-100: 队列状态查询
- TC-101: 队列列表查询
- TC-102: 队列满时创建任务
- TC-103: 取消队列中的任务
- TC-104: 取消已开始任务失败

---

## 五、下游影响

### 5.1 对 QA 的影响
- 测试用例 TC-009 中的 "500" 需改为 "10000"
- 新增队列相关测试用例
- 性能测试需考虑队列等待时间

### 5.2 对 Frontend 的影响
- 创建任务后可能需要等待队列处理
- 新增队列状态展示界面
- 新增队列管理功能

---

## 六、确认事项

请 Backend Developer 确认以下内容：

- [ ] 队列系统设计是否可行
- [ ] 10000 交易对批量回测的预估执行时间（假设平均每个 30 秒，约 83 小时）
- [ ] 是否需要任务优先级机制
- [ ] 是否需要队列持久化（数据库 + Redis）

---

## 七、参考文档

- [PRD 文档 v1.2](../02_PRD文档.md)
- [版本规划 v1.2](../03_版本规划.md)

---

**确认人**: _________________
**确认日期**: _________________
