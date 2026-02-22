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
      console.log(`- indicatorNews: ${Array.isArray(strategy.indicatorNews) ? '✅ (' + strategy.indicatorNews.length + '个)' : '❌'}`);
      console.log(`- indicators: ${Array.isArray(strategy.indicators) ? '✅ (' + strategy.indicators.length + '个)' : '❌'}`);
      console.log(`- conditions: ${Array.isArray(strategy.conditions) ? '✅ (' + strategy.conditions.length + '个)' : '❌'}`);
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

async function testInputValidation() {
  console.log('\n========== 输入验证测试 ==========');
  
  console.log('\n--- 测试空输入 ---');
  try {
    await axios.post(`${API_BASE}/ai-strategy-generator/generate`, {
      userInput: ''
    });
    console.log('结果: ❌ 应该返回400错误');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('结果: ✅ 正确返回400错误');
      console.log('错误信息:', error.response.data.message);
    } else {
      console.log('结果: ❌ 错误码不正确');
    }
  }
  
  console.log('\n--- 测试超长输入 ---');
  const longInput = 'a'.repeat(5001);
  try {
    await axios.post(`${API_BASE}/ai-strategy-generator/generate`, {
      userInput: longInput
    });
    console.log('结果: ❌ 应该返回400错误');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('结果: ✅ 正确返回400错误');
      console.log('错误信息:', error.response.data.message);
    } else {
      console.log('结果: ❌ 错误码不正确');
    }
  }
}

async function testDuplicateName() {
  console.log('\n========== 重复名称测试 ==========');
  
  const testName = `Test_Duplicate_${Date.now()}`;
  
  console.log(`\n--- 第一次创建 (名称: ${testName}) ---`);
  await testCreateStrategy(
    '创建一个MA交叉策略',
    testName,
    '测试重复名称',
    '第一次创建'
  );
  
  console.log(`\n--- 第二次创建 (相同名称: ${testName}) ---`);
  try {
    await axios.post(`${API_BASE}/ai-strategy-generator/create`, {
      userInput: '创建另一个策略',
      strategyName: testName
    });
    console.log('结果: ❌ 应该返回409错误');
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('结果: ✅ 正确返回409错误');
      console.log('错误信息:', error.response.data.message);
    } else {
      console.log('结果: ❌ 错误码不正确, 收到:', error.response?.status);
    }
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('    AI策略生成器接口测试');
  console.log('========================================');
  console.log('API地址:', API_BASE);
  console.log('测试时间:', new Date().toLocaleString());
  
  await testGenerateStrategy(
    '创建一个MA交叉策略,使用MA5和MA20,当MA5上穿MA20时买入,下穿时卖出',
    '测试1: MA交叉策略'
  );
  
  await testGenerateStrategy(
    '创建一个RSI策略,周期14,低于30买入,高于70卖出,只做多',
    '测试2: RSI策略'
  );
  
  await testCreateStrategy(
    '创建一个MA交叉策略,使用MA5和MA20',
    `AI_MA_Cross_${Date.now()}`,
    '测试创建策略',
    '测试3: 创建策略'
  );
  
  await testInputValidation();
  
  await testDuplicateName();
  
  console.log('\n========================================');
  console.log('    测试完成');
  console.log('========================================');
}

runAllTests().catch(console.error);
