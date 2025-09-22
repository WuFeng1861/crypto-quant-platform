function calculate(priceData, parameters) {
  const period = parameters.period || 14;
  const result = [];
  let atr = null; /* 使用 BigNumber 存储 ATR 值 */
  
  for (let i = 0; i < priceData.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }
    
    /* 使用 BigNumber 进行高精度计算 */
    const high = new BigNumber(priceData[i].highPrice);
    const low = new BigNumber(priceData[i].lowPrice);
    const prevClose = new BigNumber(priceData[i - 1].closePrice);
    
    /* 计算真实波幅 (True Range) */
    const tr1 = high.minus(low);
    const tr2 = high.minus(prevClose).abs();
    const tr3 = low.minus(prevClose).abs();
    
    /* 取最大值作为真实波幅 */
    let tr = tr1;
    if (tr2.isGreaterThan(tr)) tr = tr2;
    if (tr3.isGreaterThan(tr)) tr = tr3;
    
    if (atr === null) {
      /* 初始化 ATR：计算前 period 个周期的平均真实波幅 */
      if (i >= period) {
        let sum = new BigNumber(0);
        
        for (let j = 0; j < period; j++) {
          const h = new BigNumber(priceData[i - j].highPrice);
          const l = new BigNumber(priceData[i - j].lowPrice);
          const pc = new BigNumber(priceData[i - j - 1].closePrice);
          
          const tr1_init = h.minus(l);
          const tr2_init = h.minus(pc).abs();
          const tr3_init = l.minus(pc).abs();
          
          let tr_init = tr1_init;
          if (tr2_init.isGreaterThan(tr_init)) tr_init = tr2_init;
          if (tr3_init.isGreaterThan(tr_init)) tr_init = tr3_init;
          
          sum = sum.plus(tr_init);
        }
        
        atr = sum.dividedBy(period);
        result.push(atr.toNumber()); /* 转换为普通数值 */
      } else {
        result.push(null);
      }
    } else {
      /* 使用指数移动平均公式更新 ATR */
      /* ATR = ((ATR_prev * (period - 1)) + TR_current) / period */
      const periodBN = new BigNumber(period);
      const periodMinus1 = new BigNumber(period - 1);
      
      atr = atr.multipliedBy(periodMinus1).plus(tr).dividedBy(periodBN);
      result.push(atr.toNumber()); /* 转换为普通数值 */
    }
  }
  
  return result;
}