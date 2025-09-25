# 启动时回测任务恢复功能

## 功能概述

该功能在应用程序启动时自动检查是否有进行中的回测任务，如果发现有状态为 `RUNNING` 的回测任务，系统会：

1. 清理该回测任务的所有交易数据
2. 重置回测结果为初始状态
3. 重新执行回测任务

## 实现组件

### 1. StartupService (`src/modules/system/startup.service.ts`)

主要负责启动时的初始化检查和回测任务恢复逻辑。

**核心方法：**
- `onApplicationBootstrap()`: 应用启动时的主要检查方法
- `handleRunningBacktest()`: 处理单个进行中的回测任务
- `clearBacktestTradeData()`: 清理回测交易数据
- `resetBacktestResult()`: 重置回测结果数据
- `restartBacktest()`: 重新执行回测
- `manualCheckAndRestart()`: 手动触发检查和重启

### 2. 系统控制器更新

新增了以下API端点：

- `GET /system/running-backtests-count`: 获取当前进行中的回测任务数量
- `POST /system/check-and-restart-backtests`: 手动触发检查和重启进行中的回测任务

### 3. 应用启动集成

在 `main.ts` 中集成了启动检查逻辑，确保应用启动后立即执行回测任务恢复。

## 使用场景

### 自动恢复
- 服务器意外重启
- 应用程序崩溃后重启
- 部署更新后重启

### 手动恢复
通过API端点手动触发检查：

```bash
# 获取进行中的回测任务数量
curl -X GET http://localhost:3099/system/running-backtests-count

# 手动触发检查和重启
curl -X POST http://localhost:3099/system/check-and-restart-backtests
```

## 日志输出

系统会输出详细的日志信息，包括：
- 发现的进行中回测任务数量
- 每个任务的处理进度
- 清理的交易记录数量
- 重新执行的结果

## 错误处理

- 如果处理某个回测任务失败，会将其状态设置为 `FAILED`
- 记录详细的错误信息到 `earlyStopReason` 字段
- 不会影响其他回测任务的处理

## 数据库影响

### 清理操作
- 删除 `backtest_trades` 表中对应 `backtest_id` 的所有记录
- 重置 `backtest_results` 表中的统计字段为初始值

### 状态管理
- `RUNNING` → 清理数据 → `RUNNING` → 重新执行
- 如果失败：`RUNNING` → `FAILED`

## 配置参数

重新执行回测时使用的默认参数：
- `earlyStopThreshold`: 10% (提前停止阈值)
- `positionDivision`: 1 (全仓交易)

## 注意事项

1. **数据一致性**: 清理操作会永久删除原有的交易记录
2. **性能影响**: 启动时检查可能会增加应用启动时间
3. **并发安全**: 确保在检查期间不会有新的回测任务启动
4. **资源消耗**: 重新执行回测会消耗计算资源

## 监控建议

1. 监控启动时的日志输出
2. 定期检查 `RUNNING` 状态的回测任务数量
3. 关注重新执行失败的回测任务
4. 监控应用启动时间变化