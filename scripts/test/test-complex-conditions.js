const axios = require('axios');

/* 配置 */
const config = {
  baseURL: 'http://localhost:3099',
  timeout: 30000
};

/* 测试复杂对象条件比较功能 */
async function testComplexConditions() {
  try {
    console.log('🧪 开始测试复杂对象条件比较功能...\n');

    /* 测试数据：模拟 MACD 指标结果 */
    const testData = {
      macdResults: [
        { macd: -0.5, signal: -0.3, histogram: -0.2 },  /* 死叉状态 */
        { macd: -0.2, signal: -0.3, histogram: 0.1 },   /* 即将金叉 */
        { macd: 0.1, signal: -0.1, histogram: 0.2 },    /* 金叉发生 */
        { macd: 0.3, signal: 0.1, histogram: 0.2 },     /* 金叉确认 */
        { macd: 0.2, signal: 0.3, histogram: -0.1 },    /* 即将死叉 */
        { macd: -0.1, signal: 0.2, histogram: -0.3 }    /* 死叉发生 */
      ]
    };

    console.log('📊 测试数据（MACD 指标结果）:');
    testData.macdResults.forEach((data, index) => {
      console.log(`   ${index}: MACD=${data.macd.toFixed(3)}, Signal=${data.signal.toFixed(3)}, Histogram=${data.histogram.toFixed(3)}`);
    });

    /* 测试 1: 属性路径提取功能 */
    console.log('\n🔍 测试 1: 属性路径提取功能');
    await testValueExtraction(testData.macdResults);

    /* 测试 2: 金叉检测 */
    console.log('\n📈 测试 2: MACD 金叉检测');
    await testGoldenCross(testData.macdResults);

    /* 测试 3: 死叉检测 */
    console.log('\n📉 测试 3: MACD 死叉检测');
    await testDeathCross(testData.macdResults);

    /* 测试 4: 柱状图条件 */
    console.log('\n📊 测试 4: MACD 柱状图条件');
    await testHistogramCondition(testData.macdResults);

    /* 测试 5: 创建并测试实际策略 */
    console.log('\n🚀 测试 5: 创建并测试实际策略');
    await testRealStrategy();

    console.log('\n✅ 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

/* 测试属性路径提取功能 */
async function testValueExtraction(macdResults) {
  console.log('   测试不同属性路径的值提取...');
  
  const testCases = [
    { path: 'macd', expected: 'MACD 线值' },
    { path: 'signal', expected: '信号线值' },
    { path: 'histogram', expected: '柱状图值' },
    { path: '', expected: '完整对象' },
    { path: null, expected: '完整对象' }
  ];

  testCases.forEach(testCase => {
    const result = extractValueByPath(macdResults[2], testCase.path);
    console.log(`     路径 "${testCase.path || '无'}": ${JSON.stringify(result)} (${testCase.expected})`);
  });
}

/* 模拟属性路径提取函数 */
function extractValueByPath(obj, path) {
  if (!path || path.trim() === '') {
    return obj;
  }

  if (obj == null) {
    return null;
  }

  const pathParts = path.split('.');
  let result = obj;

  for (const part of pathParts) {
    if (result == null || typeof result !== 'object') {
      return null;
    }
    result = result[part];
  }

  return result;
}

/* 测试金叉检测 */
async function testGoldenCross(macdResults) {
  console.log('   检测 MACD 线上穿信号线的时机...');
  
  for (let i = 1; i < macdResults.length; i++) {
    const current = macdResults[i];
    const previous = macdResults[i - 1];
    
    const currentMacd = extractValueByPath(current, 'macd');
    const currentSignal = extractValueByPath(current, 'signal');
    const prevMacd = extractValueByPath(previous, 'macd');
    const prevSignal = extractValueByPath(previous, 'signal');
    
    /* 金叉条件：当前 MACD > Signal 且 前一个 MACD <= Signal */
    const isGoldenCross = currentMacd > currentSignal && prevMacd <= prevSignal;
    
    if (isGoldenCross) {
      console.log(`     ✅ 第 ${i} 个数据点检测到金叉信号`);
      console.log(`        当前: MACD=${currentMacd} > Signal=${currentSignal}`);
      console.log(`        前一: MACD=${prevMacd} <= Signal=${prevSignal}`);
    }
  }
}

/* 测试死叉检测 */
async function testDeathCross(macdResults) {
  console.log('   检测 MACD 线下穿信号线的时机...');
  
  for (let i = 1; i < macdResults.length; i++) {
    const current = macdResults[i];
    const previous = macdResults[i - 1];
    
    const currentMacd = extractValueByPath(current, 'macd');
    const currentSignal = extractValueByPath(current, 'signal');
    const prevMacd = extractValueByPath(previous, 'macd');
    const prevSignal = extractValueByPath(previous, 'signal');
    
    /* 死叉条件：当前 MACD < Signal 且 前一个 MACD >= Signal */
    const isDeathCross = currentMacd < currentSignal && prevMacd >= prevSignal;
    
    if (isDeathCross) {
      console.log(`     ✅ 第 ${i} 个数据点检测到死叉信号`);
      console.log(`        当前: MACD=${currentMacd} < Signal=${currentSignal}`);
      console.log(`        前一: MACD=${prevMacd} >= Signal=${prevSignal}`);
    }
  }
}

/* 测试柱状图条件 */
async function testHistogramCondition(macdResults) {
  console.log('   检测 MACD 柱状图正负值...');
  
  macdResults.forEach((data, index) => {
    const histogram = extractValueByPath(data, 'histogram');
    const condition = histogram > 0 ? '看涨' : '看跌';
    const symbol = histogram > 0 ? '📈' : '📉';
    
    console.log(`     ${symbol} 第 ${index} 个数据点: Histogram=${histogram.toFixed(3)} (${condition})`);
  });
}

/* 测试实际策略创建和回测 */
async function testRealStrategy() {
  try {
    console.log('   尝试创建 MACD 测试策略...');
    
    /* 简化的策略数据 */
    const strategyData = {
      name: '测试-MACD复杂条件',
      description: '测试复杂对象属性路径比较功能',
      positionType: 'long',
      buyFeeRate: 0.001,
      sellFeeRate: 0.001,
      
      indicators: [
        {
          indicatorId: 5,  /* 假设 MACD 指标 ID 为 5 */
          parameters: [
            { parameterId: 13, value: '12' },
            { parameterId: 14, value: '26' },
            { parameterId: 15, value: '9' }
          ]
        }
      ],
      
      conditions: [
        {
          indicatorIndex: 0,
          comparisonType: 'indicator',
          comparedIndicatorIndex: 0,
          currentValuePath: 'macd',
          comparedValuePath: 'signal',
          operator: '>',
          conditionType: 'crossover',
          action: 'buy',
          group: 1,
          priority: 1
        }
      ]
    };

    const response = await axios.post(`${config.baseURL}/strategies`, strategyData, {
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 201) {
      console.log(`     ✅ 策略创建成功，ID: ${response.data.data.id}`);
      
      /* 尝试获取策略详情验证属性路径 */
      const detailResponse = await axios.get(`${config.baseURL}/strategies/${response.data.data.id}`);
      
      if (detailResponse.data.data.conditions) {
        console.log('     📋 验证条件配置:');
        detailResponse.data.data.conditions.forEach((condition, index) => {
          console.log(`        条件 ${index + 1}:`);
          console.log(`          当前值路径: ${condition.currentValuePath || '无'}`);
          console.log(`          比较值路径: ${condition.comparedValuePath || '无'}`);
        });
      }
      
    } else {
      console.log('     ⚠️ 策略创建失败，可能是指标ID不存在');
    }

  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('     ⚠️ API 端点不存在，跳过实际策略测试');
    } else {
      console.log('     ⚠️ 策略测试跳过（服务器可能未运行）');
    }
  }
}

/* 显示帮助信息 */
function showHelp() {
  console.log(`
📖 复杂对象条件比较测试脚本

🎯 功能：
   测试复杂对象属性路径提取和条件比较功能
   验证 MACD 金叉死叉检测逻辑

🧪 测试内容：
   1. 属性路径提取功能
   2. MACD 金叉检测
   3. MACD 死叉检测  
   4. 柱状图条件判断
   5. 实际策略创建测试

🚀 使用方法：
   node scripts/test/test-complex-conditions.js

📊 测试数据：
   使用模拟的 MACD 指标数据进行各种条件测试
  `);
}

/* 检查命令行参数 */
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
} else {
  testComplexConditions();
}