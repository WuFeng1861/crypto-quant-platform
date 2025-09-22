function calculate(priceData, parameters) {
  const period = parameters.period || 14;
  const result = [];
  let gains = new BigNumber(0); /* 使用 BigNumber 存储累计涨幅 */
  let losses = new BigNumber(0); /* 使用 BigNumber 存储累计跌幅 */
  
  for (let i = 0; i < priceData.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    
    /* 计算价格变化 */
    const currentPrice = new BigNumber(priceData[i].closePrice);
    const prevPrice = new BigNumber(priceData[i - 1].closePrice);
    const change = currentPrice.minus(prevPrice);
    
    if (i < period) {
      /* 累计前 period 个周期的涨跌幅 */
      if (change.isGreaterThanOrEqualTo(0)) {
        gains = gains.plus(change);
      } else {
        losses = losses.plus(change.abs());
      }
      
      if (i === period - 1) {
        /* 计算初始 RSI */
        const avgGain = gains.dividedBy(period);
        const avgLoss = losses.dividedBy(period);
        
        let rsi;
        if (avgLoss.isZero()) {
          rsi = new BigNumber(100);
        } else {
          const rs = avgGain.dividedBy(avgLoss);
          rsi = new BigNumber(100).minus(new BigNumber(100).dividedBy(rs.plus(1)));
        }
        
        result.push(rsi.toNumber()); /* 转换为普通数值 */
      } else {
        result.push(null);
      }
    } else {
      /* 使用指数移动平均更新涨跌幅 */
      const periodBN = new BigNumber(period);
      const periodMinus1 = new BigNumber(period - 1);
      
      const newGain = change.isGreaterThanOrEqualTo(0) ? change : new BigNumber(0);
      const newLoss = change.isLessThan(0) ? change.abs() : new BigNumber(0);
      
      const avgGain = gains.multipliedBy(periodMinus1).plus(newGain).dividedBy(periodBN);
      const avgLoss = losses.multipliedBy(periodMinus1).plus(newLoss).dividedBy(periodBN);
      
      gains = avgGain;
      losses = avgLoss;
      
      /* 计算 RSI */
      let rsi;
      if (avgLoss.isZero()) {
        rsi = new BigNumber(100);
      } else {
        const rs = avgGain.dividedBy(avgLoss);
        rsi = new BigNumber(100).minus(new BigNumber(100).dividedBy(rs.plus(1)));
      }
      
      result.push(rsi.toNumber()); /* 转换为普通数值 */
    }
  }
  
  return result;
}