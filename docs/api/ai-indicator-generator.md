# AI指标生成器 API 文档

## 概述

AI指标生成器提供基于自然语言描述自动生成技术指标计算函数的能力。

**基础URL**: `http://localhost:3099`

---

## 接口列表

| 接口 | 方法 | 路径 | 描述 |
|------|------|------|------|
| 生成指标函数 | POST | `/ai-indicator-generator/generate` | 仅生成代码，不保存 |
| 创建AI指标 | POST | `/ai-indicator-generator/create` | 生成代码并保存到数据库 |

---

## 1. 生成指标函数

仅生成指标代码，不保存到数据库。

### 请求

**POST** `/ai-indicator-generator/generate`

**Content-Type**: `application/json`

**请求体**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| userInput | string | 是 | 自然语言描述，最大1000字符 |

**请求示例**:

```json
{
  "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天"
}
```

### 响应

**成功响应** (200):

```json
{
  "success": true,
  "generatedCode": {
    "code": "function calculate(priceData, parameters) { const period = parameters.period || 20; const result = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push(null); } else { let sum = new BigNumber(0); for (let j = 0; j < period; j++) { sum = sum.plus(new BigNumber(priceData[i - j].closePrice)); } result.push(sum.dividedBy(period).toNumber()); } } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "计算周期",
        "paramType": "number",
        "defaultValue": "20"
      }
    ]
  }
}
```

**响应字段说明**:

| 字段 | 类型 | 描述 |
|------|------|------|
| success | boolean | 是否成功 |
| generatedCode.code | string | 生成的函数代码 |
| generatedCode.parameters | array | 参数列表 |
| generatedCode.parameters[].name | string | 参数名称 |
| generatedCode.parameters[].description | string | 参数描述 |
| generatedCode.parameters[].paramType | string | 参数类型: `number` / `string` / `boolean` |
| generatedCode.parameters[].defaultValue | string | 默认值（字符串类型） |

---

## 2. 创建AI指标

生成指标代码并保存到数据库。

### 请求

**POST** `/ai-indicator-generator/create`

**Content-Type**: `application/json`

**请求体**:

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| userInput | string | 是 | 自然语言描述，最大1000字符 |
| indicatorName | string | 否 | 指标名称，格式: 字母/下划线开头，仅含字母/数字/下划线 |
| description | string | 否 | 指标描述 |

**请求示例**:

```json
{
  "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天",
  "indicatorName": "AI_SMA_20",
  "description": "AI生成的20日简单移动平均线"
}
```

### 响应

**成功响应** (200):

```json
{
  "success": true,
  "indicator": {
    "id": 1,
    "name": "AI_SMA_20",
    "description": "AI生成的20日简单移动平均线",
    "calculationCode": "function calculate(priceData, parameters) { ... }",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "parameters": [
      {
        "id": 1,
        "name": "period",
        "description": "计算周期",
        "paramType": "number",
        "defaultValue": "20"
      }
    ]
  },
  "generatedCode": "function calculate(priceData, parameters) { ... }"
}
```

**响应字段说明**:

| 字段 | 类型 | 描述 |
|------|------|------|
| success | boolean | 是否成功 |
| indicator | object | 创建的指标对象 |
| indicator.id | number | 指标ID |
| indicator.name | string | 指标名称 |
| indicator.description | string | 指标描述 |
| indicator.calculationCode | string | 计算函数代码 |
| indicator.createdAt | string | 创建时间 (ISO 8601) |
| indicator.updatedAt | string | 更新时间 (ISO 8601) |
| indicator.parameters | array | 参数列表 |
| indicator.parameters[].id | number | 参数ID |
| indicator.parameters[].name | string | 参数名称 |
| indicator.parameters[].description | string | 参数描述 |
| indicator.parameters[].paramType | string | 参数类型 |
| indicator.parameters[].defaultValue | string | 默认值（字符串类型） |
| generatedCode | string | 生成的函数代码 |

---

## 错误响应

所有错误响应格式一致：

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

### 错误码说明

| 状态码 | 错误类型 | 场景 | message 示例 |
|--------|---------|------|-------------|
| 400 | Bad Request | 用户输入为空 | `用户输入不能为空` |
| 400 | Bad Request | 输入内容过长 | `输入内容过长，请控制在1000字符以内` |
| 400 | Bad Request | 指标名称格式错误 | `指标名称格式不正确，只能包含字母、数字和下划线，且不能以数字开头` |
| 400 | Bad Request | 代码安全验证失败 | `生成的代码安全验证失败: 代码包含不安全的操作` |
| 400 | Bad Request | AI生成失败 | `AI未能生成有效的指标函数` |
| 409 | Conflict | 指标名称已存在 | `指标名称 'AI_SMA_20' 已存在，请使用其他名称` |
| 500 | Internal Server Error | 服务器内部错误 | `AI调用失败: ...` |

---

## 前端对接示例

### TypeScript 类型定义

```typescript
interface Parameter {
  id?: number;
  name: string;
  description: string;
  paramType: 'number' | 'string' | 'boolean';
  defaultValue: string;
}

interface GeneratedCode {
  code: string;
  parameters: Parameter[];
}

interface Indicator {
  id: number;
  name: string;
  description: string;
  calculationCode: string;
  createdAt: string;
  updatedAt: string;
  parameters: Parameter[];
}

interface GenerateResponse {
  success: boolean;
  generatedCode: GeneratedCode;
}

interface CreateResponse {
  success: boolean;
  indicator: Indicator;
  generatedCode: string;
}

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}
```

### API 调用示例

```typescript
const API_BASE = 'http://localhost:3099';

async function generateIndicator(userInput: string): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/ai-indicator-generator/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput }),
  });
  
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}

async function createIndicator(
  userInput: string,
  indicatorName?: string,
  description?: string
): Promise<CreateResponse> {
  const response = await fetch(`${API_BASE}/ai-indicator-generator/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput, indicatorName, description }),
  });
  
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }
  
  return response.json();
}
```

### 使用参数默认值

```typescript
function getParamDefaultAsNumber(param: Parameter): number {
  return Number(param.defaultValue) || 0;
}

function getParamDefaultAsString(param: Parameter): string {
  return param.defaultValue || '';
}

function getParamDefaultAsBoolean(param: Parameter): boolean {
  return param.defaultValue === 'true';
}
```

### 错误处理示例

```typescript
async function handleCreateIndicator(data: { userInput: string; name?: string }) {
  try {
    const result = await createIndicator(data.userInput, data.name);
    console.log('创建成功:', result.indicator);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    
    if (message.includes('已存在')) {
      alert('指标名称已存在，请换一个名称');
    } else if (message.includes('格式不正确')) {
      alert('指标名称格式错误，只能使用字母、数字和下划线');
    } else if (message.includes('过长')) {
      alert('输入内容过长，请精简描述');
    } else {
      alert(`创建失败: ${message}`);
    }
    
    throw error;
  }
}
```

---

## 使用示例

### 示例1: 创建简单移动平均线

```bash
curl -X POST http://localhost:3099/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天",
    "indicatorName": "AI_SMA_20"
  }'
```

### 示例2: 创建RSI指标

```bash
curl -X POST http://localhost:3099/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个RSI指标，周期为14天",
    "indicatorName": "AI_RSI_14"
  }'
```

### 示例3: 创建布林带指标

```bash
curl -X POST http://localhost:3099/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个布林带指标，周期为20天，标准差倍数为2",
    "indicatorName": "AI_BollingerBands_20"
  }'
```

---

## 注意事项

1. **参数类型**: 所有参数的 `defaultValue` 都是字符串类型，前端需要根据 `paramType` 进行类型转换

2. **指标名称**: 
   - 必须以字母或下划线开头
   - 只能包含字母、数字和下划线
   - 不能与已有指标重名

3. **输入长度**: 用户输入最大1000字符

4. **代码安全**: 系统会自动检测生成的代码是否包含危险操作

5. **默认名称**: 如果不提供 `indicatorName`，系统会自动生成 `AI_${时间戳}` 格式的名称
