# 止盈止损功能说明

## 📋 功能概述

止盈止损是量化交易中重要的风险管理工具，可以帮助交易者：
- **止盈（Take Profit）**: 在达到预期收益时自动平仓，锁定利润
- **止损（Stop Loss）**: 在亏损达到设定阈值时自动平仓，控制风险

## 🎯 参数说明

### 止盈比例 (takeProfitRatio)
- **类型**: 可选参数
- **范围**: 大于 100%
- **说明**: 当持仓价格达到入场价格的指定比例时触发止盈
- **示例**: 
  - `105.0` = 盈利5%时止盈
  - `110.0` = 盈利10%时止盈

### 止损比例 (stopLossRatio)
- **类型**: 可选参数  
- **范围**: 0% - 100%
- **说明**: 当持仓价格跌至入场价格的指定比例时触发止损
- **示例**:
  - `97.0` = 亏损3%时止损
  - `95.0` = 亏损5%时止损

## 🔧 使用方法

### 1. 创建策略时配置

```javascript
const strategyData = {
  name: "MA交叉策略-带止盈止损",
  description: "配置了止盈止损的策略",
  positionType: "both",
  buyFee: 0.001,
  sellFee: 0.001,
  liquidationThreshold: 90,
  takeProfitRatio: 105.0,  // 5%止盈
  stopLossRatio: 97.0,     // 3%止损
  indicators: [...],
  conditions: [...]
};
```

### 2. 数据库字段

```sql
-- 策略表新增字段
ALTER TABLE strategies 
ADD COLUMN take_profit_ratio DECIMAL(10,2) NULL,
ADD COLUMN stop_loss_ratio DECIMAL(10,2) NULL;
```

## 📊 工作原理

### 多头持仓 (Long Position)
- **止盈触发**: `当前价格 / 入场价格 >= 止盈比例`
- **止损触发**: `当前价格 / 入场价格 <= 止损比例`

### 空头持仓 (Short Position)  
- **止盈触发**: `入场价格 / 当前价格 >= 止盈比例`
- **止损触发**: `入场价格 / 当前价格 <= 止损比例`

## 🎮 执行流程

1. **持仓检查**: 每个K线周期检查是否有持仓
2. **价格比较**: 计算当前价格与入场价格的比例
3. **触发判断**: 检查是否达到止盈或止损条件
4. **自动平仓**: 触发时以当前价格全部平仓
5. **记录交易**: 记录止盈/止损交易到交易历史

## 📈 配置建议

### 保守型策略
```javascript
{
  takeProfitRatio: 103.0,  // 3%止盈
  stopLossRatio: 98.0      // 2%止损
}
```

### 平衡型策略
```javascript
{
  takeProfitRatio: 105.0,  // 5%止盈
  stopLossRatio: 97.0      // 3%止损
}
```

### 激进型策略
```javascript
{
  takeProfitRatio: 110.0,  // 10%止盈
  stopLossRatio: 95.0      // 5%止损
}
```

### 特殊配置
```javascript
// 只止损，让利润奔跑
{
  takeProfitRatio: null,   // 不设置止盈
  stopLossRatio: 96.0      // 4%止损
}

// 只止盈，承担更大回撤
{
  takeProfitRatio: 108.0,  // 8%止盈
  stopLossRatio: null      // 不设置止损
}
```

## ⚠️ 注意事项

1. **参数验证**:
   - 止盈比例必须大于100%
   - 止损比例必须在0%-100%之间
   - 两个参数都是可选的

2. **执行优先级**:
   - 止盈止损检查在爆仓检查之后
   - 止盈止损检查在策略信号检查之前
   - 触发后会清空持仓并重置入场价格

3. **手续费计算**:
   - 止盈止损平仓会产生手续费
   - 利润计算已扣除开仓和平仓手续费

4. **回测影响**:
   - 启用止盈止损会影响回测结果
   - 可能减少单笔利润但提高胜率
   - 有助于控制最大回撤

## 🧪 测试脚本

使用提供的测试脚本创建不同配置的策略：

```bash
# 创建单个带止盈止损的策略
node scripts/create/create-strategy-with-stop-loss.js

# 创建多个不同配置的策略
node scripts/create/create-strategy-with-stop-loss.js multiple
```

## 📊 回测示例

启用止盈止损后，回测交易记录中会包含：
- `tradeType: 'take_profit'` - 止盈交易
- `tradeType: 'stop_loss'` - 止损交易

这些交易会自动计算利润并更新账户余额。