# AI策略生成器功能分析报告

## Why

用户需要了解AI策略生成功能的实现现状、存在的问题以及改进建议，以便进行后续优化和维护。

## What Changes

* 分析现有AI策略生成功能的实现架构

* 识别代码中的问题和潜在风险

* 提供改进建议

## Impact

* Affected code:

  * `src/modules/ai-strategy-generator/ai-strategy-generator.service.ts`

  * `src/modules/ai-strategy-generator/ai-strategy-generator.controller.ts`

***

## 现有功能实现分析

### 1. 核心架构

| 组件  | 文件路径                                                                    | 功能描述          |
| --- | ----------------------------------------------------------------------- | ------------- |
| 服务层 | `src/modules/ai-strategy-generator/ai-strategy-generator.service.ts`    | 调用Kimi AI生成策略 |
| 控制器 | `src/modules/ai-strategy-generator/ai-strategy-generator.controller.ts` | 提供HTTP API接口  |
| 提示词 | `docs/策略ai提示词.txt`                                                      | AI生成策略的提示词模板  |

### 2. API接口

| 接口     | 方法   | 路径                                | 功能            |
| ------ | ---- | --------------------------------- | ------------- |
| 生成策略   | POST | `/ai-strategy-generator/generate` | 仅生成策略JSON，不保存 |
| 创建AI策略 | POST | `/ai-strategy-generator/create`   | 生成策略并保存到数据库   |

### 3. 工作流程

```
用户输入 → 加载提示词模板 → 调用Kimi AI → 解析JSON响应 → 创建指标 → 创建策略 → 保存数据库
```

***

## 发现的问题

### 问题1: 缺少输入验证 (中等)

**位置**: `ai-strategy-generator.controller.ts`

**问题描述**:

* 没有限制用户输入的长度

* 可能导致API调用失败或Token超限

### 问题2: 缺少代码安全验证 (高风险)

**位置**: `ai-strategy-generator.service.ts`

**问题描述**:

* AI生成的指标代码没有进行安全验证

* 可能执行恶意代码或不安全代码

### 问题3: 缺少策略名称唯一性检查 (低)

**位置**: `ai-strategy-generator.service.ts`

**问题描述**:

* 没有检查策略名称是否已存在

* 可能导致数据库唯一约束错误

### 问题4: 缺少策略名称格式验证 (低)

**位置**: `ai-strategy-generator.service.ts`

**问题描述**:

* 没有验证策略名称格式

* 可能导致数据不规范

### 问题5: 错误处理不够健壮 (中等)

**位置**: `ai-strategy-generator.service.ts`

**问题描述**:

* JSON解析失败时错误信息不够详细

* 缺少对AI响应格式的严格验证

### 问题6: 提示词模板字段名一致性 (低)

**位置**: `docs/策略ai提示词.txt`

**问题描述**:

* 提示词中使用 `paramType` 字段

* 与AI指标生成器的问题类似，需要确保字段名一致

***

## 与AI指标生成器的对比

| 功能      | AI指标生成器 | AI策略生成器 | 状态   |
| ------- | ------- | ------- | ---- |
| 输入长度验证  | ✅ 已实现   | ❌ 未实现   | 需要添加 |
| 代码安全验证  | ✅ 已实现   | ❌ 未实现   | 需要添加 |
| 名称格式验证  | ✅ 已实现   | ❌ 未实现   | 需要添加 |
| 名称唯一性检查 | ✅ 已实现   | ❌ 未实现   | 需要添加 |
| 参数字段名映射 | ✅ 已修复   | ⚠️ 需检查  | 需要验证 |

***

## 改进建议

### 建议1: 添加输入验证

```typescript
const MAX_INPUT_LENGTH = 2000;

if (body.userInput.length > MAX_INPUT_LENGTH) {
  throw new HttpException(
    `输入内容过长，请控制在${MAX_INPUT_LENGTH}字符以内`,
    HttpStatus.BAD_REQUEST,
  );
}
```

### 建议2: 添加代码安全验证

复用AI指标生成器的安全验证逻辑：

```typescript
private validateGeneratedCode(code: string): { valid: boolean; reason?: string } {
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /require\s*\(/,
    /import\s+/,
    /process\./,
    /fs\./,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, reason: `代码包含不安全的操作: ${pattern.source}` };
    }
  }
  
  return { valid: true };
}
```

### 建议3: 添加策略名称验证

```typescript
private validateStrategyName(name: string): boolean {
  return /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$/.test(name);
}
```

### 建议4: 添加策略名称唯一性检查

需要在 `StrategiesService` 中添加 `findByName` 方法：

```typescript
async findByName(name: string): Promise<Strategy | null> {
  return this.strategyRepository.findOne({ where: { name } });
}
```

***

## 接口文档

### 1. 生成策略

**POST** `/ai-strategy-generator/generate`

**请求体**:

```json
{
  "userInput": "创建一个MA交叉策略，当MA5上穿MA20时买入，下穿时卖出"
}
```

**响应**:

```json
{
  "success": true,
  "generatedStrategy": {
    "name": "AI_MA交叉策略",
    "description": "基于MA5和MA20移动平均线交叉的交易策略",
    "positionType": "both",
    "indicatorNews": [...],
    "indicators": [...],
    "conditions": [...]
  }
}
```

### 2. 创建AI策略

**POST** `/ai-strategy-generator/create`

**请求体**:

```json
{
  "userInput": "创建一个MA交叉策略",
  "strategyName": "AI_MA_Cross",
  "description": "AI生成的MA交叉策略"
}
```

**响应**:

```json
{
  "success": true,
  "strategy": {
    "id": 1,
    "name": "AI_MA_Cross",
    "description": "AI生成的MA交叉策略",
    "indicators": [...],
    "conditions": [...]
  },
  "aiGeneratedData": {...},
  "createdIndicators": [...]
}
```

***

## 风险评估

| 风险项         | 严重程度 | 影响范围    | 建议优先级 |
| ----------- | ---- | ------- | ----- |
| 缺少代码安全验证    | 高    | 安全风险    | P0    |
| 缺少输入验证      | 中    | API调用失败 | P1    |
| 错误处理不够健壮    | 中    | 用户体验差   | P2    |
| 缺少策略名称唯一性检查 | 低    | 数据重复    | P3    |
| 缺少策略名称格式验证  | 低    | 数据不规范   | P3    |

***

## 完成状态

| 功能     | 状态    | 说明           |
| ------ | ----- | ------------ |
| 生成策略接口 | ✅ 已完成 | 基本功能正常       |
| 创建策略接口 | ✅ 已完成 | 基本功能正常       |
| 提示词模板  | ✅ 已完成 | 格式规范完整       |
| 输入验证   | ❌ 待完善 | 需要添加长度限制     |
| 代码安全验证 | ❌ 待完善 | 需要添加安全检查     |
| 名称验证   | ❌ 待完善 | 需要添加格式和唯一性检查 |

