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
 * 创建带有止盈止损的策略示例
 */
async function createStrategyWithStopLoss() {
  try {
    console.log('正在创建带有止盈止损的策略...');
    
    const strategyData = {
      name: "MA交叉策略-带止盈止损",
      description: "基于移动平均线交叉的策略，配置了止盈止损功能",
      positionType: "both",
      buyFee: 0.001,  // 0.1%
      sellFee: 0.001, // 0.1%
      liquidationThreshold: 90,
      takeProfitRatio: 105.0,  // 止盈：105%（盈利5%时止盈）
      stopLossRatio: 97.0,     // 止损：97%（亏损3%时止损）
      indicators: [
        {
          indicatorId: 1, // 假设1是MA指标
          priority: 1,
          parameters: [
            {
              parameterId: 1, // 假设1是period参数
              value: "20"
            }
          ]
        },
        {
          indicatorId: 1, // MA指标
          priority: 2,
          parameters: [
            {
              parameterId: 1, // period参数
              value: "50"
            }
          ]
        }
      ],
      conditions: [
        {
          indicatorIndex: 0,
          comparisonType: "indicator",
          comparedIndicatorIndex: 1,
          operator: ">",
          conditionType: "crossover",
          action: "buy",
          priority: 1,
          group: 0
        },
        {
          indicatorIndex: 0,
          comparisonType: "indicator",
          comparedIndicatorIndex: 1,
          operator: "<",
          conditionType: "crossover",
          action: "sell",
          priority: 1,
          group: 0
        }
      ]
    };

    const response = await api.post('/strategies', strategyData);
    
    console.log('✅ 策略创建成功！');
    console.log('📋 策略信息:');
    console.log(`   ID: ${response.data.data.id}`);
    console.log(`   名称: ${response.data.data.name}`);
    console.log(`   描述: ${response.data.data.description}`);
    console.log(`   持仓类型: ${response.data.data.positionType}`);
    console.log(`   买入手续费: ${response.data.data.buyFee * 100}%`);
    console.log(`   卖出手续费: ${response.data.data.sellFee * 100}%`);
    console.log(`   清算阈值: ${response.data.data.liquidationThreshold}%`);
    console.log(`   🎯 止盈比例: ${response.data.data.takeProfitRatio}%`);
    console.log(`   🛡️ 止损比例: ${response.data.data.stopLossRatio}%`);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ 创建策略失败:');
    
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

/**
 * 创建不同止盈止损配置的策略示例
 */
async function createMultipleStrategiesWithDifferentStops() {
  const strategies = [
    {
      name: "保守型策略",
      takeProfitRatio: 103.0,  // 3%止盈
      stopLossRatio: 98.0,     // 2%止损
      description: "保守型策略，小盈小亏快速出场"
    },
    {
      name: "激进型策略", 
      takeProfitRatio: 110.0,  // 10%止盈
      stopLossRatio: 95.0,     // 5%止损
      description: "激进型策略，追求更高收益但承担更大风险"
    },
    {
      name: "只止损策略",
      takeProfitRatio: null,   // 不设置止盈
      stopLossRatio: 96.0,     // 4%止损
      description: "只设置止损，让利润奔跑"
    },
    {
      name: "只止盈策略",
      takeProfitRatio: 108.0,  // 8%止盈
      stopLossRatio: null,     // 不设置止损
      description: "只设置止盈，承担更大回撤风险"
    }
  ];

  console.log('正在创建多个不同止盈止损配置的策略...\n');

  for (let i = 0; i < strategies.length; i++) {
    const config = strategies[i];
    
    try {
      const strategyData = {
        name: config.name,
        description: config.description,
        positionType: "both",
        buyFee: 0.001,
        sellFee: 0.001,
        liquidationThreshold: 90,
        takeProfitRatio: config.takeProfitRatio,
        stopLossRatio: config.stopLossRatio,
        indicators: [
          {
            indicatorId: 1,
            priority: 1,
            parameters: [{ parameterId: 1, value: "20" }]
          }
        ],
        conditions: [
          {
            indicatorIndex: 0,
            comparisonType: "constant",
            constantValue: "50",
            operator: ">",
            conditionType: "value",
            action: "buy",
            priority: 1,
            group: 0
          }
        ]
      };

      const response = await api.post('/strategies', strategyData);
      
      console.log(`✅ 策略 ${i + 1} 创建成功: ${config.name}`);
      console.log(`   止盈: ${config.takeProfitRatio ? config.takeProfitRatio + '%' : '未设置'}`);
      console.log(`   止损: ${config.stopLossRatio ? config.stopLossRatio + '%' : '未设置'}\n`);
      
    } catch (error) {
      console.error(`❌ 策略 ${i + 1} 创建失败: ${config.name}`);
      console.error(`   错误: ${error.response?.data?.message || error.message}\n`);
    }
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'single') {
    // 创建单个策略
    await createStrategyWithStopLoss();
  } else if (args[0] === 'multiple') {
    // 创建多个策略
    await createMultipleStrategiesWithDifferentStops();
  } else {
    console.error('❌ 参数错误');
    console.log('用法:');
    console.log('  node create-strategy-with-stop-loss.js           # 创建单个带止盈止损的策略');
    console.log('  node create-strategy-with-stop-loss.js single    # 创建单个带止盈止损的策略');
    console.log('  node create-strategy-with-stop-loss.js multiple  # 创建多个不同配置的策略');
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
  createStrategyWithStopLoss,
  createMultipleStrategiesWithDifferentStops
};