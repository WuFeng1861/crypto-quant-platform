const axios = require('axios');

/**
 * AI指标生成器测试脚本
 * 测试AI指标生成功能
 */

const API_BASE_URL = 'http://localhost:3099';

// 测试用例
const testCases = [
  {
    name: 'OBV_能量潮',
    userInput: '创建一个基于成交量变化判断资金流入流出，辅助确认趋势的OBV指标',
    indicatorName: 'AI_OBV',
    description: 'AI生成的OBV指标'
  }
];

// 测试数据
const testData = [
  { timestamp: '2024-01-01', openPrice: 100, highPrice: 105, lowPrice: 98, closePrice: 102, volume: 1000 },
  { timestamp: '2024-01-02', openPrice: 102, highPrice: 108, lowPrice: 101, closePrice: 106, volume: 1200 },
  { timestamp: '2024-01-03', openPrice: 106, highPrice: 110, lowPrice: 104, closePrice: 108, volume: 1100 },
  { timestamp: '2024-01-04', openPrice: 108, highPrice: 112, lowPrice: 107, closePrice: 110, volume: 1300 },
  { timestamp: '2024-01-05', openPrice: 110, highPrice: 115, lowPrice: 109, closePrice: 113, volume: 1400 },
  { timestamp: '2024-01-06', openPrice: 113, highPrice: 118, lowPrice: 112, closePrice: 116, volume: 1500 },
  { timestamp: '2024-01-07', openPrice: 116, highPrice: 120, lowPrice: 115, closePrice: 118, volume: 1600 },
  { timestamp: '2024-01-08', openPrice: 118, highPrice: 122, lowPrice: 117, closePrice: 120, volume: 1700 },
  { timestamp: '2024-01-09', openPrice: 120, highPrice: 125, lowPrice: 119, closePrice: 123, volume: 1800 },
  { timestamp: '2024-01-10', openPrice: 123, highPrice: 128, lowPrice: 122, closePrice: 125, volume: 1900 }
];

async function testGenerateIndicator() {
  console.log('🤖 开始测试AI指标生成功能...\n');

  for (const testCase of testCases) {
    console.log(`\n📊 测试: ${testCase.name}`);
    console.log(`用户输入: ${testCase.userInput}`);

    try {
      // 测试生成指标函数
      console.log('正在生成指标函数...');
      const generateResponse = await axios.post(`${API_BASE_URL}/ai-indicator-generator/generate`, {
        userInput: testCase.userInput
      });

      if (generateResponse.data.data.code && generateResponse.data.data.parameters) {
        console.log('✅ 指标函数生成成功');
        console.log('生成的代码:', generateResponse.data.data.code, '字符');
        console.log('参数数量:', generateResponse.data.data.parameters.length);
        console.log('参数详情:', JSON.stringify(generateResponse.data.parameters, null, 2));
      } else {
        console.log('❌ 指标函数生成失败');
        console.log('错误信息:', generateResponse.data);
      }
      // 测试创建指标
      console.log('正在创建指标...');
      const createResponse = await axios.post(`${API_BASE_URL}/ai-indicator-generator/create`, {
        userInput: testCase.userInput,
        indicatorName: testCase.indicatorName,
        description: testCase.description
      });

      if (createResponse.data.data.success && createResponse.data.data.indicator) {
        console.log('✅ 指标创建成功');
        console.log('指标ID:', createResponse.data.data.indicator.id);
        console.log('指标名称:', createResponse.data.data.indicator.name);
        console.log('参数数量:', createResponse.data.data.parameters?.length || 0);
        console.log('参数详情:', JSON.stringify(createResponse.data.data.parameters, null, 2));
      } else {
        console.log('❌ 指标创建失败');
        console.log('错误信息:', createResponse.data);
      }

    } catch (error) {
      console.error('❌ 测试失败:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50));
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒避免API限制
  }

  console.log('\n🎉 AI指标生成器测试完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  testGenerateIndicator().catch(console.error);
}

module.exports = { testGenerateIndicator, testCases, testData };