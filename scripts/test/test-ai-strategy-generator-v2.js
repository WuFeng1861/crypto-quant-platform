const axios = require('axios');

const API_BASE = 'http://localhost:3099';

async function testGenerateStrategy(userInput, testName) {
  console.log(`\n========== ${testName} ==========`);
  console.log('输入:', userInput);
  console.log('请求中...');
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_BASE}/ai-strategy-generator/generate`, {
      userInput
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`耗时: ${elapsed}ms`);
    console.log('响应状态: 成功');
    console.log('响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.generatedStrategy) {
      const strategy = response.data.generatedStrategy;
      console.log('\n策略结构验证:');
      console.log(`- name: ${strategy.name ? '✅' : '❌'}`);
      console.log(`- description: ${strategy.description ? '✅' : '❌'}`);
      console.log(`- positionType: ${strategy.positionType ? '✅' : '❌'}`);
      console.log(`- takeProfitRatio: ${strategy.takeProfitRatio !== null ? '✅ (' + strategy.takeProfitRatio + ')' : '⚠️ null'}`);
      console.log(`- stopLossRatio: ${strategy.stopLossRatio !== null ? '✅ (' + strategy.stopLossRatio + ')' : '⚠️ null'}`);
      console.log(`- indicators: ${Array.isArray(strategy.indicators) ? '✅ (' + strategy.indicators.length + '个)' : '❌'}`);
      console.log(`- conditions: ${Array.isArray(strategy.conditions) ? '✅ (' + strategy.conditions.length + '个)' : '❌'}`);
      
      if (response.data.createdIndicators) {
        console.log(`- createdIndicators: ✅ (${response.data.createdIndicators.length}个)`);
        console.log('  指标ID列表:', response.data.createdIndicators.map(i => i.id));
      } else {
        console.log(`- createdIndicators: ❌ 缺失`);
      }
    }
    
    return response.data;
  } catch (error) {
    console.log('响应状态: 失败');
    if (error.response) {
      console.log('错误码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
    return null;
  }
}

async function testCreateStrategy(userInput, strategyName, description, testName) {
  console.log(`\n========== ${testName} ==========`);
  console.log('输入:', userInput);
  console.log('策略名称:', strategyName);
  console.log('请求中...');
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_BASE}/ai-strategy-generator/create`, {
      userInput,
      strategyName,
      description
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`耗时: ${elapsed}ms`);
    console.log('响应状态: 成功');
    console.log('响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log('响应状态: 失败');
    if (error.response) {
      console.log('错误码:', error.response.status);
      console.log('错误信息:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
    return null;
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('    AI策略生成器接口测试 (更新版)');
  console.log('========================================');
  console.log('API地址:', API_BASE);
  console.log('测试时间:', new Date().toLocaleString());
  
  await testGenerateStrategy(
    '创建一个MA交叉策略,使用MA5和MA20,当MA5上穿MA20时买入,下穿时卖出,止盈10%,止损5%',
    '测试1: MA交叉策略 (带止盈止损)'
  );
  
  await testGenerateStrategy(
    '创建一个RSI策略,周期14,低于30买入,高于70卖出,只做多,严格止损3%',
    '测试2: RSI策略 (带止损)'
  );
  
  await testCreateStrategy(
    '创建一个激进的策略,使用MACD指标,止盈15%,止损8%',
    `AI_Macd_${Date.now()}`,
    '测试创建策略',
    '测试3: 创建策略 (带止盈止损)'
  );
  
  console.log('\n========================================');
  console.log('    测试完成');
  console.log('========================================');
}

runAllTests().catch(console.error);
