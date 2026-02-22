# AI策略生成器 conditions.action 缺失问题修复计划

## 问题分析

### 错误信息
```
conditions.0.action must be one of the following values: , conditions.1.action must be one of the following values: , conditions.2.action must be one of the following values:
```

### 问题原因

从返回结果可以看到，AI生成的 `conditions` 缺少 `action` 字段：

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

而DTO要求 `action` 是必填字段：
```typescript
@IsEnum(['buy', 'sell', 'none'])
action: string;
```

### 问题来源

1. **提示词模板**: 示例中的conditions可能没有明确包含action字段
2. **服务层代码**: 没有验证和补充缺失的action字段

---

## 修复方案

### 方案1: 更新提示词模板

确保所有示例中的conditions都包含 `action` 字段

### 方案2: 服务层添加验证和默认值

在 `generateStrategyWithIndicators` 方法中，验证并补充缺失的 `action` 字段

---

## 具体修改任务

### 任务1: 检查并更新提示词模板

**文件**: `docs/策略ai提示词.txt`

**修改内容**:
- 确保所有conditions示例都包含 `action` 字段
- 强调action字段是必填项

### 任务2: 修改服务层代码

**文件**: `src/modules/ai-strategy-generator/ai-strategy-generator.service.ts`

**修改内容**:
- 在处理conditions时，验证并补充缺失的action字段
- 如果action缺失，根据conditionType和operator推断默认值

---

## 实施步骤

1. 检查提示词模板中的conditions示例
2. 更新提示词模板，确保action字段存在
3. 修改服务层代码，添加action字段验证和默认值
4. 更新测试脚本验证
