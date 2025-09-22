# 自定义代码条件功能

## 概述

自定义代码条件功能允许您使用JavaScript代码来定义复杂的交易条件，而不仅仅是简单的指标比较。这为策略开发提供了更大的灵活性。

## 功能特性

- 使用vm2安全沙箱执行代码
- 超时时间设置为10分钟
- 支持BigNumber库进行精确的数值计算
- 提供丰富的上下文变量和辅助函数

## 可用变量

在自定义代码中，您可以使用以下变量：

### 核心变量
- `indicatorValues`: 所有指标的计算结果数组
- `index`: 当前数据点的索引
- `priceData`: 完整的价格数据数组
- `current`: 当前价格数据 (priceData[index])
- `previous`: 前一个价格数据 (priceData[index-1])

### 工具库
- `BigNumber`: 高精度数值计算库
- `Math`: JavaScript标准数学对象

### 辅助函数
- `average(arr)`: 计算数组平均值
- `standardDeviation(arr)`: 计算标准差
- `getHistoricalData(startIndex, endIndex)`: 获取历史价格数据
- `getIndicatorHistoricalData(indicatorIndex, startIndex, endIndex)`: 获取指标历史数据

## 使用示例

### 示例1: 简单的价格突破
```javascript
// 当前价格突破前20个周期的最高价
const historicalData = getHistoricalData(index - 20, index - 1);
const maxPrice = Math.max(...historicalData.map(d => d.highPrice));
return current.closePrice > maxPrice;
```

### 示例2: 多指标组合条件
```javascript
// 假设指标0是MACD，指标1是RSI
const macd = indicatorValues[0][index];
const rsi = indicatorValues[1][index];

// MACD金叉且RSI超卖
const macdBullish = macd.macd > macd.signal && 
                   indicatorValues[0][index-1].macd <= indicatorValues[0][index-1].signal;
const rsiOversold = rsi < 30;

return macdBullish && rsiOversold;
```

### 示例3: 动态平均线策略
```javascript
// 计算动态周期的移动平均线
const period = Math.floor(average(getIndicatorHistoricalData(0, index-10, index-1).map(d => d.period || 20)));
const recentPrices = getHistoricalData(index - period, index - 1).map(d => d.closePrice);
const dynamicMA = average(recentPrices);

return current.closePrice > dynamicMA * 1.02; // 突破动态均线2%
```

### 示例4: 波动率过滤
```javascript
// 只在低波动率环境下交易
const recentPrices = getHistoricalData(index - 20, index - 1).map(d => d.closePrice);
const volatility = standardDeviation(recentPrices) / average(recentPrices);

// 指标条件
const indicator = indicatorValues[0][index];
const signalCondition = indicator > 0.8;

// 只有在低波动率时才触发信号
return signalCondition && volatility < 0.02;
```

### 示例5: 使用BigNumber进行精确计算
```javascript
// 使用BigNumber进行高精度计算
const currentPrice = new BigNumber(current.closePrice);
const previousPrice = new BigNumber(previous.closePrice);
const priceChange = currentPrice.minus(previousPrice).dividedBy(previousPrice);

// 价格变化超过0.5%
return priceChange.isGreaterThan(new BigNumber(0.005));
```

## 注意事项

1. **返回值**: 代码必须返回boolean值（true/false）
2. **性能**: 避免在代码中进行复杂的循环计算
3. **安全性**: 代码在安全沙箱中执行，无法访问系统资源
4. **错误处理**: 如果代码执行出错，条件将返回false
5. **超时**: 代码执行超过10分钟将被终止

## 创建策略示例

```javascript
// 创建带有自定义代码条件的策略
const strategyData = {
  name: "自定义代码策略",
  description: "使用自定义代码逻辑的示例策略",
  indicators: [
    {
      indicatorId: 1, // MACD
      priority: 0,
      parameters: [
        { parameterId: 1, value: "12" },
        { parameterId: 2, value: "26" },
        { parameterId: 3, value: "9" }
      ]
    },
    {
      indicatorId: 2, // RSI
      priority: 1,
      parameters: [
        { parameterId: 4, value: "14" }
      ]
    }
  ],
  conditions: [
    {
      action: "buy",
      group: 1,
      priority: 0,
      customCode: `
        // 多指标组合买入条件
        const macd = indicatorValues[0][index];
        const rsi = indicatorValues[1][index];
        
        // MACD金叉
        const macdBullish = macd.macd > macd.signal && 
                           indicatorValues[0][index-1].macd <= indicatorValues[0][index-1].signal;
        
        // RSI超卖反弹
        const rsiOversold = rsi < 30 && indicatorValues[1][index-1] < rsi;
        
        // 价格突破前5日高点
        const recentHighs = getHistoricalData(index-5, index-1).map(d => d.highPrice);
        const maxHigh = Math.max(...recentHighs);
        const priceBreakout = current.closePrice > maxHigh;
        
        return macdBullish && rsiOversold && priceBreakout;
      `
    },
    {
      action: "sell",
      group: 1,
      priority: 0,
      customCode: `
        // 多指标组合卖出条件
        const macd = indicatorValues[0][index];
        const rsi = indicatorValues[1][index];
        
        // MACD死叉
        const macdBearish = macd.macd < macd.signal && 
                           indicatorValues[0][index-1].macd >= indicatorValues[0][index-1].signal;
        
        // RSI超买
        const rsiOverbought = rsi > 70;
        
        return macdBearish || rsiOverbought;
      `
    }
  ]
};
```

## 最佳实践

1. **代码简洁**: 保持代码简洁易读
2. **注释清晰**: 添加必要的注释说明逻辑
3. **边界检查**: 检查数组边界，避免访问不存在的数据
4. **性能优化**: 避免重复计算，缓存中间结果
5. **测试验证**: 在实际使用前充分测试代码逻辑