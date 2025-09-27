/**
 * 策略CRUD功能测试脚本
 * 测试策略、指标和条件的创建、更新、删除功能
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

class StrategyCRUDTester {
  constructor() {
    this.createdStrategyId = null;
  }

  async runAllTests() {
    console.log('🚀 开始策略CRUD功能测试...\n');

    try {
      await this.testCreateStrategy();
      await this.testGetStrategy();
      await this.testUpdateStrategy();
      await this.testUpdateIndicator();
      await this.testUpdateCondition();
      await this.testDeleteCondition();
      await this.testDeleteIndicator();
      await this.testDeleteStrategy();
      
      console.log('✅ 所有测试通过！');
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      if (error.response) {
        console.error('响应数据:', error.response.data);
      }
    }
  }

  async testCreateStrategy() {
    console.log('📝 测试创建策略...');
    
    const strategyData = {
      name: "CRUD测试策略",
      description: "用于测试CRUD功能的策略",
      positionType: "both",
      buyFee: 0.001,
      sellFee: 0.001,
      liquidationThreshold: 90,
      indicators: [
        {
          indicatorId: 1,
          priority: 1,
          parameters: [
            { parameterId: 1, value: "12" },
            { parameterId: 2, value: "26" }
          ]
        },
        {
          indicatorId: 2,
          priority: 2,
          parameters: [
            { parameterId: 3, value: "14" }
          ]
        }
      ],
      conditions: [
        {
          indicatorIndex: 0,
          comparisonType: "indicator",
          comparedIndicatorIndex: 0,
          currentValuePath: "macd",
          comparedValuePath: "signal",
          operator: ">",
          conditionType: "crossover",
          action: "buy",
          priority: 1,
          customCode: "return indicatorValues[0].macd > indicatorValues[0].signal;"
        },
        {
          indicatorIndex: 1,
          comparisonType: "constant",
          constantValue: "70",
          operator: ">",
          conditionType: "value",
          action: "sell",
          priority: 2,
          customCode: "return indicatorValues[1].rsi > 70;"
        }
      ]
    };

    const response = await axios.post(`${BASE_URL}/strategies`, strategyData);
    this.createdStrategyId = response.data.id;
    
    console.log(`✅ 策略创建成功，ID: ${this.createdStrategyId}`);
  }

  async testGetStrategy() {
    console.log('📖 测试获取策略详情...');
    
    const response = await axios.get(`${BASE_URL}/strategies/with-details/${this.createdStrategyId}`);
    const strategy = response.data;
    
    console.log(`✅ 策略详情获取成功:`);
    console.log(`   - 名称: ${strategy.name}`);
    console.log(`   - 指标数量: ${strategy.indicators.length}`);
    console.log(`   - 条件数量: ${strategy.conditions.length}`);
  }

  async testUpdateStrategy() {
    console.log('🔄 测试更新策略...');
    
    const updateData = {
      name: "更新后的CRUD测试策略",
      description: "已更新的策略描述",
      buyFee: 0.002,
      indicators: [
        {
          indicatorId: 1,
          priority: 2,
          parameters: [
            { parameterId: 1, value: "14" },
            { parameterId: 2, value: "28" }
          ]
        }
        // 注意：这里只保留一个指标，第二个指标会被删除
      ],
      conditions: [
        {
          indicatorIndex: 0,
          comparisonType: "indicator",
          comparedIndicatorIndex: 0,
          currentValuePath: "macd",
          comparedValuePath: "signal",
          operator: ">=",
          conditionType: "crossover",
          action: "buy",
          priority: 1,
          customCode: "return indicatorValues[0].macd >= indicatorValues[0].signal;"
        }
        // 注意：这里只保留一个条件，第二个条件会被删除
      ]
    };

    const response = await axios.put(`${BASE_URL}/strategies/${this.createdStrategyId}`, updateData);
    
    console.log('✅ 策略更新成功');
    console.log(`   - 新名称: ${response.data.name}`);
    console.log(`   - 新手续费: ${response.data.buyFee}`);
  }

  async testUpdateIndicator() {
    console.log('🔧 测试更新指标...');
    
    const updateData = {
      priority: 1,
      parameters: [
        { parameterId: 1, value: "15" },
        { parameterId: 2, value: "30" }
      ]
    };

    await axios.put(`${BASE_URL}/strategies/${this.createdStrategyId}/indicators/1`, updateData);
    
    console.log('✅ 指标更新成功');
  }

  async testUpdateCondition() {
    console.log('⚙️ 测试更新条件...');
    
    // 首先获取条件ID
    const strategyResponse = await axios.get(`${BASE_URL}/strategies/with-details/${this.createdStrategyId}`);
    const conditionId = strategyResponse.data.conditions[0].id;
    
    const updateData = {
      operator: "<=",
      customCode: "return indicatorValues[0].macd <= indicatorValues[0].signal;",
      action: "sell"
    };

    await axios.put(`${BASE_URL}/strategies/${this.createdStrategyId}/conditions/${conditionId}`, updateData);
    
    console.log('✅ 条件更新成功');
  }

  async testDeleteCondition() {
    console.log('🗑️ 测试删除条件...');
    
    // 获取条件ID
    const strategyResponse = await axios.get(`${BASE_URL}/strategies/with-details/${this.createdStrategyId}`);
    const conditionId = strategyResponse.data.conditions[0].id;
    
    await axios.delete(`${BASE_URL}/strategies/${this.createdStrategyId}/conditions/${conditionId}`);
    
    console.log('✅ 条件删除成功');
  }

  async testDeleteIndicator() {
    console.log('🗑️ 测试删除指标...');
    
    await axios.delete(`${BASE_URL}/strategies/${this.createdStrategyId}/indicators/1`);
    
    console.log('✅ 指标删除成功');
  }

  async testDeleteStrategy() {
    console.log('🗑️ 测试删除策略...');
    
    await axios.delete(`${BASE_URL}/strategies/${this.createdStrategyId}`);
    
    console.log('✅ 策略删除成功');
    
    // 验证策略已被删除
    try {
      await axios.get(`${BASE_URL}/strategies/${this.createdStrategyId}`);
      throw new Error('策略应该已被删除');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ 确认策略已被删除');
      } else {
        throw error;
      }
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new StrategyCRUDTester();
  tester.runAllTests().catch(console.error);
}

module.exports = StrategyCRUDTester;