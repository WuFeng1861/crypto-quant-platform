const axios = require('axios');

// 创建双均线交叉策略的函数
async function createMACrossoverStrategy() {
  try {
    const response = await axios.post('http://localhost:3099/strategies', {
      name: "双均线交叉策略",
      description: "当短期均线上穿长期均线时买入，下穿时卖出",
      positionType: "both",
      buyFee: 0.001,
      sellFee: 0.001,
      liquidationThreshold: 90,
      indicators: [
        {
          indicatorId: 3,
          priority: 0,
          parameters: [
            {
              parameterId: 3,
              value: "5"
            }
          ]
        },
        {
          indicatorId: 3,
          priority: 1,
          parameters: [
            {
              parameterId: 3,
              value: "20"
            }
          ]
        }
      ],
      conditions: [
        {
          indicatorId: 1,
          comparisonType: "indicator",
          comparedIndicatorId: 2,
          operator: ">",
          conditionType: "crossover",
          action: "buy",
          priority: 0
        },
        {
          indicatorId: 1,
          comparisonType: "indicator",
          comparedIndicatorId: 2,
          operator: "<",
          conditionType: "crossover",
          action: "sell",
          priority: 1
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('双均线交叉策略创建成功:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('创建双均线交叉策略失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    console.log("开始创建双均线交叉策略...");
    await createMACrossoverStrategy();
    console.log("双均线交叉策略创建完成！");
  } catch (error) {
    console.error("创建策略过程中出错:", error);
  }
}

// 执行主函数
main();