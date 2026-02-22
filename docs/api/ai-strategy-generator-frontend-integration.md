# AI策略生成器前端对接技术文档

## 目录

1. [功能概述](#1-功能概述)
2. [系统架构](#2-系统架构)
3. [功能模块详解](#3-功能模块详解)
4. [接口规范](#4-接口规范)
5. [前端集成指南](#5-前端集成指南)
6. [数据格式示例](#6-数据格式示例)
7. [性能与安全要求](#7-性能与安全要求)
8. [测试用例](#8-测试用例)
9. [常见问题与解决方案](#9-常见问题与解决方案)

---

## 1. 功能概述

### 1.1 核心目标

AI策略生成器是一个基于大语言模型（LLM）的智能策略生成系统，旨在通过自然语言描述自动生成量化交易策略，降低策略开发门槛，提高策略开发效率。

### 1.2 应用场景

| 场景 | 描述 | 用户群体 |
|------|------|---------|
| 快速策略原型 | 通过自然语言快速验证交易想法 | 量化研究员 |
| 策略教学演示 | 展示策略构建过程和逻辑 | 量化初学者 |
| 策略模板生成 | 生成可复用的策略模板 | 策略开发者 |
| 策略参数优化 | 快速生成不同参数组合的策略 | 交易员 |

### 1.3 主要业务价值

```
┌─────────────────────────────────────────────────────────────────┐
│                      业务价值矩阵                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   效率提升                                                       │
│   ┌─────────────────────────────────────────────────────┐      │
│   │  传统开发: 需求分析 → 编码 → 调试 → 测试 (数天)        │      │
│   │  AI生成:  自然语言描述 → AI生成 → 验证 (数分钟)        │      │
│   │  效率提升: 100x+                                      │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
│   门槛降低                                                       │
│   ┌─────────────────────────────────────────────────────┐      │
│   │  传统: 需要掌握编程、量化知识、API调用                 │      │
│   │  AI生成: 只需要用自然语言描述策略逻辑                  │      │
│   │  门槛降低: 编程知识 → 业务知识                         │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
│   创新加速                                                       │
│   ┌─────────────────────────────────────────────────────┐      │
│   │  快速迭代: 分钟级生成多个策略变体                      │      │
│   │  思路验证: 即时验证交易想法的可行性                    │      │
│   │  组合探索: 轻松尝试不同的指标组合                      │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 系统架构

### 2.1 技术栈

```
┌─────────────────────────────────────────────────────────────────┐
│                          前端技术栈                              │
├─────────────────────────────────────────────────────────────────┤
│  框架: React / Vue / Angular                                    │
│  HTTP客户端: Axios / Fetch                                       │
│  状态管理: Redux / Vuex / Pinia                                  │
│  UI组件: Ant Design / Element Plus                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          后端技术栈                              │
├─────────────────────────────────────────────────────────────────┤
│  框架: NestJS (Node.js)                                         │
│  数据库: MySQL + TypeORM                                        │
│  缓存: Redis                                                    │
│  AI服务: Kimi API (Moonshot)                                    │
│  文档: Swagger                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 系统交互关系

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │
│   前端应用    │────►│   后端API    │────►│   Kimi AI    │
│              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  MySQL   │  │  Redis   │  │ 文件系统  │
       │ (持久化)  │  │  (缓存)   │  │ (提示词)  │
       └──────────┘  └──────────┘  └──────────┘
```

### 2.3 数据流转流程

```
用户输入 ──► 前端验证 ──► API请求 ──► 后端验证
                                          │
                                          ▼
                                    AI生成策略
                                          │
                                          ▼
                                    安全验证
                                          │
                                          ▼
                              ┌───────────┴───────────┐
                              │                       │
                              ▼                       ▼
                        创建指标记录            创建策略记录
                              │                       │
                              └───────────┬───────────┘
                                          │
                                          ▼
                                    返回响应数据
                                          │
                                          ▼
                                    前端展示结果
```

---

## 3. 功能模块详解

### 3.1 策略生成核心功能说明

#### 3.1.1 功能架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI策略生成器                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  输入解析    │  │  AI生成     │  │  结果验证    │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ • 长度验证   │  │ • 提示词构建 │  │ • 格式验证   │             │
│  │ • 内容过滤   │  │ • API调用   │  │ • 安全验证   │             │
│  │ • 参数处理   │  │ • 响应解析  │  │ • 唯一性检查 │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  指标创建    │  │  策略创建    │  │  条件创建    │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ • 指标记录   │  │ • 策略记录   │  │ • 买入条件   │             │
│  │ • 参数定义   │  │ • 关联指标   │  │ • 卖出条件   │             │
│  │ • 计算代码   │  │ • 参数配置   │  │ • 触发逻辑   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.1.2 核心处理流程

| 步骤 | 处理内容 | 输出 |
|------|---------|------|
| 1. 输入验证 | 验证用户输入的长度和格式 | 验证结果 |
| 2. 名称检查 | 检查策略名称格式和唯一性 | 检查结果 |
| 3. AI生成 | 调用AI生成策略结构 | 策略JSON |
| 4. 安全验证 | 检查生成的代码安全性 | 验证结果 |
| 5. 数据创建 | 创建指标和策略数据 | 数据库记录 |
| 6. 结果返回 | 返回完整的策略信息 | 响应数据 |

### 3.2 策略类型及适用场景

#### 3.2.1 支持的策略类型

| 策略类型 | 描述 | 适用场景 | 示例 |
|---------|------|---------|------|
| 趋势跟踪 | 跟随市场趋势进行交易 | 牛熊市行情 | MA交叉、MACD策略 |
| 均值回归 | 价格回归均值时交易 | 震荡行情 | 布林带、RSI策略 |
| 动量策略 | 基于价格动量交易 | 趋势行情 | 动量突破策略 |
| 套利策略 | 利用价格差异套利 | 期现套利 | 跨期套利策略 |
| 组合策略 | 多指标组合交易 | 复杂行情 | 多因子策略 |

#### 3.2.2 持仓类型说明

| 类型 | 值 | 描述 |
|------|-----|------|
| 做多 | `long` | 仅开多仓 |
| 做空 | `short` | 仅开空仓 |
| 双向 | `both` | 可开多仓和空仓 |

### 3.3 策略参数配置说明

#### 3.3.1 基础参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| name | string | 是 | - | 策略名称 |
| description | string | 否 | - | 策略描述 |
| positionType | enum | 否 | `both` | 持仓类型 |
| buyFee | number | 否 | 0.001 | 买入手续费率 |
| sellFee | number | 否 | 0.001 | 卖出手续费率 |
| liquidationThreshold | number | 否 | 90 | 清仓阈值(%) |
| takeProfitRatio | number | 否 | null | 止盈比例 |
| stopLossRatio | number | 否 | null | 止损比例 |

#### 3.3.2 指标参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| name | string | 参数名称 |
| paramType | enum | 参数类型: `number`/`string`/`boolean` |
| defaultValue | string | 默认值（字符串格式） |
| description | string | 参数描述 |

#### 3.3.3 条件参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| indicatorIndex | number | 指标索引 |
| comparisonType | enum | 比较类型: `constant`/`indicator` |
| operator | enum | 操作符: `>`/`>=`/`==`/`!=`/`<`/`<=` |
| conditionType | enum | 条件类型: `crossover`/`value` |
| action | enum | 动作: `buy`/`sell` |
| group | number | 条件组 |
| priority | number | 优先级 |

### 3.4 策略生成流程说明

```
┌─────────────────────────────────────────────────────────────────┐
│                      策略生成流程图                              │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  开始   │
    └────┬────┘
         │
         ▼
    ┌─────────────┐     ┌─────────────┐
    │ 用户输入描述 │────►│ 前端验证输入 │
    └─────────────┘     └──────┬──────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌──────────┐          ┌──────────┐
             │ 验证通过  │          │ 验证失败  │
             └─────┬────┘          └────┬─────┘
                   │                    │
                   ▼                    ▼
             ┌──────────┐          ┌──────────┐
             │ 发送请求  │          │ 提示错误  │
             └─────┬────┘          └──────────┘
                   │
                   ▼
             ┌──────────────┐
             │ 后端接收请求  │
             └───────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │长度验证 │ │名称验证 │ │唯一性   │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         └───────────┼───────────┘
                     │
                     ▼
             ┌──────────────┐
             │ 调用AI生成   │
             └───────┬──────┘
                     │
                     ▼
             ┌──────────────┐
             │ 解析AI响应   │
             └───────┬──────┘
                     │
                     ▼
             ┌──────────────┐
             │ 代码安全验证 │
             └───────┬──────┘
                     │
         ┌───────────┼───────────┐
         │                       │
         ▼                       ▼
    ┌──────────┐           ┌──────────┐
    │ 验证通过  │           │ 验证失败  │
    └────┬─────┘           └────┬─────┘
         │                      │
         ▼                      ▼
    ┌──────────┐           ┌──────────┐
    │创建指标  │           │ 返回错误  │
    └────┬─────┘           └──────────┘
         │
         ▼
    ┌──────────┐
    │创建策略  │
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │创建条件  │
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │ 返回结果 │
    └────┬─────┘
         │
         ▼
    ┌─────────┐
    │  结束   │
    └─────────┘
```

---

## 4. 接口规范

### 4.1 API接口定义

#### 4.1.1 生成策略接口

| 属性 | 值 |
|------|-----|
| 接口名称 | 生成策略 |
| 请求方法 | POST |
| 请求URL | `/ai-strategy-generator/generate` |
| Content-Type | `application/json` |

**请求头**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Content-Type | string | 是 | `application/json` |
| Authorization | string | 否 | Bearer Token (如需要) |

**请求体**:

| 字段名 | 类型 | 必填 | 约束条件 | 说明 |
|--------|------|------|---------|------|
| userInput | string | 是 | 1-5000字符 | 自然语言策略描述 |

#### 4.1.2 创建策略接口

| 属性 | 值 |
|------|-----|
| 接口名称 | 创建策略 |
| 请求方法 | POST |
| 请求URL | `/ai-strategy-generator/create` |
| Content-Type | `application/json` |

**请求头**:

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| Content-Type | string | 是 | `application/json` |
| Authorization | string | 否 | Bearer Token (如需要) |

**请求体**:

| 字段名 | 类型 | 必填 | 约束条件 | 默认值 | 说明 |
|--------|------|------|---------|--------|------|
| userInput | string | 是 | 1-5000字符 | - | 自然语言策略描述 |
| strategyName | string | 否 | 字母/下划线/中文开头，仅含字母/数字/下划线/中文 | `AI_Strategy_${timestamp}` | 策略名称 |
| description | string | 否 | - | AI生成的描述 | 策略描述 |

### 4.2 输出数据结构

#### 4.2.1 生成策略响应

```typescript
interface GenerateStrategyResponse {
  success: boolean;
  generatedStrategy: {
    name: string;
    description: string;
    positionType: 'long' | 'short' | 'both';
    buyFee: number;
    sellFee: number;
    liquidationThreshold: number;
    takeProfitRatio: number | null;
    stopLossRatio: number | null;
    indicatorNews: Array<{
      name: string;
      description: string;
      code: string;
      parameters: Array<{
        name: string;
        description: string;
        paramType: 'number' | 'string' | 'boolean';
        defaultValue: string;
      }>;
    }>;
    indicators: Array<{
      indicatorNewsIndex: number;
      parameters: Array<{
        name: string;
        value: string;
      }>;
    }>;
    conditions: Array<{
      indicatorIndex: number;
      comparisonType: 'constant' | 'indicator';
      comparedIndicatorIndex?: number;
      constantValue?: string;
      currentValuePath: string;
      comparedValuePath: string;
      operator: '>' | '>=' | '==' | '!=' | '<' | '<=';
      conditionType: 'crossover' | 'value';
      action: 'buy' | 'sell';
      group: number;
      priority: number;
      customCode: string;
    }>;
  };
}
```

#### 4.2.2 创建策略响应

```typescript
interface CreateStrategyResponse {
  success: boolean;
  strategy: {
    id: number;
    name: string;
    description: string;
    positionType: 'long' | 'short' | 'both';
    buyFee: number;
    sellFee: number;
    liquidationThreshold: number;
    takeProfitRatio: number | null;
    stopLossRatio: number | null;
    createdAt: string;
    updatedAt: string;
  };
  aiGeneratedData: GenerateStrategyResponse['generatedStrategy'];
  createdIndicators: Array<{
    id: number;
    name: string;
    description: string;
    calculationCode: string;
    parameters: Array<{
      id: number;
      name: string;
      description: string;
      paramType: string;
      defaultValue: string;
    }>;
  }>;
}
```

### 4.3 错误码及错误信息定义

| 状态码 | 错误类型 | 错误场景 | 错误消息示例 |
|--------|---------|---------|-------------|
| 400 | Bad Request | 输入为空 | `用户输入不能为空` |
| 400 | Bad Request | 输入过长 | `输入内容过长，请控制在5000字符以内` |
| 400 | Bad Request | 名称格式错误 | `策略名称格式不正确，只能包含字母、数字、下划线和中文，且不能以数字开头` |
| 400 | Bad Request | 代码安全验证失败 | `策略代码安全验证失败: 代码包含不安全的操作: eval` |
| 409 | Conflict | 名称已存在 | `策略名称 'AI_MA_Cross' 已存在，请使用其他名称` |
| 500 | Internal Server Error | AI调用失败 | `AI调用失败: 网络超时` |
| 500 | Internal Server Error | 数据库错误 | `AI策略创建失败: 数据库连接异常` |

**错误响应格式**:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
}
```

---

## 5. 前端集成指南

### 5.1 前端调用流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端调用流程                                │
└─────────────────────────────────────────────────────────────────┘

1. 用户输入
   └── 收集用户输入的策略描述

2. 前端验证
   ├── 检查输入是否为空
   ├── 检查输入长度 (≤5000字符)
   └── 可选: 检查策略名称格式

3. 发送请求
   ├── 构建请求体
   ├── 设置请求头
   └── 调用API接口

4. 处理响应
   ├── 成功: 解析响应数据，更新UI
   └── 失败: 显示错误信息，提示用户

5. 状态管理
   ├── 更新加载状态
   ├── 缓存响应数据
   └── 处理错误状态
```

### 5.2 参数组装示例

#### 5.2.1 TypeScript 类型定义

```typescript
// 请求类型
interface GenerateStrategyRequest {
  userInput: string;
}

interface CreateStrategyRequest {
  userInput: string;
  strategyName?: string;
  description?: string;
}

// 响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    statusCode: number;
    message: string;
    error: string;
  };
}

// 参数类型
interface IndicatorParameter {
  name: string;
  description: string;
  paramType: 'number' | 'string' | 'boolean';
  defaultValue: string;
}

interface IndicatorNews {
  name: string;
  description: string;
  code: string;
  parameters: IndicatorParameter[];
}

interface StrategyCondition {
  indicatorIndex: number;
  comparisonType: 'constant' | 'indicator';
  comparedIndicatorIndex?: number;
  constantValue?: string;
  currentValuePath: string;
  comparedValuePath: string;
  operator: '>' | '>=' | '==' | '!=' | '<' | '<=';
  conditionType: 'crossover' | 'value';
  action: 'buy' | 'sell';
  group: number;
  priority: number;
  customCode: string;
}

interface GeneratedStrategy {
  name: string;
  description: string;
  positionType: 'long' | 'short' | 'both';
  buyFee: number;
  sellFee: number;
  liquidationThreshold: number;
  takeProfitRatio: number | null;
  stopLossRatio: number | null;
  indicatorNews: IndicatorNews[];
  indicators: Array<{
    indicatorNewsIndex: number;
    parameters: Array<{ name: string; value: string }>;
  }>;
  conditions: StrategyCondition[];
}

interface CreatedIndicator {
  id: number;
  name: string;
  description: string;
  calculationCode: string;
  parameters: Array<{
    id: number;
    name: string;
    description: string;
    paramType: string;
    defaultValue: string;
  }>;
}

interface CreatedStrategy {
  id: number;
  name: string;
  description: string;
  positionType: 'long' | 'short' | 'both';
  buyFee: number;
  sellFee: number;
  liquidationThreshold: number;
  takeProfitRatio: number | null;
  stopLossRatio: number | null;
  createdAt: string;
  updatedAt: string;
}
```

#### 5.2.2 API 调用封装

```typescript
// api/strategyGenerator.ts
import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3099';

// 错误类型
export class StrategyGeneratorError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public error: string
  ) {
    super(message);
    this.name = 'StrategyGeneratorError';
  }
}

// API客户端
export const strategyGeneratorApi = {
  /**
   * 生成策略（仅生成，不保存）
   */
  async generate(userInput: string): Promise<GeneratedStrategy> {
    try {
      const response = await axios.post<ApiResponse<{ generatedStrategy: GeneratedStrategy }>>(
        `${API_BASE_URL}/ai-strategy-generator/generate`,
        { userInput }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new StrategyGeneratorError(500, '生成失败', 'Internal Server Error');
      }
      
      return response.data.data.generatedStrategy;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * 创建策略（生成并保存）
   */
  async create(
    userInput: string,
    strategyName?: string,
    description?: string
  ): Promise<{
    strategy: CreatedStrategy;
    aiGeneratedData: GeneratedStrategy;
    createdIndicators: CreatedIndicator[];
  }> {
    try {
      const response = await axios.post<ApiResponse<{
        strategy: CreatedStrategy;
        aiGeneratedData: GeneratedStrategy;
        createdIndicators: CreatedIndicator[];
      }>>(
        `${API_BASE_URL}/ai-strategy-generator/create`,
        {
          userInput,
          strategyName,
          description,
        }
      );
      
      if (!response.data.success || !response.data.data) {
        throw new StrategyGeneratorError(500, '创建失败', 'Internal Server Error');
      }
      
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  /**
   * 错误处理
   */
  handleError(error: unknown): StrategyGeneratorError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      if (axiosError.response?.data) {
        const { statusCode, message, error: errorType } = axiosError.response.data;
        return new StrategyGeneratorError(statusCode, message, errorType);
      }
      return new StrategyGeneratorError(500, error.message, 'Network Error');
    }
    return new StrategyGeneratorError(500, '未知错误', 'Unknown Error');
  },
};
```

### 5.3 响应处理方法

#### 5.3.1 React Hook 示例

```typescript
// hooks/useStrategyGenerator.ts
import { useState, useCallback } from 'react';
import { strategyGeneratorApi, StrategyGeneratorError } from '../api/strategyGenerator';

interface UseStrategyGeneratorResult {
  loading: boolean;
  error: StrategyGeneratorError | null;
  generatedStrategy: GeneratedStrategy | null;
  createdStrategy: {
    strategy: CreatedStrategy;
    aiGeneratedData: GeneratedStrategy;
    createdIndicators: CreatedIndicator[];
  } | null;
  generate: (userInput: string) => Promise<void>;
  create: (userInput: string, strategyName?: string, description?: string) => Promise<void>;
  reset: () => void;
}

export function useStrategyGenerator(): UseStrategyGeneratorResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StrategyGeneratorError | null>(null);
  const [generatedStrategy, setGeneratedStrategy] = useState<GeneratedStrategy | null>(null);
  const [createdStrategy, setCreatedStrategy] = useState<UseStrategyGeneratorResult['createdStrategy']>(null);

  const generate = useCallback(async (userInput: string) => {
    setLoading(true);
    setError(null);
    setGeneratedStrategy(null);
    
    try {
      const result = await strategyGeneratorApi.generate(userInput);
      setGeneratedStrategy(result);
    } catch (err) {
      setError(err as StrategyGeneratorError);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (
    userInput: string,
    strategyName?: string,
    description?: string
  ) => {
    setLoading(true);
    setError(null);
    setCreatedStrategy(null);
    
    try {
      const result = await strategyGeneratorApi.create(userInput, strategyName, description);
      setCreatedStrategy(result);
    } catch (err) {
      setError(err as StrategyGeneratorError);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setGeneratedStrategy(null);
    setCreatedStrategy(null);
  }, []);

  return {
    loading,
    error,
    generatedStrategy,
    createdStrategy,
    generate,
    create,
    reset,
  };
}
```

#### 5.3.2 Vue Composable 示例

```typescript
// composables/useStrategyGenerator.ts
import { ref } from 'vue';
import { strategyGeneratorApi, StrategyGeneratorError } from '../api/strategyGenerator';

export function useStrategyGenerator() {
  const loading = ref(false);
  const error = ref<StrategyGeneratorError | null>(null);
  const generatedStrategy = ref<GeneratedStrategy | null>(null);
  const createdStrategy = ref<{
    strategy: CreatedStrategy;
    aiGeneratedData: GeneratedStrategy;
    createdIndicators: CreatedIndicator[];
  } | null>(null);

  const generate = async (userInput: string) => {
    loading.value = true;
    error.value = null;
    generatedStrategy.value = null;
    
    try {
      generatedStrategy.value = await strategyGeneratorApi.generate(userInput);
    } catch (err) {
      error.value = err as StrategyGeneratorError;
    } finally {
      loading.value = false;
    }
  };

  const create = async (
    userInput: string,
    strategyName?: string,
    description?: string
  ) => {
    loading.value = true;
    error.value = null;
    createdStrategy.value = null;
    
    try {
      createdStrategy.value = await strategyGeneratorApi.create(userInput, strategyName, description);
    } catch (err) {
      error.value = err as StrategyGeneratorError;
    } finally {
      loading.value = false;
    }
  };

  const reset = () => {
    loading.value = false;
    error.value = null;
    generatedStrategy.value = null;
    createdStrategy.value = null;
  };

  return {
    loading,
    error,
    generatedStrategy,
    createdStrategy,
    generate,
    create,
    reset,
  };
}
```

### 5.4 异常处理策略

```typescript
// utils/errorHandler.ts

/**
 * 错误类型枚举
 */
export enum ErrorType {
  INPUT_EMPTY = 'INPUT_EMPTY',
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',
  NAME_FORMAT_ERROR = 'NAME_FORMAT_ERROR',
  NAME_EXISTS = 'NAME_EXISTS',
  CODE_SECURITY = 'CODE_SECURITY',
  AI_ERROR = 'AI_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误消息映射
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.INPUT_EMPTY]: '请输入策略描述',
  [ErrorType.INPUT_TOO_LONG]: '输入内容过长，请精简描述',
  [ErrorType.NAME_FORMAT_ERROR]: '策略名称格式不正确，只能使用字母、数字、下划线和中文',
  [ErrorType.NAME_EXISTS]: '策略名称已存在，请使用其他名称',
  [ErrorType.CODE_SECURITY]: '生成的策略代码存在安全风险，请修改描述后重试',
  [ErrorType.AI_ERROR]: 'AI生成失败，请稍后重试',
  [ErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络后重试',
  [ErrorType.UNKNOWN_ERROR]: '未知错误，请联系技术支持',
};

/**
 * 根据错误响应判断错误类型
 */
export function getErrorType(error: StrategyGeneratorError): ErrorType {
  const { statusCode, message } = error;
  
  if (statusCode === 400) {
    if (message.includes('不能为空')) return ErrorType.INPUT_EMPTY;
    if (message.includes('过长')) return ErrorType.INPUT_TOO_LONG;
    if (message.includes('格式不正确')) return ErrorType.NAME_FORMAT_ERROR;
    if (message.includes('安全验证失败')) return ErrorType.CODE_SECURITY;
  }
  
  if (statusCode === 409) {
    return ErrorType.NAME_EXISTS;
  }
  
  if (statusCode === 500) {
    if (message.includes('AI') || message.includes('调用')) {
      return ErrorType.AI_ERROR;
    }
    return ErrorType.NETWORK_ERROR;
  }
  
  return ErrorType.UNKNOWN_ERROR;
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: StrategyGeneratorError): string {
  const errorType = getErrorType(error);
  return ERROR_MESSAGES[errorType];
}
```

### 5.5 状态管理建议

#### 5.5.1 Redux Slice 示例

```typescript
// store/strategyGeneratorSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { strategyGeneratorApi, StrategyGeneratorError } from '../api/strategyGenerator';

interface StrategyGeneratorState {
  loading: boolean;
  error: StrategyGeneratorError | null;
  generatedStrategy: GeneratedStrategy | null;
  createdStrategy: {
    strategy: CreatedStrategy;
    aiGeneratedData: GeneratedStrategy;
    createdIndicators: CreatedIndicator[];
  } | null;
  history: Array<{
    id: string;
    timestamp: number;
    userInput: string;
    strategyName: string;
  }>;
}

const initialState: StrategyGeneratorState = {
  loading: false,
  error: null,
  generatedStrategy: null,
  createdStrategy: null,
  history: [],
};

// 异步 Thunk
export const generateStrategy = createAsyncThunk(
  'strategyGenerator/generate',
  async (userInput: string, { rejectWithValue }) => {
    try {
      return await strategyGeneratorApi.generate(userInput);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const createStrategy = createAsyncThunk(
  'strategyGenerator/create',
  async (
    { userInput, strategyName, description }: {
      userInput: string;
      strategyName?: string;
      description?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      return await strategyGeneratorApi.create(userInput, strategyName, description);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const strategyGeneratorSlice = createSlice({
  name: 'strategyGenerator',
  initialState,
  reducers: {
    reset: (state) => {
      state.loading = false;
      state.error = null;
      state.generatedStrategy = null;
      state.createdStrategy = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    addToHistory: (state, action: PayloadAction<{
      userInput: string;
      strategyName: string;
    }>) => {
      state.history.push({
        id: Date.now().toString(),
        timestamp: Date.now(),
        ...action.payload,
      });
    },
  },
  extraReducers: (builder) => {
    // generate
    builder.addCase(generateStrategy.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.generatedStrategy = null;
    });
    builder.addCase(generateStrategy.fulfilled, (state, action) => {
      state.loading = false;
      state.generatedStrategy = action.payload;
    });
    builder.addCase(generateStrategy.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as StrategyGeneratorError;
    });
    
    // create
    builder.addCase(createStrategy.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.createdStrategy = null;
    });
    builder.addCase(createStrategy.fulfilled, (state, action) => {
      state.loading = false;
      state.createdStrategy = action.payload;
    });
    builder.addCase(createStrategy.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as StrategyGeneratorError;
    });
  },
});

export const { reset, clearError, addToHistory } = strategyGeneratorSlice.actions;
export default strategyGeneratorSlice.reducer;
```

---

## 6. 数据格式示例

### 6.1 完整的请求示例

#### 6.1.1 生成策略请求

```json
{
  "userInput": "创建一个MA交叉策略，使用MA5和MA20两条移动平均线。当MA5从下向上穿越MA20时，产生买入信号；当MA5从上向下穿越MA20时，产生卖出信号。策略支持双向持仓，默认买入手续费0.1%，卖出手续费0.1%。"
}
```

#### 6.1.2 创建策略请求

```json
{
  "userInput": "创建一个RSI超买超卖策略。当RSI指标低于30时产生买入信号，当RSI指标高于70时产生卖出信号。RSI计算周期为14天。策略仅支持做多持仓。",
  "strategyName": "AI_RSI_Strategy",
  "description": "基于RSI指标的超买超卖策略，适用于震荡行情"
}
```

### 6.2 成功响应示例

#### 6.2.1 生成策略响应

```json
{
  "success": true,
  "generatedStrategy": {
    "name": "MA交叉策略",
    "description": "基于MA5和MA20移动平均线交叉的交易策略",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": null,
    "stopLossRatio": null,
    "indicatorNews": [
      {
        "name": "MA5",
        "description": "5日移动平均线",
        "code": "function calculate(priceData, parameters) { const period = parameters.period || 5; const result = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push(null); } else { let sum = new BigNumber(0); for (let j = 0; j < period; j++) { sum = sum.plus(new BigNumber(priceData[i - j].closePrice)); } result.push(sum.dividedBy(period).toNumber()); } } return result; }",
        "parameters": [
          {
            "name": "period",
            "description": "计算周期",
            "paramType": "number",
            "defaultValue": "5"
          }
        ]
      },
      {
        "name": "MA20",
        "description": "20日移动平均线",
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
    ],
    "indicators": [
      {
        "indicatorNewsIndex": 0,
        "parameters": [
          {
            "name": "period",
            "value": "5"
          }
        ]
      },
      {
        "indicatorNewsIndex": 1,
        "parameters": [
          {
            "name": "period",
            "value": "20"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "currentValuePath": "current",
        "comparedValuePath": "current",
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "group": 1,
        "priority": 1,
        "customCode": "// MA5上穿MA20买入"
      },
      {
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "currentValuePath": "current",
        "comparedValuePath": "current",
        "operator": "<",
        "conditionType": "crossover",
        "action": "sell",
        "group": 1,
        "priority": 2,
        "customCode": "// MA5下穿MA20卖出"
      }
    ]
  }
}
```

#### 6.2.2 创建策略响应

```json
{
  "success": true,
  "strategy": {
    "id": 1,
    "name": "AI_RSI_Strategy",
    "description": "基于RSI指标的超买超卖策略，适用于震荡行情",
    "positionType": "long",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": null,
    "stopLossRatio": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "aiGeneratedData": {
    "name": "RSI超买超卖策略",
    "description": "基于RSI指标的超买超卖交易策略",
    "positionType": "long",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": null,
    "stopLossRatio": null,
    "indicatorNews": [
      {
        "name": "RSI",
        "description": "相对强弱指标",
        "code": "function calculate(priceData, parameters) { ... }",
        "parameters": [
          {
            "name": "period",
            "description": "计算周期",
            "paramType": "number",
            "defaultValue": "14"
          }
        ]
      }
    ],
    "indicators": [
      {
        "indicatorNewsIndex": 0,
        "parameters": [
          {
            "name": "period",
            "value": "14"
          }
        ]
      }
    ],
    "conditions": [
      {
        "indicatorIndex": 0,
        "comparisonType": "constant",
        "constantValue": "30",
        "currentValuePath": "current",
        "comparedValuePath": "current",
        "operator": "<",
        "conditionType": "value",
        "action": "buy",
        "group": 1,
        "priority": 1,
        "customCode": "// RSI低于30买入"
      },
      {
        "indicatorIndex": 0,
        "comparisonType": "constant",
        "constantValue": "70",
        "currentValuePath": "current",
        "comparedValuePath": "current",
        "operator": ">",
        "conditionType": "value",
        "action": "sell",
        "group": 1,
        "priority": 2,
        "customCode": "// RSI高于70卖出"
      }
    ]
  },
  "createdIndicators": [
    {
      "id": 1,
      "name": "RSI",
      "description": "相对强弱指标",
      "calculationCode": "function calculate(priceData, parameters) { ... }",
      "parameters": [
        {
          "id": 1,
          "name": "period",
          "description": "计算周期",
          "paramType": "number",
          "defaultValue": "14"
        }
      ]
    }
  ]
}
```

### 6.3 错误响应示例

#### 6.3.1 输入为空

```json
{
  "statusCode": 400,
  "message": "用户输入不能为空",
  "error": "Bad Request"
}
```

#### 6.3.2 输入过长

```json
{
  "statusCode": 400,
  "message": "输入内容过长，请控制在5000字符以内",
  "error": "Bad Request"
}
```

#### 6.3.3 名称格式错误

```json
{
  "statusCode": 400,
  "message": "策略名称格式不正确，只能包含字母、数字、下划线和中文，且不能以数字开头",
  "error": "Bad Request"
}
```

#### 6.3.4 名称已存在

```json
{
  "statusCode": 409,
  "message": "策略名称 'AI_RSI_Strategy' 已存在，请使用其他名称",
  "error": "Conflict"
}
```

#### 6.3.5 代码安全验证失败

```json
{
  "statusCode": 400,
  "message": "策略代码安全验证失败: 代码包含不安全的操作: eval",
  "error": "Bad Request"
}
```

#### 6.3.6 AI调用失败

```json
{
  "statusCode": 500,
  "message": "AI调用失败: 网络超时",
  "error": "Internal Server Error"
}
```

---

## 7. 性能与安全要求

### 7.1 接口响应时间要求

| 操作 | 期望响应时间 | 最大响应时间 | 说明 |
|------|-------------|-------------|------|
| 输入验证 | < 10ms | 50ms | 前端本地验证 |
| 生成策略 | < 30s | 60s | 包含AI调用时间 |
| 创建策略 | < 35s | 70s | 包含AI调用和数据库操作 |

### 7.2 数据传输安全措施

```
┌─────────────────────────────────────────────────────────────────┐
│                      安全措施架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  传输层安全                                                      │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ • HTTPS 加密传输                                     │       │
│  │ • TLS 1.2+ 协议                                      │       │
│  │ • 证书验证                                           │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  应用层安全                                                      │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ • 输入验证和过滤                                     │       │
│  │ • XSS 防护                                          │       │
│  │ • SQL 注入防护                                       │       │
│  │ • CSRF Token (如需要)                               │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
│  代码安全                                                        │
│  ┌─────────────────────────────────────────────────────┐       │
│  │ • 危险代码检测                                       │       │
│  │ • eval/Function 禁用                                 │       │
│  │ • 文件系统访问禁止                                   │       │
│  │ • 进程操作禁止                                       │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 身份验证与授权机制

#### 7.3.1 认证流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  前端    │────►│  后端    │────►│  数据库  │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │  1. 登录请求    │                │
     │ ──────────────►│                │
     │                │  2. 验证凭证    │
     │                │ ──────────────►│
     │                │                │
     │                │  3. 返回用户    │
     │                │ ◄──────────────│
     │                │                │
     │  4. 返回Token  │                │
     │ ◄──────────────│                │
     │                │                │
     │  5. 携带Token请求               │
     │ ──────────────►│                │
     │                │  6. 验证Token  │
     │                │                │
     │  7. 返回数据   │                │
     │ ◄──────────────│                │
```

#### 7.3.2 Token 使用示例

```typescript
// api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 70000,
});

// 请求拦截器 - 添加Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理认证错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，跳转登录
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 8. 测试用例

### 8.1 功能测试用例

| 用例ID | 测试场景 | 输入 | 预期结果 |
|--------|---------|------|---------|
| TC001 | 正常生成策略 | 有效的策略描述 | 返回生成的策略JSON |
| TC002 | 正常创建策略 | 有效输入 + 策略名称 | 创建成功，返回策略ID |
| TC003 | 不提供策略名称 | 有效输入，无名称 | 使用默认名称创建 |
| TC004 | 提供策略描述 | 有效输入 + 描述 | 使用提供的描述创建 |
| TC005 | 复杂策略描述 | 多指标组合描述 | 正确解析并创建 |

### 8.2 边界条件测试用例

| 用例ID | 测试场景 | 输入 | 预期结果 |
|--------|---------|------|---------|
| TC101 | 输入长度为1 | 单字符 | 正常处理 |
| TC102 | 输入长度为5000 | 5000字符 | 正常处理 |
| TC103 | 输入长度超过5000 | 5001字符 | 返回400错误 |
| TC104 | 空输入 | 空字符串 | 返回400错误 |
| TC105 | 仅空格输入 | 多个空格 | 返回400错误 |
| TC106 | 名称长度边界 | 1字符名称 | 正常处理 |
| TC107 | 名称包含中文 | 中文策略名 | 正常处理 |
| TC108 | 名称以数字开头 | "123Strategy" | 返回400错误 |

### 8.3 错误处理测试用例

| 用例ID | 测试场景 | 输入/条件 | 预期结果 |
|--------|---------|----------|---------|
| TC201 | 重复策略名称 | 已存在的名称 | 返回409错误 |
| TC202 | 网络超时 | 模拟网络延迟 | 返回500错误 |
| TC203 | AI服务不可用 | 模拟AI服务故障 | 返回500错误 |
| TC204 | 数据库连接失败 | 模拟数据库故障 | 返回500错误 |
| TC205 | 无效JSON响应 | AI返回非JSON | 返回500错误 |
| TC206 | 危险代码检测 | 包含eval的代码 | 返回400错误 |

### 8.4 测试代码示例

```typescript
// __tests__/strategyGenerator.test.ts
import { strategyGeneratorApi, StrategyGeneratorError } from '../api/strategyGenerator';

// Mock axios
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StrategyGenerator API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate strategy successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          generatedStrategy: {
            name: 'Test Strategy',
            description: 'Test Description',
            positionType: 'both',
            indicatorNews: [],
            indicators: [],
            conditions: [],
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await strategyGeneratorApi.generate('test input');
      
      expect(result.name).toBe('Test Strategy');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/generate'),
        { userInput: 'test input' }
      );
    });

    it('should throw error for empty input', async () => {
      const mockError = {
        response: {
          data: {
            statusCode: 400,
            message: '用户输入不能为空',
            error: 'Bad Request',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(strategyGeneratorApi.generate(''))
        .rejects.toThrow(StrategyGeneratorError);
    });
  });

  describe('create', () => {
    it('should create strategy with default name', async () => {
      const mockResponse = {
        data: {
          success: true,
          strategy: {
            id: 1,
            name: 'AI_Strategy_1234567890',
            description: 'Test',
          },
          aiGeneratedData: {},
          createdIndicators: [],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await strategyGeneratorApi.create('test input');
      
      expect(result.strategy.id).toBe(1);
    });

    it('should throw conflict error for duplicate name', async () => {
      const mockError = {
        response: {
          data: {
            statusCode: 409,
            message: "策略名称 'Test' 已存在",
            error: 'Conflict',
          },
        },
      };

      mockedAxios.post.mockRejectedValue(mockError);

      await expect(strategyGeneratorApi.create('test', 'Test'))
        .rejects.toThrow('策略名称');
    });
  });
});
```

---

## 9. 常见问题与解决方案

### 9.1 常见问题列表

| 问题ID | 问题描述 | 原因分析 | 解决方案 |
|--------|---------|---------|---------|
| FAQ001 | 生成时间过长 | AI调用耗时 | 显示加载动画，设置超时提示 |
| FAQ002 | 生成结果不符合预期 | 描述不够清晰 | 提供描述模板和示例 |
| FAQ003 | 策略名称冲突 | 名称已存在 | 自动生成唯一名称或提示用户 |
| FAQ004 | 网络请求失败 | 网络不稳定 | 实现重试机制 |
| FAQ005 | Token过期 | 登录状态失效 | 自动刷新Token或跳转登录 |

### 9.2 详细解决方案

#### FAQ001: 生成时间过长

**问题描述**: AI生成策略需要较长时间，用户可能误以为系统卡死。

**解决方案**:

```typescript
// components/StrategyGenerator.tsx
import { useState, useEffect } from 'react';

export function StrategyGenerator() {
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (loading) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 70000);
      });
      
      const result = await Promise.race([
        strategyGeneratorApi.generate(userInput),
        timeoutPromise,
      ]);
      
      // 处理结果
    } catch (error) {
      // 处理错误
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading && (
        <div className="loading-indicator">
          <Spinner />
          <p>正在生成策略，预计需要 20-30 秒...</p>
          <p>已等待: {elapsedTime} 秒</p>
          {elapsedTime > 30 && (
            <p className="warning">生成时间较长，请耐心等待</p>
          )}
        </div>
      )}
    </div>
  );
}
```

#### FAQ002: 生成结果不符合预期

**问题描述**: 用户描述不够清晰，导致AI生成的策略与预期不符。

**解决方案**: 提供描述模板和示例

```typescript
// constants/templates.ts
export const STRATEGY_TEMPLATES = [
  {
    name: 'MA交叉策略',
    template: '创建一个MA交叉策略，使用MA{fastPeriod}和MA{slowPeriod}两条移动平均线。当快线从下向上穿越慢线时买入，从上向下穿越慢线时卖出。',
    example: '创建一个MA交叉策略，使用MA5和MA20两条移动平均线。当MA5从下向上穿越MA20时买入，从上向下穿越MA20时卖出。',
  },
  {
    name: 'RSI策略',
    template: '创建一个RSI策略，周期为{period}天。当RSI低于{oversold}时买入，高于{overbought}时卖出。',
    example: '创建一个RSI策略，周期为14天。当RSI低于30时买入，高于70时卖出。',
  },
  {
    name: '布林带策略',
    template: '创建一个布林带策略，周期为{period}天，标准差倍数为{stdDev}。当价格触及下轨时买入，触及上轨时卖出。',
    example: '创建一个布林带策略，周期为20天，标准差倍数为2。当价格触及下轨时买入，触及上轨时卖出。',
  },
];

// components/TemplateSelector.tsx
export function TemplateSelector({ onSelect }) {
  return (
    <div className="template-selector">
      <h4>策略模板</h4>
      {STRATEGY_TEMPLATES.map((template) => (
        <div key={template.name} className="template-item">
          <h5>{template.name}</h5>
          <p className="example">{template.example}</p>
          <button onClick={() => onSelect(template.example)}>
            使用此模板
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### FAQ004: 网络请求失败

**问题描述**: 网络不稳定导致请求失败。

**解决方案**: 实现重试机制

```typescript
// utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // 不重试的错误类型
      if (error instanceof StrategyGeneratorError) {
        if ([400, 409].includes(error.statusCode)) {
          throw error;
        }
      }
      
      // 等待后重试
      if (i < maxRetries - 1) {
        const waitTime = backoff ? delay * Math.pow(2, i) : delay;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// 使用示例
const result = await withRetry(
  () => strategyGeneratorApi.generate(userInput),
  { maxRetries: 3, delay: 1000 }
);
```

---

## 附录

### A. 完整代码示例

完整的前端集成代码示例可在以下位置找到：

- React 示例: `examples/react-strategy-generator/`
- Vue 示例: `examples/vue-strategy-generator/`

### B. 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0.0 | 2024-01-15 | 初始版本 |
| 1.1.0 | 2024-01-20 | 添加输入验证和安全检查 |
| 1.2.0 | 2024-01-25 | 添加策略名称唯一性检查 |

### C. 联系方式

如有问题，请联系技术支持：

- 邮箱: support@example.com
- 文档: https://docs.example.com
- Issue: https://github.com/example/crypto-quant-platform/issues
