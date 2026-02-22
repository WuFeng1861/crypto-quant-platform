# AI策略生成器功能逻辑流程文档

## 概述

本文档描述AI策略生成器的完整功能逻辑流程，包括请求处理、验证、AI生成、数据创建等各个环节。

---

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                    前端                                          │
│                     POST /ai-strategy-generator/create                          │
│                     POST /ai-strategy-generator/generate                        │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              控制器层                                             │
│                    AiStrategyGeneratorController                                │
│                    • 输入验证                                                    │
│                    • 参数处理                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               服务层                                             │
│                    AiStrategyGeneratorService                                   │
│                    • 名称验证                                                    │
│                    • 唯一性检查                                                  │
│                    • AI调用                                                      │
│                    • 代码安全验证                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│    StrategiesService    │ │    IndicatorsService    │ │      Kimi AI API        │
│    • 策略CRUD            │ │    • 指标CRUD            │ │    • 自然语言处理        │
│    • findByName()       │ │    • findByName()       │ │    • 代码生成           │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              数据库层                                            │
│    ┌──────────────┐  ┌───────────────────┐  ┌────────────────────────────┐     │
│    │   Strategy   │  │ StrategyIndicator │  │ StrategyIndicatorParam     │     │
│    │   (策略)      │──│   (策略-指标)      │──│   (策略指标参数)            │     │
│    └──────────────┘  └───────────────────┘  └────────────────────────────┘     │
│                            │                                                    │
│                            ▼                                                    │
│    ┌──────────────┐  ┌───────────────────┐  ┌────────────────────────────┐     │
│    │  Indicator   │  │ IndicatorParameter│  │   StrategyCondition        │     │
│    │   (指标)      │──│   (指标参数)       │  │   (策略条件)               │     │
│    └──────────────┘  └───────────────────┘  └────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 完整流程图

### 创建策略流程 (`/ai-strategy-generator/create`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              用户请求                                             │
│                    POST /ai-strategy-generator/create                            │
│                    { userInput, strategyName?, description? }                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           控制器层验证                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 检查 userInput 是否为空                                                │    │
│  │ 2. 检查 userInput 长度 ≤ 5000 字符                                        │    │
│  │ 3. trim() 处理所有字符串参数                                               │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                           ↓ 验证失败 → 返回 400 错误                              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          服务层预处理                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 生成最终名称: strategyName || `AI_Strategy_${Date.now()}`             │    │
│  │ 2. 验证策略名称格式 (字母/下划线/中文开头)                                   │    │
│  │ 3. 检查策略名称唯一性 → findByName()                                      │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                    ↓ 名称格式错误 → 返回 400 错误                                 │
│                    ↓ 名称已存在 → 返回 409 错误                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AI生成阶段                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 加载提示词模板 (docs/策略ai提示词.txt)                                  │    │
│  │ 2. 构建完整提示词 = 模板 + 用户输入                                        │    │
│  │ 3. 调用 Kimi AI API                                                      │    │
│  │ 4. 解析 AI 响应 JSON                                                     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                    ↓ AI调用失败 → 返回 500 错误                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        代码安全验证阶段                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 遍历所有生成的指标代码，检查危险模式:                                         │    │
│  │ • eval() / Function() / require()                                        │    │
│  │ • import / process / fs / child_process                                  │    │
│  │ • exec() / spawn()                                                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                    ↓ 安全验证失败 → 返回 400 错误                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         创建指标阶段                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 遍历 AI 生成的 indicatorNews 数组:                                        │    │
│  │                                                                          │    │
│  │ for (indicatorData of aiStrategy.indicatorNews):                        │    │
│  │   ├── 创建指标记录 (name, description, calculationCode)                  │    │
│  │   ├── 创建指标参数 (name, paramType, defaultValue, description)          │    │
│  │   └── 保存到数据库 → 返回 createdIndicator                                │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         创建策略阶段                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ 1. 创建策略主记录 (Strategy)                                              │    │
│  │    • name, description, positionType                                     │    │
│  │    • buyFee, sellFee, liquidationThreshold                               │    │
│  │                                                                          │    │
│  │ 2. 创建策略-指标关联 (StrategyIndicator)                                  │    │
│  │    • 遍历 indicators 数组，关联已创建的指标                                 │    │
│  │    • 设置参数值 (StrategyIndicatorParam)                                  │    │
│  │                                                                          │    │
│  │ 3. 创建策略条件 (StrategyCondition)                                       │    │
│  │    • 遍历 conditions 数组，创建买卖条件                                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           返回响应                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ {                                                                        │    │
│  │   success: true,                                                         │    │
│  │   strategy: { id, name, description, ... },                              │    │
│  │   aiGeneratedData: { ... },                                              │    │
│  │   createdIndicators: [ ... ]                                             │    │
│  │ }                                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 生成策略流程 (`/ai-strategy-generator/generate`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              用户请求                                             │
│                    POST /ai-strategy-generator/generate                          │
│                    { userInput }                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           控制器层验证                                            │
│                    (同创建流程的验证逻辑)                                          │
│                    ↓ 验证失败 → 返回 400 错误                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AI生成阶段                                              │
│                    (同创建流程的AI生成逻辑)                                        │
│                    ↓ AI调用失败 → 返回 500 错误                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           返回响应                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ {                                                                        │    │
│  │   success: true,                                                         │    │
│  │   generatedStrategy: {                                                   │    │
│  │     name: "...",                                                         │    │
│  │     description: "...",                                                  │    │
│  │     positionType: "both",                                                │    │
│  │     indicatorNews: [...],                                                │    │
│  │     indicators: [...],                                                   │    │
│  │     conditions: [...]                                                    │    │
│  │   }                                                                      │    │
│  │ }                                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 详细说明

### 1. 控制器层 (AiStrategyGeneratorController)

**文件位置**: `src/modules/ai-strategy-generator/ai-strategy-generator.controller.ts`

**职责**:
- 接收HTTP请求
- 验证输入参数
- 调用服务层方法
- 返回响应结果

**验证规则**:

| 验证项 | 条件 | 错误码 | 错误消息 |
|--------|------|--------|---------|
| 空输入检查 | `userInput.trim() === ''` | 400 | 用户输入不能为空 |
| 长度检查 | `userInput.length > 5000` | 400 | 输入内容过长，请控制在5000字符以内 |

**代码示例**:
```typescript
const MAX_INPUT_LENGTH = 5000;

@Post('create')
async createAiStrategy(@Body() body: { userInput: string; strategyName?: string; description?: string }) {
  if (!body.userInput || body.userInput.trim() === '') {
    throw new HttpException('用户输入不能为空', HttpStatus.BAD_REQUEST);
  }

  if (body.userInput.length > MAX_INPUT_LENGTH) {
    throw new HttpException(`输入内容过长，请控制在${MAX_INPUT_LENGTH}字符以内`, HttpStatus.BAD_REQUEST);
  }

  return this.aiStrategyGeneratorService.createAiStrategy(
    body.userInput.trim(),
    body.strategyName?.trim(),
    body.description?.trim(),
  );
}
```

---

### 2. 服务层

**文件位置**: `src/modules/ai-strategy-generator/ai-strategy-generator.service.ts`

**职责**:
- 名称验证和唯一性检查
- 调用AI API生成策略
- 代码安全验证
- 创建指标和策略数据

#### 2.1 名称验证

**验证规则**:
- 允许字母、数字、下划线、中文
- 必须以字母、下划线或中文开头
- 正则表达式: `^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$`

**代码示例**:
```typescript
private validateStrategyName(name: string): boolean {
  return /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$/.test(name);
}
```

#### 2.2 代码安全验证

**检测模式**:

| 模式 | 说明 |
|------|------|
| `eval\s*\(` | 动态代码执行 |
| `Function\s*\(` | 动态函数创建 |
| `require\s*\(` | 模块加载 |
| `import\s+` | ES6导入 |
| `process\.` | 进程访问 |
| `fs\.` | 文件系统 |
| `child_process` | 子进程 |
| `exec\s*\(` | 命令执行 |
| `spawn\s*\(` | 进程创建 |

**代码示例**:
```typescript
private readonly DANGEROUS_PATTERNS = [
  /eval\s*\(/,
  /Function\s*\(/,
  /require\s*\(/,
  /import\s+/,
  /process\./,
  /fs\./,
  /child_process/,
  /exec\s*\(/,
  /spawn\s*\(/,
];

private validateGeneratedCode(code: string): { valid: boolean; reason?: string } {
  for (const pattern of this.DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `代码包含不安全的操作: ${pattern.source}` };
    }
  }
  return { valid: true };
}
```

#### 2.3 AI调用流程

```
1. 读取提示词模板 (docs/策略ai提示词.txt)
2. 构建完整提示词 = 模板 + 用户输入
3. 调用 Kimi AI API
4. 解析 JSON 响应
5. 返回结构化数据
```

**AI响应结构**:
```typescript
interface AiStrategyResponse {
  name: string;                    // 策略名称
  description: string;             // 策略描述
  positionType: string;            // 持仓类型: long/short/both
  buyFee?: number;                 // 买入手续费
  sellFee?: number;                // 卖出手续费
  liquidationThreshold?: number;   // 清仓阈值
  takeProfitRatio?: number;        // 止盈比例
  stopLossRatio?: number;          // 止损比例
  indicatorNews: Array<{           // 新指标定义
    name: string;
    description: string;
    code: string;                  // 计算代码
    parameters: Array<{
      name: string;
      description: string;
      paramType: string;
      defaultValue: string;
    }>;
  }>;
  indicators: Array<{              // 策略使用的指标
    indicatorNewsIndex: number;    // 对应indicatorNews的索引
    parameters: Array<{
      name: string;
      value: string;
    }>;
  }>;
  conditions: Array<{              // 交易条件
    indicatorIndex: number;
    comparisonType: string;        // constant/indicator
    comparedIndicatorIndex?: number;
    constantValue?: string;
    currentValuePath: string;
    comparedValuePath: string;
    operator: string;              // >/>=/==/!=/</<=
    conditionType: string;         // crossover/value
    action: string;                // buy/sell
    group: number;
    priority: number;
    customCode: string;
  }>;
}
```

---

### 3. 数据库层

#### 3.1 表关系图

```
┌──────────────────┐       ┌────────────────────────┐
│    Strategy      │       │   StrategyIndicator    │
│──────────────────│       │────────────────────────│
│ id               │──┐    │ id                     │
│ name             │  │    │ strategyId (FK)        │◄──┐
│ description      │  │    │ indicatorId (FK)       │   │
│ positionType     │  │    │ priority               │   │
│ buyFee           │  │    └────────────────────────┘   │
│ sellFee          │  │               │                 │
│ liquidationThreshold │            │                 │
└──────────────────┘  │            ▼                 │
                      │    ┌────────────────────────┐   │
                      │    │ StrategyIndicatorParam │   │
                      │    │────────────────────────│   │
                      │    │ id                     │   │
                      │    │ strategyIndicatorId(FK)│───┘
                      │    │ parameterId (FK)       │
                      │    │ value                  │
                      │    └────────────────────────┘
                      │
                      │    ┌────────────────────────┐
                      │    │   StrategyCondition    │
                      │    │────────────────────────│
                      └───►│ id                     │
                           │ strategyId (FK)        │
                           │ indicatorIndex         │
                           │ comparisonType         │
                           │ operator               │
                           │ action                 │
                           │ group                  │
                           │ priority               │
                           │ customCode             │
                           └────────────────────────┘

┌──────────────────┐       ┌────────────────────────┐
│    Indicator     │       │   IndicatorParameter   │
│──────────────────│       │────────────────────────│
│ id               │──┐    │ id                     │
│ name             │  │    │ indicatorId (FK)       │◄──┐
│ description      │  │    │ name                   │   │
│ calculationCode  │  │    │ paramType              │   │
└──────────────────┘  │    │ defaultValue           │   │
                      │    │ description            │   │
                      │    └────────────────────────┘   │
                      │                                 │
                      └─────────────────────────────────┘
```

#### 3.2 数据创建顺序

```
1. 创建指标 (Indicator)
   └── 创建指标参数 (IndicatorParameter)

2. 创建策略 (Strategy)
   ├── 创建策略-指标关联 (StrategyIndicator)
   │   └── 创建策略指标参数 (StrategyIndicatorParam)
   └── 创建策略条件 (StrategyCondition)
```

---

### 4. 错误处理

#### 4.1 错误码说明

| 状态码 | 错误类型 | 触发场景 |
|--------|---------|---------|
| 400 | Bad Request | 输入为空、输入过长、名称格式错误、代码安全验证失败 |
| 409 | Conflict | 策略名称已存在 |
| 500 | Internal Server Error | AI调用失败、数据库操作失败 |

#### 4.2 错误响应格式

```json
{
  "statusCode": 400,
  "message": "错误描述信息",
  "error": "Bad Request"
}
```

---

### 5. 配置参数

| 参数 | 值 | 说明 |
|------|-----|------|
| MAX_INPUT_LENGTH | 5000 | 用户输入最大字符数 |
| 默认策略名称格式 | `AI_Strategy_${Date.now()}` | 未提供名称时的默认格式 |
| 默认持仓类型 | `both` | 支持做多和做空 |
| 默认买入手续费 | 0.001 | 0.1% |
| 默认卖出手续费 | 0.001 | 0.1% |
| 默认清仓阈值 | 90 | 90% |

---

### 6. 接口列表

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 生成策略 | POST | `/ai-strategy-generator/generate` | 仅生成策略JSON，不保存 |
| 创建策略 | POST | `/ai-strategy-generator/create` | 生成策略并保存到数据库 |

---

### 7. 使用示例

#### 7.1 生成策略

```bash
curl -X POST http://localhost:3099/ai-strategy-generator/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个MA交叉策略，当MA5上穿MA20时买入，下穿时卖出"
  }'
```

#### 7.2 创建策略

```bash
curl -X POST http://localhost:3099/ai-strategy-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个MA交叉策略，当MA5上穿MA20时买入，下穿时卖出",
    "strategyName": "AI_MA_Cross",
    "description": "AI生成的MA交叉策略"
  }'
```
