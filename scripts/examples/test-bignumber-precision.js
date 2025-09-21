/**
 * 测试脚本：验证 BigNumber.js 精度优势
 * 这个脚本对比原生 JavaScript 数值计算和 BigNumber.js 的精度差异
 */

function calculate(priceData, parameters) {
  console.log('开始测试 BigNumber.js 精度...');
  
  const testResults = {
    precisionTests: [],
    performanceTests: {},
    priceDataSample: priceData.slice(0, 5) // 取前5个数据点作为样本
  };
  
  // 测试1: 经典的 0.1 + 0.2 问题
  console.log('测试1: 0.1 + 0.2 精度问题');
  const nativeResult1 = 0.1 + 0.2;
  const bigNumberResult1 = new BigNumber('0.1').plus(new BigNumber('0.2'));
  
  testResults.precisionTests.push({
    test: '0.1 + 0.2',
    native: nativeResult1,
    bigNumber: bigNumberResult1.toString(),
    expected: '0.3',
    nativeCorrect: nativeResult1 === 0.3,
    bigNumberCorrect: bigNumberResult1.isEqualTo('0.3')
  });
  
  console.log(`原生结果: ${nativeResult1}`);
  console.log(`BigNumber结果: ${bigNumberResult1.toString()}`);
  
  // 测试2: 大数值计算
  console.log('测试2: 大数值乘法');
  const largeNum1 = 999999999999999;
  const largeNum2 = 999999999999999;
  const nativeResult2 = largeNum1 * largeNum2;
  const bigNumberResult2 = new BigNumber(largeNum1).multipliedBy(new BigNumber(largeNum2));
  
  testResults.precisionTests.push({
    test: '999999999999999 * 999999999999999',
    native: nativeResult2,
    bigNumber: bigNumberResult2.toString(),
    nativeLostPrecision: nativeResult2 !== parseInt(bigNumberResult2.toString())
  });
  
  console.log(`原生结果: ${nativeResult2}`);
  console.log(`BigNumber结果: ${bigNumberResult2.toString()}`);
  
  // 测试3: 小数除法
  console.log('测试3: 小数除法精度');
  const nativeResult3 = 1 / 3;
  const bigNumberResult3 = new BigNumber(1).dividedBy(new BigNumber(3));
  
  testResults.precisionTests.push({
    test: '1 / 3',
    native: nativeResult3,
    bigNumber: bigNumberResult3.toFixed(20), // 显示20位小数
    nativeFixed: nativeResult3.toFixed(20)
  });
  
  console.log(`原生结果 (20位): ${nativeResult3.toFixed(20)}`);
  console.log(`BigNumber结果 (20位): ${bigNumberResult3.toFixed(20)}`);
  
  // 测试4: 价格数据计算示例
  if (priceData.length > 0) {
    console.log('测试4: 价格数据计算');
    
    // 计算前10个价格的平均值
    const sampleSize = Math.min(10, priceData.length);
    let nativeSum = 0;
    let bigNumberSum = new BigNumber(0);
    
    for (let i = 0; i < sampleSize; i++) {
      const price = priceData[i].close;
      nativeSum += price;
      bigNumberSum = bigNumberSum.plus(new BigNumber(price));
    }
    
    const nativeAvg = nativeSum / sampleSize;
    const bigNumberAvg = bigNumberSum.dividedBy(sampleSize);
    
    testResults.precisionTests.push({
      test: `前${sampleSize}个价格平均值`,
      native: nativeAvg,
      bigNumber: bigNumberAvg.toString(),
      difference: Math.abs(nativeAvg - bigNumberAvg.toNumber())
    });
    
    console.log(`原生平均值: ${nativeAvg}`);
    console.log(`BigNumber平均值: ${bigNumberAvg.toString()}`);
    console.log(`差异: ${Math.abs(nativeAvg - bigNumberAvg.toNumber())}`);
  }
  
  // 性能测试
  console.log('测试5: 性能对比');
  const iterations = 10000;
  
  // 原生计算性能
  const nativeStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    const result = (i * 0.1 + 0.2) / 1.5;
  }
  const nativeTime = Date.now() - nativeStart;
  
  // BigNumber 计算性能
  const bigNumberStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    const result = new BigNumber(i).multipliedBy(0.1).plus(0.2).dividedBy(1.5);
  }
  const bigNumberTime = Date.now() - bigNumberStart;
  
  testResults.performanceTests = {
    iterations,
    nativeTime: `${nativeTime}ms`,
    bigNumberTime: `${bigNumberTime}ms`,
    ratio: `BigNumber 慢 ${(bigNumberTime / nativeTime).toFixed(2)} 倍`
  };
  
  console.log(`原生计算 ${iterations} 次耗时: ${nativeTime}ms`);
  console.log(`BigNumber 计算 ${iterations} 次耗时: ${bigNumberTime}ms`);
  console.log(`性能比率: BigNumber 慢 ${(bigNumberTime / nativeTime).toFixed(2)} 倍`);
  
  // 测试可用的全局对象
  console.log('测试6: 可用的全局对象');
  const availableGlobals = {
    BigNumber: typeof BigNumber !== 'undefined',
    Math: typeof Math !== 'undefined',
    Array: typeof Array !== 'undefined',
    Object: typeof Object !== 'undefined',
    isNaN: typeof isNaN !== 'undefined',
    isFinite: typeof isFinite !== 'undefined',
    parseFloat: typeof parseFloat !== 'undefined',
    parseInt: typeof parseInt !== 'undefined'
  };
  
  testResults.availableGlobals = availableGlobals;
  
  console.log('可用的全局对象:', availableGlobals);
  console.log('BigNumber.js 精度测试完成!');
  
  return testResults;
}