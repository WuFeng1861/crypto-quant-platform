function calculate(priceData, parameters) {
  const period = parameters.period || 9;
  const kPeriod = parameters.kPeriod || 3;
  const dPeriod = parameters.dPeriod || 3;
  const result = [];
  let kValues = []; /* 存储 K 值历史 */
  let dValues = []; /* 存储 D 值历史 */
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push({k: null, d: null, j: null});
      continue;
    }
    
    /* 寻找最高价和最低价 */
    let highestHigh = new BigNumber(-Infinity);
    let lowestLow = new BigNumber(Infinity);
    
    for (let j = 0; j < period; j++) {
      const high = new BigNumber(priceData[i - j].high);
      const low = new BigNumber(priceData[i - j].low);
      
      if (high.isGreaterThan(highestHigh)) highestHigh = high;
      if (low.isLessThan(lowestLow)) lowestLow = low;
    }
    
    /* 计算 RSV (Raw Stochastic Value) */
    const close = new BigNumber(priceData[i].close);
    let rsv;
    
    if (highestHigh.isEqualTo(lowestLow)) {
      rsv = new BigNumber(50); /* 避免除零错误 */
    } else {
      rsv = close.minus(lowestLow)
        .dividedBy(highestHigh.minus(lowestLow))
        .multipliedBy(100);
    }
    
    /* 计算 K 值 */
    let k;
    if (kValues.length === 0) {
      k = rsv;
    } else {
      const prevK = new BigNumber(kValues[kValues.length - 1]);
      const kPeriodBN = new BigNumber(kPeriod);
      const kPeriodMinus1 = new BigNumber(kPeriod - 1);
      
      k = prevK.multipliedBy(kPeriodMinus1).plus(rsv).dividedBy(kPeriodBN);
    }
    
    kValues.push(k.toNumber());
    
    /* 计算 D 值 */
    let d;
    if (dValues.length === 0) {
      d = k;
    } else {
      const prevD = new BigNumber(dValues[dValues.length - 1]);
      const dPeriodBN = new BigNumber(dPeriod);
      const dPeriodMinus1 = new BigNumber(dPeriod - 1);
      
      d = prevD.multipliedBy(dPeriodMinus1).plus(k).dividedBy(dPeriodBN);
    }
    
    dValues.push(d.toNumber());
    
    /* 计算 J 值 */
    const j = k.multipliedBy(3).minus(d.multipliedBy(2));
    
    result.push({
      k: k.toNumber(), /* 转换为普通数值 */
      d: d.toNumber(), /* 转换为普通数值 */
      j: j.toNumber()  /* 转换为普通数值 */
    });
  }
  
  return result;
}