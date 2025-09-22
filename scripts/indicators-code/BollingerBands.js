function calculate(priceData, parameters) {
  const period = parameters.period || 20;
  const stdDevMultiplier = new BigNumber(parameters.stdDev || 2);
  const result = [];
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push({ middle: null, upper: null, lower: null });
      continue;
    }
    
    /* 计算简单移动平均 */
    let sum = new BigNumber(0);
    const prices = [];
    
    for (let j = 0; j < period; j++) {
      const price = new BigNumber(priceData[i - j].closePrice);
      prices.push(price);
      sum = sum.plus(price);
    }
    
    const sma = sum.dividedBy(period);
    
    /* 计算标准差 */
    let sumSquares = new BigNumber(0);
    for (let j = 0; j < period; j++) {
      const diff = prices[j].minus(sma);
      sumSquares = sumSquares.plus(diff.multipliedBy(diff));
    }
    
    const variance = sumSquares.dividedBy(period);
    const std = variance.sqrt();
    
    /* 计算布林带上下轨 */
    const upper = sma.plus(std.multipliedBy(stdDevMultiplier));
    const lower = sma.minus(std.multipliedBy(stdDevMultiplier));
    
    result.push({
      middle: sma.toNumber(), /* 转换为普通数值 */
      upper: upper.toNumber(), /* 转换为普通数值 */
      lower: lower.toNumber()  /* 转换为普通数值 */
    });
  }
  
  return result;
}