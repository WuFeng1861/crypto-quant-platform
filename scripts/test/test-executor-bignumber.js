const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
  baseURL: 'http://localhost:3099',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 创建axios实例
const api = axios.create(config);

/**
 * 测试 BigNumber.js 集成
 */
async function testBigNumberIntegration() {
  try {
    console.log('🧪 开始测试 BigNumber.js 集成...\n');
    
    // 1. 首先获取一些价格数据用于测试
    console.log('📊 获取测试用价格数据...');
    const priceDataResponse = await api.get('/price-data/1/1', {
      params: {
        limit: 100
      }
    });
    
    if (!priceDataResponse.data.data || priceDataResponse.data.data.length === 0) {
      throw new Error('没有找到价格数据，请先添加一些测试数据');
    }
    
    console.log(`✅ 获取到 ${priceDataResponse.data.data.length} 条价格数据\n`);
    
    // 2. 测试精度对比脚本
    console.log('🔍 测试 BigNumber.js 精度对比...');
    const precisionTestCode = fs.readFileSync(
      path.join(__dirname, '../examples/test-bignumber-precision.js'), 
      'utf8'
    );
    
    const precisionTestResponse = await api.post('/indicators/1/calculate', {
      priceData: priceDataResponse.data.data.slice(0, 20), // 使用前20条数据
      parameters: {},
      code: precisionTestCode
    });
    
    console.log('📋 精度测试结果:');
    const precisionResults = precisionTestResponse.data.data;
    
    // 显示精度测试结果
    precisionResults.precisionTests.forEach((test, index) => {
      console.log(`\n   测试 ${index + 1}: ${test.test}`);
      console.log(`   原生结果: ${test.native}`);
      console.log(`   BigNumber结果: ${test.bigNumber}`);
      if (test.expected) {
        console.log(`   期望结果: ${test.expected}`);
        console.log(`   原生正确: ${test.nativeCorrect ? '✅' : '❌'}`);
        console.log(`   BigNumber正确: ${test.bigNumberCorrect ? '✅' : '❌'}`);
      }
      if (test.difference !== undefined) {
        console.log(`   差异: ${test.difference}`);
      }
    });
    
    // 显示性能测试结果
    console.log(`\n⚡ 性能测试结果:`);
    console.log(`   迭代次数: ${precisionResults.performanceTests.iterations}`);
    console.log(`   原生计算耗时: ${precisionResults.performanceTests.nativeTime}`);
    console.log(`   BigNumber耗时: ${precisionResults.performanceTests.bigNumberTime}`);
    console.log(`   性能比率: ${precisionResults.performanceTests.ratio}`);
    
    // 显示可用全局对象
    console.log(`\n🌐 可用全局对象:`);
    Object.entries(precisionResults.availableGlobals).forEach(([key, available]) => {
      console.log(`   ${key}: ${available ? '✅' : '❌'}`);
    });
    
    // 3. 测试实际指标计算
    console.log('\n📈 测试实际指标计算 (加权移动平均线)...');
    const wmaTestCode = fs.readFileSync(
      path.join(__dirname, '../examples/indicator-with-bignumber.js'), 
      'utf8'
    );
    
    const wmaTestResponse = await api.post('/indicators/1/calculate', {
      priceData: priceDataResponse.data.data.slice(0, 50), // 使用前50条数据
      parameters: {
        period: 20
      },
      code: wmaTestCode
    });
    
    const wmaResults = wmaTestResponse.data.data;
    console.log(`✅ WMA 计算完成，结果数组长度: ${wmaResults.length}`);
    
    // 显示前几个和后几个非空结果
    const nonNullResults = wmaResults.filter(r => r !== null);
    if (nonNullResults.length > 0) {
      console.log(`   前3个WMA值: ${nonNullResults.slice(0, 3).map(v => v.toFixed(6)).join(', ')}`);
      console.log(`   后3个WMA值: ${nonNullResults.slice(-3).map(v => v.toFixed(6)).join(', ')}`);
    }
    
    // 4. 保存测试结果
    const testResults = {
      timestamp: new Date().toISOString(),
      precisionTests: precisionResults.precisionTests,
      performanceTests: precisionResults.performanceTests,
      availableGlobals: precisionResults.availableGlobals,
      wmaTestSample: {
        inputDataLength: 50,
        outputDataLength: wmaResults.length,
        nonNullCount: nonNullResults.length,
        sampleResults: nonNullResults.slice(0, 10)
      }
    };
    
    const outputFile = `bignumber-test-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`\n💾 测试结果已保存到: ${outputFile}`);
    
    console.log('\n🎉 BigNumber.js 集成测试完成！');
    
    return testResults;
    
  } catch (error) {
    console.error('❌ BigNumber.js 集成测试失败:');
    
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   错误信息: ${error.response.data?.message || error.response.statusText}`);
      if (error.response.data?.error) {
        console.error(`   错误详情: ${JSON.stringify(error.response.data.error, null, 2)}`);
      }
    } else if (error.request) {
      console.error('   网络错误: 无法连接到服务器');
      console.error('   请确保服务器正在运行在 http://localhost:3099');
    } else {
      console.error(`   错误: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === '--help') {
    console.log('BigNumber.js 集成测试脚本');
    console.log('');
    console.log('用法:');
    console.log('  node test-executor-bignumber.js    # 运行完整的集成测试');
    console.log('');
    console.log('测试内容:');
    console.log('  1. 精度对比测试 (原生 vs BigNumber.js)');
    console.log('  2. 性能对比测试');
    console.log('  3. 可用全局对象检查');
    console.log('  4. 实际指标计算测试 (WMA)');
    console.log('');
    console.log('前置条件:');
    console.log('  - 服务器运行在 http://localhost:3099');
    console.log('  - 数据库中有价格数据 (pairId=1, timeframeId=1)');
    console.log('  - 至少有一个指标定义 (id=1)');
    return;
  }
  
  await testBigNumberIntegration();
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testBigNumberIntegration
};