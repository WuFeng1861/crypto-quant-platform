/**
 * 示例：使用 BigNumber.js 计算加权移动平均线 (WMA)
 * 这个示例展示了如何在指标计算中使用 BigNumber.js 进行高精度计算
 */

function calculate(priceData, parameters) {
  const period = parseInt(parameters.period) || 20;
  const result = [];
  
  console.log(`计算 ${period} 周期加权移动平均线，数据点数: ${priceData.length}`);
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    // 使用 BigNumber 进行高精度计算
    let weightedSum = new BigNumber(0);
    let weightSum = new BigNumber(0);
    
    // 计算加权平均
    for (let j = 0; j < period; j++) {
      const dataIndex = i - period + 1 + j;
      const weight = new BigNumber(j + 1); // 权重从1到period
      const price = new BigNumber(priceData[dataIndex].close);
      
      weightedSum = weightedSum.plus(price.multipliedBy(weight));
      weightSum = weightSum.plus(weight);
    }
    
    const wma = weightedSum.dividedBy(weightSum);
    result.push(wma.toNumber());
    
    // 每100个数据点输出一次进度
    if (i % 100 === 0) {
      console.log(`处理进度: ${i}/${priceData.length}, 当前WMA: ${wma.toFixed(6)}`);
    }
  }
  
  console.log('WMA 计算完成');
  return result;
}

// 导出计算函数（在沙箱环境中会被自动调用）
// calculate 函数会被 executor.js 自动识别和执行