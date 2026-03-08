---
name: "ai-strategy-generator"
description: "根据自然语言描述生成AI量化交易策略和指标。当用户想要创建新策略或用自然语言描述交易逻辑时调用。"
---

# AI策略生成器

此技能帮助用户生成完整的交易策略和自定义指标，并写入数据库。

## 触发条件

- 用户想要创建新的交易策略
- 用户用自然语言描述交易策略逻辑
- 用户要求生成指标和策略
- 用户提到"创建策略"、"生成策略"、"AI策略"等关键词

## 工作流程

```
收集需求 → AI生成JSON → 校验并创建指标 → 用户确认 → 创建策略
```

### 第一步：收集策略需求

向用户询问以下信息：

1. **策略描述**（必填）：交易逻辑的自然语言描述
   - 示例："创建一个MA交叉策略，使用MA5和MA20，MA5上穿MA20时买入，下穿时卖出"

2. **策略名称**（可选）：策略的自定义名称
   - 格式：只能包含字母、数字、下划线和中文字符
   - 不能以数字开头
   - 如未提供，将自动生成：`AI_Strategy_{时间戳}`

3. **附加选项**（可选）：
   - 持仓类型：`long`（做多）、`short`（做空）或 `both`（双向）
   - 止盈比例：如 15% 表示 0.15
   - 止损比例：如 8% 表示 0.08

### 第二步：生成策略JSON

根据用户需求，生成完整的策略JSON，包含：

#### 策略基础信息
```json
{
  "name": "策略名称",
  "description": "策略描述",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 90,
  "takeProfitRatio": null,
  "stopLossRatio": null
}
```

#### 指标定义（indicatorNews）
为每个需要的指标生成定义：

```json
{
  "name": "AI_MA_5",
  "description": "[AI生成] 5日移动平均线",
  "calculationCode": "function calculate(priceData, parameters) { ... }",
  "parameters": [
    {
      "name": "period",
      "description": "计算周期",
      "paramType": "number",
      "defaultValue": "5"
    }
  ]
}
```

#### 指标配置（indicators）
引用指标定义并设置参数：

```json
{
  "indicatorNewsIndex": 0,
  "parameters": [
    { "name": "period", "value": "5" }
  ]
}
```

#### 交易条件（conditions）
定义买入卖出规则：

```json
{
  "indicatorIndex": 0,
  "comparisonType": "indicator",
  "comparedIndicatorIndex": 1,
  "currentValuePath": "",
  "comparedValuePath": "",
  "operator": ">",
  "conditionType": "crossover",
  "action": "buy",
  "group": 1,
  "priority": 1,
  "customCode": ""
}
```

### 第三步：数据校验

生成JSON后，执行以下校验：

#### 必填字段检查
- `name`：不能为空
- `indicatorNews`：数组不能为空
- `indicators`：数组不能为空
- `conditions`：数组不能为空

#### 指标校验
- `name`：非空字符串，必须以 "AI_" 开头
- `calculationCode`：非空字符串，有效的JavaScript函数
- `parameters`：数组，每个参数有 `name` 和 `paramType`

#### 条件校验
- `indicatorIndex`：必填
- `comparisonType`：必须是 "indicator" 或 "constant"
- `operator`：必须是 `>`、`>=`、`==`、`!=`、`<`、`<=` 之一
- `conditionType`：必须是 "value" 或 "crossover"
- `action`：必须是 "buy"、"sell" 或 "none"

#### 代码安全校验
检查指标代码中不能包含：
- `eval(`、`Function(`、`require(`、`import `
- `process.`、`fs.`、`child_process`
- `exec(`、`spawn(`

### 第四步：展示生成的策略

向用户展示生成的策略JSON摘要：

> **📋 策略JSON生成完成！**
> 
> **策略名称**：{name}
> **描述**：{description}
> **持仓类型**：{positionType}
> **止盈**：{takeProfitRatio}
> **止损**：{stopLossRatio}
>
> **📊 将创建的指标：**
> 1. {指标1名称}：{描述}
> 2. {指标2名称}：{描述}
>
> **🎯 交易条件：**
> 1. {买入条件描述}
> 2. {卖出条件描述}
>
> **是否继续校验并创建指标？** (是/否)

### 第五步：校验并创建指标

调用 `validate-and-save` 端点，系统会：
1. 验证策略数据完整性
2. 验证指标代码安全性
3. **创建指标到数据库**
4. 返回带指标ID的策略配置

```
POST http://localhost:3099/ai-strategy-generator/validate-and-save
Content-Type: application/json

{
  "strategy": {
    "name": "策略名称",
    "description": "策略描述",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "liquidationThreshold": 90,
    "takeProfitRatio": null,
    "stopLossRatio": null,
    "indicatorNews": [
      {
        "name": "AI_MA_5",
        "description": "[AI生成] 5日移动平均线",
        "code": "function calculate(priceData, parameters) { ... }",
        "parameters": [
          { "name": "period", "description": "计算周期", "paramType": "number", "defaultValue": "5" }
        ]
      }
    ],
    "indicators": [
      {
        "indicatorNewsIndex": 0,
        "parameters": [{ "name": "period", "value": "5" }]
      }
    ],
    "conditions": [
      {
        "indicatorIndex": 0,
        "comparisonType": "indicator",
        "comparedIndicatorIndex": 1,
        "currentValuePath": "",
        "comparedValuePath": "",
        "operator": ">",
        "conditionType": "crossover",
        "action": "buy",
        "group": 1,
        "priority": 1,
        "customCode": ""
      }
    ]
  }
}
```

**返回结果：**
```json
{
  "success": true,
  "generatedStrategy": {
    "name": "策略名称",
    "description": "策略描述",
    "positionType": "both",
    "indicators": [
      {
        "id": 1,
        "name": "AI_MA_5",
        "parameters": [{ "id": 1, "name": "period", "value": "5" }]
      }
    ],
    "conditions": [...]
  },
  "createdIndicators": [...]
}
```

### 第六步：用户确认

向用户展示校验结果：

> **✅ 指标已创建成功！**
> 
> **创建的指标：**
> - {指标1名称} (ID: {id})
> - {指标2名称} (ID: {id})
>
> **策略配置：**
> - 策略名称：{name}
> - 持仓类型：{positionType}
> - 止盈/止损：{takeProfitRatio} / {stopLossRatio}
>
> **是否创建策略？** (是/否)

### 第七步：创建策略

用户确认后，使用返回的 `generatedStrategy` 调用策略创建接口：

```
POST http://localhost:3099/strategies
Content-Type: application/json

{
  "name": "从 generatedStrategy.name 获取",
  "description": "从 generatedStrategy.description 获取",
  "positionType": "从 generatedStrategy.positionType 获取",
  "buyFee": "从 generatedStrategy.buyFee 获取",
  "sellFee": "从 generatedStrategy.sellFee 获取",
  "liquidationThreshold": "从 generatedStrategy.liquidationThreshold 获取",
  "takeProfitRatio": "从 generatedStrategy.takeProfitRatio 获取",
  "stopLossRatio": "从 generatedStrategy.stopLossRatio 获取",
  "indicators": [
    {
      "indicatorId": "从 generatedStrategy.indicators[x].id 获取",
      "priority": 1,
      "parameters": [
        {
          "parameterId": "从 generatedStrategy.indicators[x].parameters[y].id 获取",
          "value": "从 generatedStrategy.indicators[x].parameters[y].value 获取"
        }
      ]
    }
  ],
  "conditions": "从 generatedStrategy.conditions 获取"
}
```

**重要：数据映射关系**

| generatedStrategy 字段 | strategies 请求字段 |
|------------------------|---------------------|
| `indicators[x].id` | `indicators[x].indicatorId` |
| `indicators[x].parameters[y].id` | `indicators[x].parameters[y].parameterId` |
| `indicators[x].parameters[y].value` | `indicators[x].parameters[y].value` |
| `conditions` | `conditions` (直接使用) |

## 指标代码编写规范

### 函数签名
```javascript
function calculate(priceData, parameters) {
  // priceData: 价格数据数组
  // parameters: 参数对象
  // 返回: 计算结果数组
}
```

### priceData 结构
```javascript
[
  {
    timestamp: 1640995200000,
    openPrice: 47000.50,
    highPrice: 47500.00,
    lowPrice: 46800.00,
    closePrice: 47200.25,
    volume: 1250.75
  }
]
```

### 使用 BigNumber
所有浮点运算必须使用 BigNumber：
```javascript
let sum = new BigNumber(0);
sum = sum.plus(new BigNumber(priceData[i].closePrice));
result.push(sum.dividedBy(period).toNumber());
```

### 常用指标代码模板

#### MA（移动平均线）
```javascript
function calculate(priceData, parameters) {
  const period = parameters.period || 20;
  const result = [];
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = new BigNumber(0);
      for (let j = 0; j < period; j++) {
        sum = sum.plus(new BigNumber(priceData[i - j].closePrice));
      }
      result.push(sum.dividedBy(period).toNumber());
    }
  }
  return result;
}
```

#### EMA（指数移动平均线）
```javascript
function calculate(priceData, parameters) {
  const period = parameters.period || 20;
  const multiplier = new BigNumber(2).dividedBy(period + 1);
  const result = [];
  let ema = null;
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = new BigNumber(0);
      for (let j = 0; j < period; j++) {
        sum = sum.plus(new BigNumber(priceData[i - j].closePrice));
      }
      ema = sum.dividedBy(period);
      result.push(ema.toNumber());
    } else {
      const close = new BigNumber(priceData[i].closePrice);
      ema = close.multipliedBy(multiplier).plus(ema.multipliedBy(new BigNumber(1).minus(multiplier)));
      result.push(ema.toNumber());
    }
  }
  return result;
}
```

#### RSI（相对强弱指标）
```javascript
function calculate(priceData, parameters) {
  const period = parameters.period || 14;
  const result = [];
  let gains = new BigNumber(0);
  let losses = new BigNumber(0);
  
  for (let i = 0; i < priceData.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    
    const change = new BigNumber(priceData[i].closePrice).minus(new BigNumber(priceData[i - 1].closePrice));
    
    if (i < period) {
      if (change.isGreaterThanOrEqualTo(0)) {
        gains = gains.plus(change);
      } else {
        losses = losses.plus(change.abs());
      }
      result.push(null);
    } else if (i === period) {
      if (change.isGreaterThanOrEqualTo(0)) {
        gains = gains.plus(change);
      } else {
        losses = losses.plus(change.abs());
      }
      const avgGain = gains.dividedBy(period);
      const avgLoss = losses.dividedBy(period);
      const rs = avgGain.dividedBy(avgLoss);
      const rsi = new BigNumber(100).minus(new BigNumber(100).dividedBy(rs.plus(1)));
      result.push(rsi.toNumber());
    } else {
      const newGain = change.isGreaterThanOrEqualTo(0) ? change : new BigNumber(0);
      const newLoss = change.isLessThan(0) ? change.abs() : new BigNumber(0);
      gains = gains.multipliedBy(period - 1).plus(newGain).dividedBy(period);
      losses = losses.multipliedBy(period - 1).plus(newLoss).dividedBy(period);
      const rs = gains.dividedBy(losses);
      const rsi = new BigNumber(100).minus(new BigNumber(100).dividedBy(rs.plus(1)));
      result.push(rsi.toNumber());
    }
  }
  return result;
}
```

## 条件类型详解

### value - 数值比较
当指标值满足比较条件时触发：

| 场景 | 配置 |
|------|------|
| RSI < 30 买入 | `comparisonType: "constant"`, `constantValue: "30"`, `operator: "<"` |
| RSI > 70 卖出 | `comparisonType: "constant"`, `constantValue: "70"`, `operator: ">"` |
| 价格 > MA | `comparisonType: "indicator"`, `comparedIndicatorIndex: 1`, `operator: ">"` |

### crossover - 穿越检测
检测一条线是否穿越另一条线：

| 场景 | 配置 |
|------|------|
| MA5 上穿 MA20 | `operator: ">"`, `conditionType: "crossover"` |
| MA5 下穿 MA20 | `operator: "<"`, `conditionType: "crossover"` |

**穿越判断规则：**
- `operator: ">"` 表示上穿（前一根 ≤ 被比较值，当前 > 被比较值）
- `operator: "<"` 表示下穿（前一根 ≥ 被比较值，当前 < 被比较值）

### 条件组合逻辑
- **同组条件**（group 相同）：AND 逻辑，必须全部满足
- **不同组条件**（group 不同）：OR 逻辑，满足任一组即可

## 多轨指标处理

对于返回对象的指标（如MACD），使用 `currentValuePath` 和 `comparedValuePath`：

```json
{
  "indicatorIndex": 0,
  "comparisonType": "indicator",
  "comparedIndicatorIndex": 0,
  "currentValuePath": "macd",
  "comparedValuePath": "signal",
  "operator": ">",
  "conditionType": "crossover",
  "action": "buy"
}
```

## 自定义代码条件

对于复杂逻辑，使用 `customCode`：

```json
{
  "customCode": "const history = getHistoricalData(index - 20, index - 1); return current.closePrice > Math.max(...history.map(k => k.highPrice));"
}
```

**可用变量：**
- `indicatorValues`：所有指标结果数组
- `index`：当前K线索引
- `priceData`：完整价格数据数组
- `current`：当前K线数据
- `previous`：前一根K线数据
- `BigNumber`：BigNumber类
- `Math`：Math对象

**可用辅助函数：**
- `average(arr)`：计算平均值
- `standardDeviation(arr)`：计算标准差
- `getHistoricalData(start, end)`：获取历史价格数据
- `getIndicatorHistoricalData(idx, start, end)`：获取历史指标数据

## 使用示例

**用户输入：**
> 创建一个RSI策略，周期14，低于30买入，高于70卖出，只做多，止盈10%，止损5%

**完整流程：**

**步骤1-2：AI生成策略JSON**
```json
{
  "name": "RSI超买超卖策略",
  "description": "基于RSI指标的超买超卖交易策略",
  "positionType": "long",
  "takeProfitRatio": 0.10,
  "stopLossRatio": 0.05,
  "indicatorNews": [
    {
      "name": "AI_RSI_14",
      "description": "[AI生成] 14周期相对强弱指标",
      "code": "function calculate(priceData, parameters) { ... }",
      "parameters": [
        { "name": "period", "description": "计算周期", "paramType": "number", "defaultValue": "14" }
      ]
    }
  ],
  "indicators": [
    { "indicatorNewsIndex": 0, "parameters": [{ "name": "period", "value": "14" }] }
  ],
  "conditions": [
    { "indicatorIndex": 0, "comparisonType": "constant", "constantValue": "30", "operator": "<", "conditionType": "value", "action": "buy", "group": 1, "priority": 1 },
    { "indicatorIndex": 0, "comparisonType": "constant", "constantValue": "70", "operator": ">", "conditionType": "value", "action": "sell", "group": 1, "priority": 1 }
  ]
}
```

**步骤5：调用 validate-and-save**
```
POST /ai-strategy-generator/validate-and-save
{ "strategy": { ... 上面的JSON ... } }
```

**返回结果：**
```json
{
  "success": true,
  "generatedStrategy": {
    "name": "RSI超买超卖策略",
    "indicators": [{ "id": 1, "name": "AI_RSI_14", "parameters": [{ "id": 1, "name": "period", "value": "14" }] }],
    "conditions": [...]
  }
}
```

**步骤7：创建策略**
```
POST /strategies
{
  "name": "RSI超买超卖策略",
  "description": "基于RSI指标的超买超卖交易策略",
  "positionType": "long",
  "takeProfitRatio": 0.10,
  "stopLossRatio": 0.05,
  "indicators": [
    { "indicatorId": 1, "priority": 1, "parameters": [{ "parameterId": 1, "value": "14" }] }
  ],
  "conditions": [...]
}
```

## 错误处理

- 指标名称已存在：提示用户更换名称
- 策略名称已存在：提示用户更换名称
- 校验失败：显示具体错误信息
- API调用失败：显示错误原因

## 默认值

| 字段 | 默认值 |
|------|--------|
| positionType | "both" |
| buyFee | 0.001 |
| sellFee | 0.001 |
| liquidationThreshold | 90 |
| takeProfitRatio | null |
| stopLossRatio | null |
| group | 1 |
| priority | 0 |
| currentValuePath | "" |
| comparedValuePath | "" |
| customCode | "" |
