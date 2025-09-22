function calculate(priceData, parameters) {
  const period = parameters.period || 14;
  const result = [];
  let ema = null; /* 使用 BigNumber 存储 EMA 值 */
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    if (ema === null) {
      /* 初始化 EMA：计算前 period 个周期的简单移动平均 */
      let sum = new BigNumber(0);
      for (let j = 0; j < period; j++) {
        sum = sum.plus(new BigNumber(priceData[i - j].closePrice));
      }
      ema = sum.dividedBy(period);
    } else {
      /* 使用指数移动平均公式更新 EMA */
      const k = new BigNumber(2).dividedBy(period + 1);
      const currentPrice = new BigNumber(priceData[i].closePrice);
      const oneMinusK = new BigNumber(1).minus(k);
      
      ema = currentPrice.multipliedBy(k).plus(ema.multipliedBy(oneMinusK));
    }
    
    result.push(ema.toNumber()); /* 转换为普通数值 */
  }
  
  return result;
}