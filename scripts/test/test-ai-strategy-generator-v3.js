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
    }, { timeout: 120000 });
    const elapsed = Date.now() - startTime;
    
    console.log(`耗时: ${elapsed}ms`);
    console.log('响应状态: 成功');
    
    if (response.data.success && response.data.generatedStrategy) {
      const strategy = response.data.generatedStrategy;
      console.log('\n策略基本信息:');
      console.log(`- 名称: ${strategy.name}`);
      console.log(`- 描述: ${strategy.description}`);
      console.log(`- 持仓类型: ${strategy.positionType}`);
      console.log(`- 止盈比例: ${strategy.takeProfitRatio}`);
      console.log(`- 止损比例: ${strategy.stopLossRatio}`);
      
      console.log('\n指标验证:');
      if (response.data.createdIndicators) {
        response.data.createdIndicators.forEach((indicator, index) => {
          console.log(`  [${index}] ${indicator.name} (ID: ${indicator.id})`);
          console.log(`      参数: ${indicator.parameters.map(p => `${p.name}=${p.defaultValue}`).join(', ')}`);
        });
      }
      
      console.log('\n条件验证:');
      strategy.conditions.forEach((condition, index) => {
        const action = condition.action === 'buy' ? '买入' : '卖出';
        const compare = condition.comparisonType === 'constant' 
          ? `常量 ${condition.constantValue}` 
          : `指标 ${condition.comparedIndicatorIndex}`;
        console.log(`  [${index}] ${action}: 指标${condition.indicatorIndex} ${condition.operator} ${compare}`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.log('响应状态: 失败');
    if (error.response) {
      console.log('错误码:', error.response.status);
      console.log('错误信息:', error.response.data.message || JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNABORTED') {
      console.log('错误: 请求超时');
    } else {
      console.log('错误:', error.message);
    }
    return null;
  }
}

async function testIndicatorGenerator(userInput, testName) {
  console.log(`\n========== ${testName} ==========`);
  console.log('输入:', userInput);
  console.log('请求中...');
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${API_BASE}/ai-indicator-generator/generate`, {
      userInput
    }, { timeout: 120000 });
    const elapsed = Date.now() - startTime;
    
    console.log(`耗时: ${elapsed}ms`);
    console.log('响应状态: 成功');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.log('响应状态: 失败');
    if (error.response) {
      console.log('错误码:', error.response.status);
      console.log('错误信息:', error.response.data.message || JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('错误:', error.message);
    }
    return null;
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('    AI策略/指标生成器接口测试');
  console.log('    (包含代码执行验证)');
  console.log('========================================');
  console.log('API地址:', API_BASE);
  console.log('测试时间:', new Date().toLocaleString());
  
  await testGenerateStrategy(
    '创建一个MA交叉策略,使用MA5和MA20,当MA5上穿MA20时买入,下穿时卖出,止盈10%,止损5%',
    '测试1: MA交叉策略 (带止盈止损)'
  );
  
  await testGenerateStrategy(
    '创建一个激进的策略,使用MACD指标,止盈15%,严格止损8%',
    '测试2: MACD策略 (测试代码执行验证)'
  );
  
  await testIndicatorGenerator(
    '创建一个MACD指标,短期周期12,长期周期26,信号周期9',
    '测试3: MACD指标生成 (测试代码执行验证)'
  );
  
  console.log('\n========================================');
  console.log('    测试完成');
  console.log('========================================');
}

runAllTests().catch(console.error);
