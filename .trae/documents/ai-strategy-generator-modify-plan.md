# AI策略生成器修改计划

## 问题分析

### 1. 当前问题

根据用户提供的测试返回结果，发现以下问题：

| 问题 | 描述 | 严重程度 |
|------|------|---------|
| AI未正确设置止盈止损 | 用户要求"严格控制止损位"，但返回的 `takeProfitRatio` 和 `stopLossRatio` 都是 `null` | 高 |
| generate接口不写入数据库 | 当前 `/generate` 接口只返回AI生成的数据，不写入数据库 | 中 |
| 返回格式需要适配 | 需要返回完整的策略格式，包含已创建的指标ID等 | 中 |

### 2. 用户需求

1. **generate接口修改**: 将生成的 `indicatorNews` 直接写入数据库
2. **返回格式适配**: 返回完整的策略格式，包含指标、条件、操作等
3. **提示词优化**: 确保AI正确理解并设置止盈止损

---

## 修改方案

### 方案1: 修改 generate 接口逻辑

**当前逻辑**:
```
用户输入 → AI生成 → 返回原始JSON
```

**修改后逻辑**:
```
用户输入 → AI生成 → 验证代码安全 → 写入指标到数据库 → 返回完整策略格式
```

**注意**: generate 接口只写入指标，不创建策略（策略需要用户确认后通过 create 接口创建）

### 方案2: 优化提示词模板

在提示词中强调：
- 必须根据用户描述设置止盈止损
- 如果用户提到"严格控制止损"，必须设置具体的 `stopLossRatio` 值

### 方案3: 返回格式调整

**当前返回格式**:
```json
{
  "success": true,
  "generatedStrategy": { ... }
}
```

**修改后返回格式**:
```json
{
  "success": true,
  "generatedStrategy": {
    "name": "...",
    "description": "...",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": 0.1,
    "stopLossRatio": 0.05,
    "indicatorNews": [...],
    "indicators": [...],
    "conditions": [...]
  },
  "createdIndicators": [
    {
      "id": 1,
      "name": "AI_MA_10",
      "description": "[AI生成] 10日移动平均线",
      "parameters": [...]
    }
  ]
}
```

---

## 具体修改任务

### 任务1: 修改服务层 generateStrategy 方法

**文件**: `src/modules/ai-strategy-generator/ai-strategy-generator.service.ts`

**修改内容**:
1. 添加新方法 `generateStrategyWithIndicators`
2. 在生成策略后，将 `indicatorNews` 写入数据库
3. 返回包含已创建指标ID的完整数据

### 任务2: 修改控制器 generate 接口

**文件**: `src/modules/ai-strategy-generator/ai-strategy-generator.controller.ts`

**修改内容**:
1. 调用新的服务方法
2. 返回包含 `createdIndicators` 的响应

### 任务3: 优化提示词模板

**文件**: `docs/策略ai提示词.txt`

**修改内容**:
1. 添加止盈止损设置规则
2. 强调必须根据用户描述设置具体数值

---

## 缺少的数据说明

根据分析，当前返回格式中缺少以下数据：

| 数据项 | 说明 | 来源 |
|--------|------|------|
| `createdIndicators` | 已创建的指标列表（含ID） | 数据库创建后返回 |
| 指标ID | 写入数据库后的指标ID | 数据库自增 |

**不需要额外数据**，现有的 `AiStrategyResponse` 接口已包含所有必要字段，只是需要：
1. 将指标写入数据库后获取ID
2. 在响应中返回已创建的指标信息

---

## 风险评估

| 风险项 | 影响 | 缓解措施 |
|--------|------|---------|
| generate 接口写入数据库可能导致垃圾数据 | 中 | 添加定时清理任务或手动清理功能 |
| AI可能仍不正确设置止盈止损 | 低 | 添加后端默认值逻辑 |

---

## 实施步骤

1. 修改服务层，添加 `generateStrategyWithIndicators` 方法
2. 修改控制器，调用新方法并返回完整数据
3. 优化提示词模板，强调止盈止损设置
4. 更新前端对接文档
5. 编写测试脚本验证
