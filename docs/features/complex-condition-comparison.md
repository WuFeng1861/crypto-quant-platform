# 复杂对象条件比较功能

## 📋 功能概述

为了支持复杂指标对象的属性比较（如 MACD 的 `macd`、`signal`、`histogram` 属性），我们在策略条件中添加了属性路径支持。

## 🎯 核心功能

### **1. 属性路径支持**
- **currentValuePath**: 指定从当前指标值中提取哪个属性
- **comparedValuePath**: 指定从比较指标值中提取哪个属性
- **路径格式**: 使用点分隔符支持深层属性访问，如 `macd.signal` 或 `bollinger.upper`

### **2. 智能值提取**
- 如果未指定路径，直接使用指标值本身
- 支持多层嵌套对象属性访问
- 自动处理 null/undefined 值

## 🔧 使用示例

### **示例 1: MACD 金叉死叉**
```javascript
/* MACD 指标返回对象结构 */
{
  macd: 0.123,
  signal: 0.098,
  histogram: 0.025
}

/* 条件配置：MACD 线上穿信号线 */
{
  indicatorIndex: 0,              // MACD 指标索引
  comparisonType: 'indicator',    // 与另一个指标比较
  comparedIndicatorIndex: 0,      // 同一个 MACD 指标
  currentValuePath: 'macd',       // 当前值使用 MACD 线
  comparedValuePath: 'signal',    // 比较值使用信号线
  conditionType: 'crossover',     // 交叉条件
  operator: '>',                  // 上穿
  action: 'buy'                   // 买入信号
}
```

### **示例 2: 布林带突破**
```javascript
/* 布林带指标返回对象结构 */
{
  upper: 105.23,
  middle: 100.00,
  lower: 94.77
}

/* 条件配置：价格突破布林带上轨 */
{
  indicatorIndex: 0,              // 价格指标（SMA）
  comparisonType: 'indicator',    // 与布林带比较
  comparedIndicatorIndex: 1,      // 布林带指标索引
  currentValuePath: null,         // 价格直接使用数值
  comparedValuePath: 'upper',     // 比较布林带上轨
  conditionType: 'value',         // 值比较
  operator: '>',                  // 大于
  action: 'buy'                   // 买入信号
}
```

### **示例 3: KDJ 超买超卖**
```javascript
/* KDJ 指标返回对象结构 */
{
  k: 85.6,
  d: 82.3,
  j: 92.2
}

/* 条件配置：J 值超买 */
{
  indicatorIndex: 0,              // KDJ 指标索引
  comparisonType: 'constant',     // 与常量比较
  constantValue: '80',            // 超买阈值
  currentValuePath: 'j',          // 使用 J 值
  comparedValuePath: null,        // 常量比较不需要
  conditionType: 'value',         // 值比较
  operator: '>',                  // 大于
  action: 'sell'                  // 卖出信号
}
```

## 🏗️ 技术实现

### **1. 数据库结构**
```sql
ALTER TABLE strategy_conditions 
ADD COLUMN current_value_path VARCHAR(255) NULL;

ALTER TABLE strategy_conditions 
ADD COLUMN compared_value_path VARCHAR(255) NULL;
```

### **2. 属性提取算法**
```typescript
private extractValueByPath(obj: any, path?: string): any {
  /* 如果没有指定路径，直接返回对象本身 */
  if (!path || path.trim() === '') {
    return obj;
  }

  /* 按点分隔路径，逐层访问对象属性 */
  const pathParts = path.split('.');
  let result = obj;

  for (const part of pathParts) {
    if (result == null || typeof result !== 'object') {
      return null;
    }
    result = result[part];
  }

  return result;
}
```

## 📊 支持的指标对象

| 指标 | 对象结构 | 常用路径 |
|------|----------|----------|
| **MACD** | `{macd, signal, histogram}` | `macd`, `signal`, `histogram` |
| **布林带** | `{upper, middle, lower}` | `upper`, `middle`, `lower` |
| **KDJ** | `{k, d, j}` | `k`, `d`, `j` |
| **RSI** | `number` | 无需路径 |
| **SMA/EMA** | `number` | 无需路径 |
| **ATR** | `number` | 无需路径 |

## 🎯 最佳实践

### **1. 路径命名**
- 使用清晰的属性名称
- 遵循指标的标准命名约定
- 避免过深的嵌套路径

### **2. 错误处理**
- 系统自动处理不存在的属性路径
- 返回 null 值时条件判断为 false
- 建议在策略测试时验证路径正确性

### **3. 性能考虑**
- 属性路径解析有轻微性能开销
- 对于简单数值指标，无需指定路径
- 复杂条件建议进行充分的回测验证

## 🚀 使用流程

1. **创建策略时**指定指标和条件
2. **配置属性路径**指定要比较的对象属性
3. **运行回测**验证条件逻辑正确性
4. **优化参数**根据回测结果调整条件

这个功能大大增强了策略条件的灵活性，支持各种复杂的技术分析场景！