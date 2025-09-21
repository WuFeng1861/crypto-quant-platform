function calculate(priceData, parameters) {
  const period = parameters.period || 14;
  const result = [];
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    /* 使用 BigNumber 进行高精度求和 */
    let sum = new BigNumber(0);
    for (let j = 0; j < period; j++) {
      sum = sum.plus(new BigNumber(priceData[i - j].close));
    }
    
    /* 计算简单移动平均并转换为普通数值 */
    const sma = sum.dividedBy(period);
    result.push(sma.toNumber());
  }
  
  return result;
}