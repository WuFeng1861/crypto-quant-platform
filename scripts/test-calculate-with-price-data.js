const axios = require('axios');

// 配置
const config = {
  baseURL: 'http://localhost:3099', // 根据你的服务器地址调整
  timeout: 10 * 60 * 1000, // 超时时间
};

// 创建axios实例
const api = axios.create(config);

// 测试参数
const indicatorId = 4; // 指标ID，需要根据实际情况调整
const requestData = {
  pairId: 1,           // 交易对ID
  timeframeId: 2,      // 时间框架ID
  startTime: Date.now() - 5 * 365 * 24 * 60 * 60 * 1000, // 7天前
  endTime: Date.now(), // 现在
  parameters: {
    period: 14,        // SMA周期参数示例
  }
};

/**
 * 测试使用价格数据计算指标
 */
async function testCalculateWithPriceData() {
  let startTime = Date.now();
  try {
    console.log('开始测试 calculateWithPriceData 接口...\n');
    console.log('请求参数:');
    console.log(JSON.stringify(requestData, null, 2));
    console.log('\n发送请求...');

    // 发送请求
    const response = await api.post(`/indicators/${indicatorId}/calculate-with-data`, requestData);

    console.log('✅ 请求成功!');
    console.log('状态码:', response.status);
    console.log('响应数据:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ 请求失败:');

    if (error.response) {
      // 服务器响应了错误状态码
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('网络错误:', error.message);
    } else {
      // 其他错误
      console.error('错误:', error.message);
    }
  } finally {
    console.log(`耗时: ${(Date.now() - startTime) / 1000}s`);
  }
}

/**
 * 性能测试
 */
async function performanceTest() {
  console.log('\n=== 性能测试 ===');

  const testCount = 5;
  const times = [];

  for (let i = 0; i < testCount; i++) {
    const startTime = Date.now();

    try {
      await api.post(`/indicators/${indicatorId}/calculate-with-data`, requestData);
      const endTime = Date.now();
      const duration = endTime - startTime;
      times.push(duration);

      console.log(`测试 ${i + 1}: ${duration}ms`);

    } catch (error) {
      console.error(`测试 ${i + 1} 失败:`, error.message);
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log('\n性能统计:');
    console.log(`平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log(`最快响应时间: ${minTime}ms`);
    console.log(`最慢响应时间: ${maxTime}ms`);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';

  switch (mode) {
    case 'single':
      await testCalculateWithPriceData();
      break;
    case 'performance':
      await performanceTest();
      break;
    case 'all':
      await testCalculateWithPriceData();
      await performanceTest();
      break;
    default:
      console.log('使用方法:');
      console.log('node test-calculate-with-price-data.js [single|multiple|performance|all]');
      console.log('');
      console.log('参数说明:');
      console.log('  single     - 单个测试 (默认)');
      console.log('  performance - 性能测试');
      console.log('  all        - 运行所有测试');
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testCalculateWithPriceData,
  performanceTest
};