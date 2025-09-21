# BigNumber.js 集成说明

## 📋 功能概述

为了确保金融计算的精度，我们在 `executor.js` 和 `process-executor.service.ts` 中集成了 BigNumber.js 库。这使得所有指标计算脚本都可以使用高精度数值计算，避免 JavaScript 浮点数精度问题。

## 🎯 可用的全局对象

在工作脚本的沙箱环境中，您可以直接使用以下对象：

### BigNumber 类
```javascript
// 创建 BigNumber 实例
const price = new BigNumber('47123.456789');
const volume = new BigNumber(1250.75);

// 高精度计算
const total = price.multipliedBy(volume);
const average = total.dividedBy(2);
```

### 数学工具
```javascript
// 标准 Math 对象
Math.max(1, 2, 3);
Math.min(1, 2, 3);
Math.abs(-5);
Math.sqrt(16);

// 类型检查函数
isNaN(value);
isFinite(value);
parseFloat(string);
parseInt(string);
```

### 数组和对象工具
```javascript
// 数组操作
Array.isArray(data);
const newArray = Array.from(data);

// 对象操作
Object.keys(obj);
Object.values(obj);
Object.entries(obj);
```

## 🔧 使用示例

### 1. 简单移动平均线 (SMA) 计算

```javascript
function calculate(priceData, parameters) {
  const period = parseInt(parameters.period) || 20;
  const result = [];
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    // 使用 BigNumber 进行高精度计算
    let sum = new BigNumber(0);
    for (let j = i - period + 1; j <= i; j++) {
      sum = sum.plus(new BigNumber(priceData[j].close));
    }
    
    const average = sum.dividedBy(period);
    result.push(average.toNumber());
  }
  
  return result;
}
```

### 2. 相对强弱指数 (RSI) 计算

```javascript
function calculate(priceData, parameters) {
  const period = parseInt(parameters.period) || 14;
  const result = [];
  
  // 计算价格变化
  const changes = [];
  for (let i = 1; i < priceData.length; i++) {
    const current = new BigNumber(priceData[i].close);
    const previous = new BigNumber(priceData[i - 1].close);
    changes.push(current.minus(previous));
  }
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }
    
    // 计算平均涨幅和跌幅
    let avgGain = new BigNumber(0);
    let avgLoss = new BigNumber(0);
    
    for (let j = i - period; j < i; j++) {
      const change = changes[j - 1];
      if (change.isPositive()) {
        avgGain = avgGain.plus(change);
      } else {
        avgLoss = avgLoss.plus(change.abs());
      }
    }
    
    avgGain = avgGain.dividedBy(period);
    avgLoss = avgLoss.dividedBy(period);
    
    // 计算 RSI
    if (avgLoss.isZero()) {
      result.push(100);
    } else {
      const rs = avgGain.dividedBy(avgLoss);
      const rsi = new BigNumber(100).minus(
        new BigNumber(100).dividedBy(rs.plus(1))
      );
      result.push(rsi.toNumber());
    }
  }
  
  return result;
}
```

### 3. 布林带 (Bollinger Bands) 计算

```javascript
function calculate(priceData, parameters) {
  const period = parseInt(parameters.period) || 20;
  const multiplier = new BigNumber(parameters.multiplier || 2);
  
  const result = {
    upper: [],
    middle: [],
    lower: []
  };
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.upper.push(null);
      result.middle.push(null);
      result.lower.push(null);
      continue;
    }
    
    // 计算移动平均线
    let sum = new BigNumber(0);
    const prices = [];
    
    for (let j = i - period + 1; j <= i; j++) {
      const price = new BigNumber(priceData[j].close);
      prices.push(price);
      sum = sum.plus(price);
    }
    
    const sma = sum.dividedBy(period);
    
    // 计算标准差
    let variance = new BigNumber(0);
    for (const price of prices) {
      const diff = price.minus(sma);
      variance = variance.plus(diff.multipliedBy(diff));
    }
    
    const stdDev = variance.dividedBy(period).sqrt();
    
    // 计算布林带
    const upper = sma.plus(stdDev.multipliedBy(multiplier));
    const lower = sma.minus(stdDev.multipliedBy(multiplier));
    
    result.upper.push(upper.toNumber());
    result.middle.push(sma.toNumber());
    result.lower.push(lower.toNumber());
  }
  
  return result;
}
```

## ⚠️ 注意事项

### 1. 性能考虑
- BigNumber 计算比原生数值计算慢，但提供更高精度
- 对于不需要高精度的简单计算，可以继续使用原生数值
- 在循环中创建大量 BigNumber 实例时要注意性能

### 2. 数据转换
```javascript
// 从字符串或数值创建 BigNumber
const bn1 = new BigNumber('123.456789');
const bn2 = new BigNumber(123.456789);

// 转换回数值（可能丢失精度）
const number = bn1.toNumber();

// 转换为字符串（保持精度）
const string = bn1.toString();
```

### 3. 比较操作
```javascript
const a = new BigNumber('0.1');
const b = new BigNumber('0.2');
const c = new BigNumber('0.3');

// 错误的比较方式
// if (a + b === c) // 这不会工作

// 正确的比较方式
if (a.plus(b).isEqualTo(c)) {
  console.log('相等');
}

// 其他比较方法
a.isGreaterThan(b);
a.isLessThan(b);
a.isGreaterThanOrEqualTo(b);
a.isLessThanOrEqualTo(b);
```

### 4. 常用方法
```javascript
const num = new BigNumber('123.456');

// 算术运算
num.plus(10);           // 加法
num.minus(10);          // 减法
num.multipliedBy(2);    // 乘法
num.dividedBy(2);       // 除法
num.modulo(10);         // 取模

// 数学函数
num.abs();              // 绝对值
num.sqrt();             // 平方根
num.pow(2);             // 幂运算

// 舍入
num.decimalPlaces(2);   // 保留2位小数
num.toFixed(2);         // 转为固定小数位字符串

// 状态检查
num.isPositive();       // 是否为正数
num.isNegative();       // 是否为负数
num.isZero();           // 是否为零
num.isNaN();            // 是否为 NaN
num.isFinite();         // 是否为有限数
```

## 🧪 测试示例

创建一个测试脚本来验证 BigNumber.js 集成：

```javascript
// test-bignumber-worker.js
function calculate(priceData, parameters) {
  console.log('Testing BigNumber integration...');
  
  // 测试基本运算
  const a = new BigNumber('0.1');
  const b = new BigNumber('0.2');
  const sum = a.plus(b);
  
  console.log('0.1 + 0.2 =', sum.toString()); // 应该输出 "0.3"
  
  // 测试与原生计算的差异
  const nativeSum = 0.1 + 0.2;
  console.log('Native 0.1 + 0.2 =', nativeSum); // 可能输出 0.30000000000000004
  
  // 返回测试结果
  return {
    bigNumberResult: sum.toString(),
    nativeResult: nativeSum,
    isEqual: sum.isEqualTo(0.3),
    priceDataLength: priceData.length
  };
}
```

这样的集成确保了所有指标计算都可以使用高精度数值计算，提高了金融数据处理的准确性。