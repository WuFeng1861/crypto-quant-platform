const axios = require('axios');

// 配置
const config = {
  baseURL: 'http://localhost:3099',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 创建axios实例
const api = axios.create(config);

/**
 * 获取所有策略及其完整的指标和条件信息
 */
async function getAllStrategiesWithDetails() {
  try {
    console.log('正在获取所有策略的详细信息...');
    
    const response = await api.get('/strategies/with-details/all');
    
    console.log('✅ 成功获取策略详情', response.data);
    console.log('📊 策略数量:', response.data.data.length);
    
    // 格式化输出每个策略的信息
    response.data.data.forEach((strategy, index) => {
      console.log(`\n📋 策略 ${index + 1}:`);
      console.log(`   ID: ${strategy.id}`);
      console.log(`   名称: ${strategy.name}`);
      console.log(`   描述: ${strategy.description || '无描述'}`);
      console.log(`   持仓类型: ${strategy.positionType}`);
      console.log(`   买入手续费: ${strategy.buyFee*100}%`);
      console.log(`   卖出手续费: ${strategy.sellFee*100}%`);
      console.log(`   清算阈值: ${strategy.liquidationThreshold}%`);
      console.log(`   创建时间: ${new Date(strategy.createdAt).toLocaleString('zh-CN')}`);
      console.log(`   更新时间: ${new Date(strategy.updatedAt).toLocaleString('zh-CN')}`);
      
      // 显示指标信息
      if (strategy.indicators && strategy.indicators.length > 0) {
        console.log(`   📈 指标 (${strategy.indicators.length}个):`);
        strategy.indicators.forEach((indicator, idx) => {
          console.log(`      ${idx + 1}. 指标ID: ${indicator.indicatorId}, 优先级: ${indicator.priority}`);
          if (indicator.parameters && indicator.parameters.length > 0) {
            console.log(`         参数: ${indicator.parameters.map(p => `${p.parameterId}=${p.value}`).join(', ')}`);
          }
        });
      } else {
        console.log(`   📈 指标: 无`);
      }
      
      // 显示条件信息
      if (strategy.conditions && strategy.conditions.length > 0) {
        console.log(`   ⚡ 条件 (${strategy.conditions.length}个):`);
        strategy.conditions.forEach((condition, idx) => {
          const comparisonDesc = condition.comparisonType === 'indicator' 
            ? `指标${condition.indicatorIndex} ${condition.operator} 指标${condition.comparedIndicatorIndex}`
            : `指标${condition.indicatorIndex} ${condition.operator} ${condition.constantValue}`;
          
          console.log(`      ${idx + 1}. ${comparisonDesc} → ${condition.action} (${condition.conditionType})`);
          console.log(`         优先级: ${condition.priority}, 分组: ${condition.group || 0}`);
        });
      } else {
        console.log(`   ⚡ 条件: 无`);
      }
    });
    
    // 保存到文件
    const fs = require('fs');
    const outputFile = `strategies-with-details-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(response.data, null, 2), 'utf8');
    console.log(`\n💾 详细数据已保存到: ${outputFile}`);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ 获取策略详情失败:');
    
    if (error.response) {
      // 服务器响应了错误状态码
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   错误信息: ${error.response.data?.message || error.response.statusText}`);
      if (error.response.data?.error) {
        console.error(`   错误类型: ${error.response.data.error}`);
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('   网络错误: 无法连接到服务器');
      console.error('   请确保服务器正在运行在 http://localhost:3000');
    } else {
      // 其他错误
      console.error(`   错误: ${error.message}`);
    }
    
    process.exit(1);
  }
}

/**
 * 获取单个策略的详细信息
 * @param {number} strategyId 策略ID
 */
async function getStrategyWithDetails(strategyId) {
  try {
    console.log(`正在获取策略 ${strategyId} 的详细信息...`);
    
    const response = await api.get(`/strategies/with-details/${strategyId}`);
    
    console.log('✅ 成功获取策略详情');
    
    const strategy = response.data.data;
    console.log(`\n📋 策略详情:`);
    console.log(`   ID: ${strategy.id}`);
    console.log(`   名称: ${strategy.name}`);
    console.log(`   描述: ${strategy.description || '无描述'}`);
    console.log(`   持仓类型: ${strategy.positionType}`);
    console.log(`   买入手续费: ${strategy.buyFee * 100}%`);
    console.log(`   卖出手续费: ${strategy.sellFee* 100}%`);
    console.log(`   清算阈值: ${strategy.liquidationThreshold}%`);
    console.log(`   创建时间: ${new Date(strategy.createdAt).toLocaleString('zh-CN')}`);
    console.log(`   更新时间: ${new Date(strategy.updatedAt).toLocaleString('zh-CN')}`);
    
    // 显示指标信息
    if (strategy.indicators && strategy.indicators.length > 0) {
      console.log(`   📈 指标 (${strategy.indicators.length}个):`);
      strategy.indicators.forEach((indicator, idx) => {
        console.log(`      ${idx + 1}. 指标ID: ${indicator.indicatorId}, 优先级: ${indicator.priority}`);
        if (indicator.parameters && indicator.parameters.length > 0) {
          console.log(`         参数: ${indicator.parameters.map(p => `${p.parameterId}=${p.value}`).join(', ')}`);
        }
      });
    } else {
      console.log(`   📈 指标: 无`);
    }
    
    // 显示条件信息
    if (strategy.conditions && strategy.conditions.length > 0) {
      console.log(`   ⚡ 条件 (${strategy.conditions.length}个):`);
      strategy.conditions.forEach((condition, idx) => {
        const comparisonDesc = condition.comparisonType === 'indicator' 
          ? `指标${condition.indicatorIndex} ${condition.operator} 指标${condition.comparedIndicatorIndex}`
          : `指标${condition.indicatorIndex} ${condition.operator} ${condition.constantValue}`;
        
        console.log(`      ${idx + 1}. ${comparisonDesc} → ${condition.action} (${condition.conditionType})`);
        console.log(`         优先级: ${condition.priority}, 分组: ${condition.group || 0}`);
      });
    } else {
      console.log(`   ⚡ 条件: 无`);
    }
    
    return strategy;
    
  } catch (error) {
    console.error(`❌ 获取策略 ${strategyId} 详情失败:`);
    
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   错误信息: ${error.response.data?.message || error.response.statusText}`);
      if (error.response.status === 404) {
        console.error(`   策略 ${strategyId} 不存在`);
      }
    } else if (error.request) {
      console.error('   网络错误: 无法连接到服务器');
      console.error('   请确保服务器正在运行在 http://localhost:3000');
    } else {
      console.error(`   错误: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 没有参数，获取所有策略
    await getAllStrategiesWithDetails();
  } else if (args.length === 1) {
    // 有一个参数，获取指定策略
    const strategyId = parseInt(args[0]);
    if (isNaN(strategyId)) {
      console.error('❌ 策略ID必须是数字');
      console.log('用法:');
      console.log('  node get-all-strategies-with-details.js           # 获取所有策略');
      console.log('  node get-all-strategies-with-details.js <id>      # 获取指定策略');
      process.exit(1);
    }
    await getStrategyWithDetails(strategyId);
  } else {
    console.error('❌ 参数错误');
    console.log('用法:');
    console.log('  node get-all-strategies-with-details.js           # 获取所有策略');
    console.log('  node get-all-strategies-with-details.js <id>      # 获取指定策略');
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  getAllStrategiesWithDetails,
  getStrategyWithDetails
};