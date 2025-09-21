function calculate(priceData, parameters) {
  const fastPeriod = parameters.fastPeriod || 12;
  const slowPeriod = parameters.slowPeriod || 26;
  const signalPeriod = parameters.signalPeriod || 9;
  const result = [];
  let fastEMA = null; /* 使用 BigNumber 存储快速 EMA */
  let slowEMA = null; /* 使用 BigNumber 存储慢速 EMA */
  let macdLine = [];
  let signalLine = null; /* 使用 BigNumber 存储信号线 */
  
  for (let i = 0; i < priceData.length; i++) {
    /* 计算快速EMA */
    if (i < fastPeriod - 1) {
      result.push({macd: null, signal: null, histogram: null});
      continue;
    }
    
    if (fastEMA === null) {
      /* 初始化快速 EMA */
      let sum = new BigNumber(0);
      for (let j = 0; j < fastPeriod; j++) {
        sum = sum.plus(new BigNumber(priceData[i - j].close));
      }
      fastEMA = sum.dividedBy(fastPeriod);
    } else {
      /* 更新快速 EMA */
      const k = new BigNumber(2).dividedBy(fastPeriod + 1);
      const currentPrice = new BigNumber(priceData[i].close);
      const oneMinusK = new BigNumber(1).minus(k);
      
      fastEMA = currentPrice.multipliedBy(k).plus(fastEMA.multipliedBy(oneMinusK));
    }
    
    /* 计算慢速EMA */
    if (i < slowPeriod - 1) {
      result.push({macd: null, signal: null, histogram: null});
      continue;
    }
    
    if (slowEMA === null) {
      /* 初始化慢速 EMA */
      let sum = new BigNumber(0);
      for (let j = 0; j < slowPeriod; j++) {
        sum = sum.plus(new BigNumber(priceData[i - j].close));
      }
      slowEMA = sum.dividedBy(slowPeriod);
    } else {
      /* 更新慢速 EMA */
      const k = new BigNumber(2).dividedBy(slowPeriod + 1);
      const currentPrice = new BigNumber(priceData[i].close);
      const oneMinusK = new BigNumber(1).minus(k);
      
      slowEMA = currentPrice.multipliedBy(k).plus(slowEMA.multipliedBy(oneMinusK));
    }
    
    /* 计算MACD线 */
    const macd = fastEMA.minus(slowEMA);
    macdLine.push(macd);
    
    /* 计算信号线 */
    if (macdLine.length >= signalPeriod) {
      if (signalLine === null) {
        /* 初始化信号线 */
        let sum = new BigNumber(0);
        for (let j = 0; j < signalPeriod; j++) {
          sum = sum.plus(macdLine[macdLine.length - 1 - j]);
        }
        signalLine = sum.dividedBy(signalPeriod);
      } else {
        /* 更新信号线 */
        const k = new BigNumber(2).dividedBy(signalPeriod + 1);
        const oneMinusK = new BigNumber(1).minus(k);
        
        signalLine = macd.multipliedBy(k).plus(signalLine.multipliedBy(oneMinusK));
      }
      
      /* 计算柱状图 */
      const histogram = macd.minus(signalLine);
      
      result.push({
        macd: macd.toNumber(), /* 转换为普通数值 */
        signal: signalLine.toNumber(), /* 转换为普通数值 */
        histogram: histogram.toNumber() /* 转换为普通数值 */
      });
    } else {
      result.push({
        macd: macd.toNumber(), /* 转换为普通数值 */
        signal: null,
        histogram: null
      });
    }
  }
  
  return result;
}