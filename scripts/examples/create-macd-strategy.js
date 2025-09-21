const axios = require('axios');

/* 配置 */
const config = {
  baseURL: 'http://localhost:3099',
  timeout: 30000
};

/* 创建带有 MACD 金叉死叉条件的策略示例 */
async function createMACDStrategy() {
  try {
    console.log('🚀 开始创建 MACD 金叉死叉策略...\n');

    /* 策略基本信息 */
    const strategyData = {
      name: 'MACD金叉死叉策略',
      description: '使用MACD指标的金叉死叉信号进行交易，展示复杂对象属性比较功能',
      positionType: 'long',
      buyFeeRate: 0.001,
      sellFeeRate: 0.001,
      takeProfitRatio: 105.0,  /* 5% 止盈 */
      stopLossRatio: 97.0,     /* 3% 止损 */
      
      /* 指标配置 */
      indicators: [
        {
          indicatorId: 5,  /* MACD 指标 ID */
          parameters: [
            { parameterId: 13, value: '12' },  /* 快速周期 */
            { parameterId: 14, value: '26' },  /* 慢速周期 */
            { parameterId: 15, value: '9' }    /* 信号线周期 */
          ]
        }
      ],
      
      /* 交易条件 */
      conditions: [
        /* 买入条件：MACD 线上穿信号线（金叉） */
        {
          indicatorIndex: 0,
          comparisonType: 'indicator',
          comparedIndicatorIndex: 0,
          currentValuePath: 'macd',      /* 使用 MACD 线 */
          comparedValuePath: 'signal',   /* 比较信号线 */
          operator: '>',
          conditionType: 'crossover',    /* 交叉条件 */
          action: 'buy',
          group: 1,
          priority: 1
        },
        
        /* 卖出条件：MACD 线下穿信号线（死叉） */
        {
          indicatorIndex: 0,
          comparisonType: 'indicator',
          comparedIndicatorIndex: 0,
          currentValuePath: 'macd',      /* 使用 MACD 线 */
          comparedValuePath: 'signal',   /* 比较信号线 */
          operator: '<',
          conditionType: 'crossover',    /* 交叉条件 */
          action: 'sell',
          group: 1,
          priority: 1
        },
        
        /* 额外条件：MACD 柱状图为正（确认上涨趋势） */
        {
          indicatorIndex: 0,
          comparisonType: 'constant',
          constantValue: '0',
          currentValuePath: 'histogram', /* 使用柱状图 */
          operator: '>',
          conditionType: 'value',
          action: 'buy',
          group: 2,  /* 不同组，OR 逻辑 */
          priority: 2
        }
      ]
    };

    /* 发送创建请求 */
    const response = await axios.post(`${config.baseURL}/strategies`, strategyData, {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 201) {
      console.log('✅ MACD 策略创建成功！');
      console.log(`📊 策略ID: ${response.data.data.id}`);
      console.log(`📝 策略名称: ${response.data.data.name}`);
      console.log(`📈 持仓类型: ${response.data.data.positionType}`);
      console.log(`💰 止盈比例: ${response.data.data.takeProfitRatio}%`);
      console.log(`🛡️ 止损比例: ${response.data.data.stopLossRatio}%`);
      
      console.log('\n📋 指标配置:');
      response.data.data.indicators?.forEach((indicator, index) => {
        console.log(`   指标 ${index}: MACD`);
        indicator.parameters?.forEach(param => {
          console.log(`     参数: ${param.value}`);
        });
      });
      
      console.log('\n🎯 交易条件:');
      response.data.data.conditions?.forEach((condition, index) => {
        console.log(`   条件 ${index + 1}:`);
        console.log(`     当前值路径: ${condition.currentValuePath || '直接使用'}`);
        console.log(`     比较值路径: ${condition.comparedValuePath || '直接使用'}`);
        console.log(`     操作符: ${condition.operator}`);
        console.log(`     条件类型: ${condition.conditionType}`);
        console.log(`     执行动作: ${condition.action}`);
        console.log(`     条件组: ${condition.group}`);
      });
      
    } else {
      console.error('❌ 策略创建失败');
      console.error('响应状态:', response.status);
      console.error('响应数据:', response.data);
    }

  } catch (error) {
    console.error('❌ 创建策略时发生错误:');
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else if (error.request) {
      console.error('网络错误: 无法连接到服务器');
      console.error('请确保服务器运行在', config.baseURL);
    } else {
      console.error('错误:', error.message);
    }
  }
}

/* 显示帮助信息 */
function showHelp() {
  console.log(`
📖 MACD 策略创建脚本使用说明

🎯 功能：
   创建一个使用 MACD 指标金叉死叉信号的交易策略
   展示复杂对象属性路径比较功能

🔧 MACD 对象结构：
   {
     macd: 0.123,      // MACD 线
     signal: 0.098,    // 信号线  
     histogram: 0.025  // 柱状图
   }

📊 策略逻辑：
   • 买入：MACD 线上穿信号线（金叉）
   • 卖出：MACD 线下穿信号线（死叉）
   • 确认：MACD 柱状图为正值

🚀 使用方法：
   node scripts/examples/create-macd-strategy.js

⚙️ 前置条件：
   • 确保服务器运行在 http://localhost:3099
   • 数据库中存在 MACD 指标定义
   • 已执行属性路径字段的数据库迁移
  `);
}

/* 检查命令行参数 */
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
} else {
  createMACDStrategy();
}