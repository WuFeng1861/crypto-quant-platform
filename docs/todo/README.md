# 1. 校验api文档是否有问题
# 2. 进行下一步接口测试 策略创建和使用
# 3. price接口测试
# ✅ 4. 使用代码逻辑替换回测的checkCondition（已完成）

## ✅ 自定义代码条件功能（已完成 - 2025/09/23）

使用代码逻辑替换回测的checkCondition功能已经实现完成，具体包括：

### 实现的功能：
- ✅ 在策略条件中添加了 `customCode` 字段
- ✅ 使用 vm2 库安全执行自定义JavaScript代码
- ✅ 超时时间设置为10分钟（10*60*1000ms）
- ✅ 提供丰富的上下文变量：indicatorValues、index、priceData、BigNumber等
- ✅ 提供辅助函数：average、standardDeviation、getHistoricalData等
- ✅ 完善的错误处理机制

### 修改的文件：
- `src/modules/strategies/entities/strategy-condition.entity.ts` - 添加customCode字段
- `src/modules/strategies/dto/create-strategy-condition.dto.ts` - 添加customCode验证
- `src/modules/backtest/backtest.service.ts` - 实现executeCustomCode方法
- `scripts/migrations/add-custom-code-to-strategy-conditions.sql` - 数据库迁移
- `docs/features/custom-code-conditions.md` - 功能文档
- `scripts/test/test-custom-code-conditions.js` - 测试脚本

### 使用方式：
在创建策略条件时，可以设置 `customCode` 字段，系统会优先执行自定义代码逻辑。如果没有自定义代码，则使用原有的条件判断逻辑。
所以我觉得需要修改2个位置
一个是策略创建的时候需要传入代码
一个是策略回测执行的时候需要传入参数，然后执行代码，最后返回结果