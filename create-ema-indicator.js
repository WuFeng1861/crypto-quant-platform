const axios = require('axios');

// 创建EMA指标的函数
async function createEMAIndicator() {
  try {
    const response = await axios.post('http://localhost:3099/indicators', {
      name: "指数移动平均线_EMA",
      description: "计算价格的指数移动平均线",
      calculationCode: "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; let ema = null; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push(null); continue; } if (ema === null) { let sum = 0; for (let j = 0; j < period; j++) { sum += priceData[i - j].close_price; } ema = sum / period; } else { const k = 2 / (period + 1); ema = priceData[i].close_price * k + ema * (1 - k); } result.push(ema); } return result; }",
      parameters: [
        {
          name: "period",
          description: "周期",
          defaultValue: "14",
          paramType: "number"
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('EMA指标创建成功:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('创建EMA指标失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 测试EMA指标的函数
async function testEMAIndicator(indicatorId) {
  try {
    const testData = {
      priceData: [
        {"close_price": 100},
        {"close_price": 105},
        {"close_price": 110},
        {"close_price": 115},
        {"close_price": 120},
        {"close_price": 125},
        {"close_price": 130},
        {"close_price": 135},
        {"close_price": 140},
        {"close_price": 145},
        {"close_price": 150},
        {"close_price": 155},
        {"close_price": 160},
        {"close_price": 165},
        {"close_price": 170}
      ],
      parameters: {
        period: 5
      }
    };

    const response = await axios.post(`http://localhost:3099/indicators/${indicatorId}/calculate`, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('EMA指标测试结果:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('测试EMA指标失败:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 创建EMA指标
    const createResult = await createEMAIndicator();
    
    // 如果创建成功，测试该指标
    if (createResult && createResult.data && createResult.data.id) {
      await testEMAIndicator(createResult.data.id);
    } else {
      // 如果无法获取新创建的指标ID，尝试获取所有指标并测试最后一个
      const allIndicators = await axios.get('http://localhost:3099/indicators');
      if (allIndicators.data && allIndicators.data.data && allIndicators.data.data.length > 0) {
        const lastIndicator = allIndicators.data.data[allIndicators.data.data.length - 1];
        console.log(`使用现有指标进行测试 (ID: ${lastIndicator.id})`);
        await testEMAIndicator(lastIndicator.id);
      }
    }
  } catch (error) {
    console.error('执行失败:', error);
  }
}

// 执行主函数
main();