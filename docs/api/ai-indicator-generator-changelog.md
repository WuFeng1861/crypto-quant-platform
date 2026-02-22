# AI指标生成器接口变更文档

## 变更概述

本次更新修复了参数字段名不一致、缺少安全验证等问题，并对响应格式进行了简化。

---

## 接口变更列表

| 接口 | 变更类型 | 影响程度 |
|------|---------|---------|
| `/ai-indicator-generator/generate` | 响应字段变更 | 中 |
| `/ai-indicator-generator/create` | 响应字段变更 + 新增错误码 | 高 |

---

## 1. `/ai-indicator-generator/generate` 接口变更

### 响应字段变更

#### 变更前

```json
{
  "success": true,
  "generatedCode": {
    "code": "function calculate...",
    "parameters": [
      {
        "name": "period",
        "type": "number",
        "defaultValue": 20
      }
    ]
  }
}
```

#### 变更后

```json
{
  "success": true,
  "generatedCode": {
    "code": "function calculate...",
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

### 字段变更明细

| 字段路径 | 变更前 | 变更后 | 说明 |
|---------|--------|--------|------|
| `parameters[].type` | `"number"` | **已移除** | 字段名变更 |
| `parameters[].paramType` | 不存在 | `"number"` | 新字段，替代 `type` |
| `parameters[].defaultValue` | `20` (number) | `"20"` (string) | 类型变更 |
| `parameters[].description` | 不存在 | `"计算周期"` | 新增字段 |

### 前端修改

```diff
- const paramType = param.type;
+ const paramType = param.paramType;

- const defaultValue = param.defaultValue;  // number
+ const defaultValue = Number(param.defaultValue);  // string -> number
```

---

## 2. `/ai-indicator-generator/create` 接口变更

### 响应字段变更

#### 变更前

```json
{
  "success": true,
  "indicator": {
    "id": 1,
    "name": "AI_SMA_20",
    "parameters": [
      {
        "id": 1,
        "name": "period",
        "defaultValue": 20
      }
    ]
  },
  "generatedCode": "...",
  "parameters": [
    { "name": "period", "defaultValue": 20 }
  ]
}
```

#### 变更后

```json
{
  "success": true,
  "indicator": {
    "id": 1,
    "name": "AI_SMA_20",
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
  "generatedCode": "..."
}
```

### 字段变更明细

| 字段路径 | 变更前 | 变更后 | 说明 |
|---------|--------|--------|------|
| `indicator.parameters[].defaultValue` | `20` (number) | `"20"` (string) | 类型变更 |
| `indicator.parameters[].description` | 不存在 | `"计算周期"` | 新增字段 |
| `indicator.parameters[].paramType` | 不存在 | `"number"` | 新增字段 |
| `parameters` (顶层) | `[{...}]` | **已移除** | 冗余字段 |

### 前端修改

```diff
- const parameters = response.parameters;
+ const parameters = response.indicator.parameters;

- const defaultValue = param.defaultValue;  // number
+ const defaultValue = Number(param.defaultValue);  // string -> number
```

### 新增错误码

| 状态码 | 触发条件 | 响应示例 |
|--------|---------|---------|
| **400** | 输入超过1000字符 | `{"statusCode": 400, "message": "输入内容过长，请控制在1000字符以内"}` |
| **400** | 指标名称格式错误 | `{"statusCode": 400, "message": "指标名称格式不正确，只能包含字母、数字和下划线，且不能以数字开头"}` |
| **400** | 代码安全验证失败 | `{"statusCode": 400, "message": "生成的代码安全验证失败: 代码包含不安全的操作"}` |
| **409** | 指标名称已存在 | `{"statusCode": 409, "message": "指标名称 'AI_SMA_20' 已存在，请使用其他名称"}` |

### 前端修改

```typescript
// 新增错误处理
catch (error) {
  const { statusCode, message } = error.response?.data || {};
  
  switch (statusCode) {
    case 400:
      // 输入验证或安全验证失败
      break;
    case 409:
      // 名称冲突
      break;
  }
}
```

---

## 迁移指南

### 步骤1: 更新字段名

```typescript
// 兼容新旧格式
function getParamType(param: any): string {
  return param.paramType || param.type || 'number';
}
```

### 步骤2: 处理 defaultValue 类型

```typescript
// 统一转换为 number
function getDefaultValue(param: any): number {
  const value = param.defaultValue;
  if (typeof value === 'string') {
    return Number(value) || 0;
  }
  return value || 0;
}
```

### 步骤3: 移除对顶层 parameters 的依赖

```typescript
// 变更前
const params = response.parameters;

// 变更后
const params = response.indicator?.parameters || [];
```

### 步骤4: 添加新错误码处理

```typescript
const ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误',
  409: '指标名称已存在',
  500: '服务器内部错误',
};

async function createIndicator(data: any) {
  try {
    return await api.post('/ai-indicator-generator/create', data);
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    
    if (status === 409) {
      throw new Error('指标名称已存在，请使用其他名称');
    }
    if (status === 400 && message?.includes('过长')) {
      throw new Error('输入内容过长');
    }
    throw new Error(message || ERROR_MESSAGES[status] || '未知错误');
  }
}
```

---

## 变更原因

| 变更 | 原因 |
|------|------|
| `type` → `paramType` | 与后端DTO字段名保持一致 |
| `defaultValue` 类型变更 | 统一为字符串类型，避免类型混乱 |
| 移除顶层 `parameters` | 与 `indicator.parameters` 重复 |
| 新增输入验证 | 防止过长输入导致API调用失败 |
| 新增名称验证 | 防止数据库唯一约束错误 |
| 新增代码安全验证 | 防止执行恶意代码 |
