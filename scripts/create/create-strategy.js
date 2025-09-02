const axios = require('axios');

// API配置
const API_BASE_URL = 'http://localhost:3099'; // 根据实际API地址修改
const API_ENDPOINT = '/strategies';

// MA交叉策略配置
const strategyData = {
  "name": "MA交叉策略",
  "description": "基于MA5和MA20移动平均线交叉的交易策略",
  "positionType": "both",
  "buyFee": 0.001,
  "sellFee": 0.001,
  "liquidationThreshold": 85,
  "indicators": [
    {
      "indicatorId": 3,
      "priority": 1,
      "parameters": [
        {
          "parameterId": 1,
          "value": "5"
        }
      ]
    },
    {
      "indicatorId": 3,
      "priority": 2,
      "parameters": [
        {
          "parameterId": 1,
          "value": "20"
        }
      ]
    }
  ],
  "conditions": [
    {
      "indicatorIndex": 0,
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 1,
      "operator": ">",
      "conditionType": "crossover",
      "action": "buy",
      "priority": 1,
      "group": 1
    },
    {
      "indicatorIndex": 0,
      "comparisonType": "indicator",
      "comparedIndicatorIndex": 1,
      "operator": "<",
      "conditionType": "crossover",
      "action": "sell",
      "priority": 1,
      "group": 2
    }
  ]
};

/**
 * 创建策略
 */
async function createStrategy() {
  try {
    console.log('🚀 开始创建MA交叉策略...');
    console.log('📊 策略配置:', JSON.stringify(strategyData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}${API_ENDPOINT}`, strategyData, {
      headers: {
        'Content-Type': 'application/json',
        // 如果需要认证，在这里添加Authorization头
        // 'Authorization': 'Bearer your-token-here'
      },
      timeout: 10000 // 10秒超时
    });

    console.log('✅ 策略创建成功!');
    console.log('📋 响应状态:', response.status);
    console.log('📄 创建的策略:', JSON.stringify(response.data, null, 2));
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ 策略创建失败:');
    
    if (error.response) {
      // 服务器响应了错误状态码
      console.error('📊 响应状态:', error.response.status);
      console.error('📄 错误信息:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('🔌 网络错误: 无法连接到服务器');
      console.error('🌐 请检查API服务是否运行在:', API_BASE_URL);
    } else {
      // 其他错误
      console.error('⚠️  请求配置错误:', error.message);
    }
    
    throw error;
  }
}

/**
 * 验证策略配置
 */
function validateStrategyData(data) {
  const errors = [];
  
  // 基本字段验证
  if (!data.name || data.name.trim() === '') {
    errors.push('策略名称不能为空');
  }
  
  if (!data.indicators || data.indicators.length === 0) {
    errors.push('至少需要一个指标');
  }
  
  if (!data.conditions || data.conditions.length === 0) {
    errors.push('至少需要一个条件');
  }
  
  // 指标配置验证
  if (data.indicators) {
    data.indicators.forEach((indicator, index) => {
      if (!indicator.indicatorId) {
        errors.push(`指标${index + 1}: indicatorId不能为空`);
      }
    });
  }
  
  // 条件配置验证
  if (data.conditions) {
    data.conditions.forEach((condition, index) => {
      if (condition.indicatorIndex === undefined || condition.indicatorIndex === null) {
        errors.push(`条件${index + 1}: indicatorIndex不能为空`);
      }
      
      if (condition.comparisonType === 'indicator' && 
          (condition.comparedIndicatorIndex === undefined || condition.comparedIndicatorIndex === null)) {
        errors.push(`条件${index + 1}: 指标比较类型需要提供comparedIndicatorIndex`);
      }
      
      if (condition.comparisonType === 'constant' && !condition.constantValue) {
        errors.push(`条件${index + 1}: 常量比较类型需要提供constantValue`);
      }
      
      if (!condition.operator) {
        errors.push(`条件${index + 1}: operator不能为空`);
      }
      
      if (!condition.action) {
        errors.push(`条件${index + 1}: action不能为空`);
      }
    });
  }
  
  return errors;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🔍 验证策略配置...');
    
    // 验证配置
    const validationErrors = validateStrategyData(strategyData);
    if (validationErrors.length > 0) {
      console.error('❌ 策略配置验证失败:');
      validationErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log('✅ 策略配置验证通过');
    
    // 创建策略
    const createdStrategy = await createStrategy();
    
    console.log('\n🎉 策略创建完成!');
    console.log(`📝 策略ID: ${createdStrategy.id}`);
    console.log(`📊 策略名称: ${createdStrategy.name}`);
    console.log(`📈 指标数量: ${strategyData.indicators.length}`);
    console.log(`⚡ 条件数量: ${strategyData.conditions.length}`);
    
  } catch (error) {
    console.error('\n💥 脚本执行失败');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createStrategy,
  validateStrategyData,
  strategyData
};