# AI策略生成器数据验证完整计划

## 问题分析

当前AI生成的数据存在字段缺失问题，导致保存时验证失败。需要建立完整的数据验证机制。

---

## 必要属性分析

### 1. 策略 (Strategy) 必要属性

| 字段 | 必填 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| name | ✅ | string | 不能为空 | - | 策略名称 |
| description | ❌ | string | - | - | 策略描述 |
| positionType | ❌ | enum | ['long', 'short', 'both'] | 'both' | 持仓类型 |
| buyFee | ❌ | number | 0-1 | 0.001 | 买入手续费 |
| sellFee | ❌ | number | 0-1 | 0.001 | 卖出手续费 |
| liquidationThreshold | ❌ | number | 0-100 | 90 | 清仓阈值 |
| takeProfitRatio | ❌ | number | >=100 | null | 止盈比例 |
| stopLossRatio | ❌ | number | 0-100 | null | 止损比例 |
| indicators | ✅ | array | 不能为空 | - | 指标列表 |
| conditions | ✅ | array | 不能为空 | - | 条件列表 |

### 2. 策略指标 (StrategyIndicator) 必要属性

| 字段 | 必填 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| indicatorId | ✅ | number | 不能为null/undefined | - | 指标ID |
| priority | ❌ | number | >=0 | 0 | 优先级 |
| parameters | ✅ | array | 不能为空 | - | 参数列表 |

### 3. 策略指标参数 (StrategyIndicatorParam) 必要属性

| 字段 | 必填 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| parameterId | ✅ | number | 不能为null/undefined | - | 参数ID |
| value | ✅ | string | 不能为空 | - | 参数值 |

### 4. 策略条件 (StrategyCondition) 必要属性

| 字段 | 必填 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| indicatorIndex | ✅ | number | 不能为null/undefined | - | 指标索引 |
| comparisonType | ✅ | enum | ['indicator', 'constant'] | - | 比较类型 |
| comparedIndicatorIndex | ❌ | number | comparisonType='indicator'时必填 | - | 被比较指标索引 |
| constantValue | ❌ | string | comparisonType='constant'时必填 | - | 常量值 |
| currentValuePath | ❌ | string | - | '' | 当前值路径 |
| comparedValuePath | ❌ | string | - | '' | 被比较值路径 |
| operator | ✅ | string | 不能为空 | - | 操作符 |
| conditionType | ✅ | string | 不能为空 | - | 条件类型 |
| **action** | ✅ | enum | ['buy', 'sell', 'none'] | - | **动作 (当前缺失)** |
| group | ❌ | number | >=1 | 1 | 条件组 |
| priority | ❌ | number | >=0 | 0 | 优先级 |
| customCode | ❌ | string | - | '' | 自定义代码 |

### 5. 指标 (Indicator) 必要属性

| 字段 | 必填 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| name | ✅ | string | 不能为空 | - | 指标名称 |
| description | ❌ | string | - | - | 指标描述 |
| calculationCode | ✅ | string | 不能为空 | - | 计算代码 |
| parameters | ✅ | array | 可以为空数组 | [] | 参数列表 |

### 6. 指标参数 (IndicatorParameter) 必要属性

| 字段 | 必填 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|------|--------|------|
| name | ✅ | string | 不能为空 | - | 参数名称 |
| description | ❌ | string | - | - | 参数描述 |
| defaultValue | ❌ | string | - | '' | 默认值 |
| paramType | ✅ | enum | ['number', 'string', 'boolean'] | - | 参数类型 |

---

## 当前问题

从用户提供的返回数据可以看到，AI生成的conditions缺少 `action` 字段：

```json
{
  "indicatorIndex": 0,
  "comparisonType": "indicator",
  "comparedIndicatorIndex": 2,
  "currentValuePath": "macd",
  "comparedValuePath": "signal",
  "operator": ">",
  "conditionType": "crossover",
  "group": 1,
  "priority": 1,
  "customCode": ""
  // ❌ 缺少 action 字段
}
```

---

## 修复方案

### 方案: 创建数据验证器服务 + 更新提示词模板

创建一个专门的验证器服务，用于验证AI生成的数据完整性，如果缺少必填字段则返回错误，让AI重新生成。

---

## 具体修改任务

### 任务1: 创建数据验证器

**文件**: `src/modules/ai-strategy-generator/validators/strategy-data.validator.ts`

**验证规则**:

```typescript
// 策略验证
- name: 必填，不能为空
- positionType: 默认 'both'
- buyFee: 默认 0.001
- sellFee: 默认 0.001
- liquidationThreshold: 默认 90
- indicators: 必填，数组
- conditions: 必填，数组

// 条件验证
- indicatorIndex: 必填
- comparisonType: 必填，'indicator' 或 'constant'
- operator: 必填
- conditionType: 必填
- action: 必填，'buy', 'sell', 'none'，如果缺失则返回错误
- group: 默认 1
- priority: 默认 0

// 指标验证
- name: 必填，不能为空
- calculationCode: 必填，不能为空
- parameters: 数组（可以为空）
```

### 任务2: 更新策略AI提示词模板

**文件**: `docs/策略ai提示词.txt`

确保提示词模板中的所有示例都包含完整的字段，特别是conditions中的action字段。

### 任务3: 更新指标AI提示词模板

**文件**: `docs/指标ai提示词.txt`

确保指标AI提示词模板中的所有示例都包含完整的字段。

---

## 实施步骤

1. 创建 `strategy-data.validator.ts` 验证器文件
2. 在 `ai-strategy-generator.service.ts` 中引入验证器
3. 在 `generateStrategyWithIndicators` 方法中调用验证器
4. 更新策略AI提示词模板 (`docs/策略ai提示词.txt`)
5. 更新指标AI提示词模板 (`docs/指标ai提示词.txt`)
6. 更新测试脚本
