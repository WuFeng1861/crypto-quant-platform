const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3099';
const INDICATORS_ENDPOINT = '/indicators';

// 默认计算配置
const defaultCalculateConfig = {
  indicatorId: 1, // 指标ID
  pairId: 1, // 交易对ID
  timeframeId: 1, // 时间框架ID
  startTime: new Date('2024-01-01T00:00:00.000Z').getTime(), // 开始时间 (时间戳)
  endTime: new Date('2024-12-31T23:59:59.999Z').getTime(), // 结束时间 (时间戳)
  parameters: {} // 指标参数
};

/**
 * 使用价格数据计算指标
 * @param {Object} config - 计算配置
 */
async function calculateWithPriceData(config = defaultCalculateConfig) {
  try {
    console.log('📊 开始计算指标...');
    console.log('配置:', JSON.stringify(config, null, 2));
    
    const { indicatorId, ...requestData } = config;
    
    // 发送计算请求
    const response = await axios.post(
      `${API_BASE_URL}${INDICATORS_ENDPOINT}/${indicatorId}/calculate-with-data`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2分钟超时
      }
    );
    
    console.log('✅ 指标计算成功!');
    // console.log('📋 计算结果:', response.data);
    console.log(`📈 计算结果 (${response.data.data.length} 个数据点):`);
    
    // 显示前几个和后几个结果
    if (response.data.data.length > 0) {
      const showCount = Math.min(5, response.data.data.length);
      
      console.log('\n前', showCount, '个结果:');
      response.data.data.slice(0, showCount).forEach((item, index) => {
        console.log(`  ${index + 1}.`, JSON.stringify(item, null, 2));
      });
      
      if (response.data.data.length > showCount * 2) {
        console.log('\n...');
        console.log('\n后', showCount, '个结果:');
        response.data.data.slice(-showCount).forEach((item, index) => {
          console.log(`  ${response.data.data.length - showCount + index + 1}.`, JSON.stringify(item, null, 2));
        });
      } else if (response.data.data.length > showCount) {
        console.log('\n剩余结果:');
        response.data.data.slice(showCount).forEach((item, index) => {
          console.log(`  ${showCount + index + 1}.`, JSON.stringify(item, null, 2));
        });
      }
    }
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ 指标计算失败:');
    
    if (error.response) {
      // 服务器响应错误
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else if (error.request) {
      // 请求发送失败
      console.error('请求失败，请检查服务是否在端口 3099 上运行');
      console.error('错误详情:', error.message);
    } else {
      // 其他错误
      console.error('错误:', error.message);
    }
    
    throw error;
  }
}

/**
 * 获取所有指标列表
 */
async function getAllIndicators() {
  try {
    console.log('📋 获取所有指标...');
    
    const response = await axios.get(`${API_BASE_URL}${INDICATORS_ENDPOINT}`);
    
    console.log('📊 指标列表:');
    response.data.forEach((indicator, index) => {
      console.log(`  ${index + 1}. ID: ${indicator.id}, 名称: ${indicator.name}, 类型: ${indicator.type}`);
    });
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 获取指标列表失败:', error.message);
    throw error;
  }
}

/**
 * 获取指标详情
 * @param {number} indicatorId - 指标ID
 */
async function getIndicatorDetails(indicatorId) {
  try {
    console.log(`🔍 获取指标详情 (ID: ${indicatorId})...`);
    
    const response = await axios.get(`${API_BASE_URL}${INDICATORS_ENDPOINT}/${indicatorId}`);
    
    console.log('📊 指标详情:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 获取指标详情失败:', error.message);
    throw error;
  }
}

/**
 * 获取指标参数
 * @param {number} indicatorId - 指标ID
 */
async function getIndicatorParameters(indicatorId) {
  try {
    console.log(`⚙️  获取指标参数 (ID: ${indicatorId})...`);
    
    const response = await axios.get(`${API_BASE_URL}${INDICATORS_ENDPOINT}/${indicatorId}/parameters`);
    
    console.log('📋 指标参数:');
    response.data.forEach((param, index) => {
      console.log(`  ${index + 1}. ${param.name}: ${param.description || 'N/A'}`);
      console.log(`     类型: ${param.type}, 默认值: ${param.defaultValue}`);
      if (param.minValue !== null || param.maxValue !== null) {
        console.log(`     范围: ${param.minValue || 'N/A'} - ${param.maxValue || 'N/A'}`);
      }
    });
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 获取指标参数失败:', error.message);
    throw error;
  }
}

/**
 * 使用交易对符号计算指标
 * @param {Object} config - 计算配置
 */
async function calculateBySymbol(config) {
  try {
    console.log('📊 使用交易对符号计算指标...');
    console.log('配置:', JSON.stringify(config, null, 2));
    
    const { indicatorId, ...requestData } = config;
    
    const response = await axios.post(
      `${API_BASE_URL}${INDICATORS_ENDPOINT}/${indicatorId}/calculate-by-symbol`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );
    
    console.log('✅ 指标计算成功!');
    console.log(`📈 计算结果 (${response.data.length} 个数据点)`);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 指标计算失败:', error.message);
    throw error;
  }
}

// 预设配置示例
const presetConfigs = {
  // 移动平均线
  ma: {
    indicatorId: 3,
    pairId: 1,
    timeframeId: 1,
    startTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
    endTime: new Date('2024-12-30T23:59:59.999Z').getTime(),
    parameters: {
      period: 5
    }
  },
  
  // RSI
  rsi: {
    indicatorId: 5,
    pairId: 1,
    timeframeId: 1,
    startTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
    endTime: new Date('2024-12-30T23:59:59.999Z').getTime(),
    parameters: {
      period: 14
    }
  },
  
  // MACD
  macd: {
    indicatorId: 7,
    pairId: 1,
    timeframeId: 1,
    startTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
    endTime: new Date('2024-12-30T23:59:59.999Z').getTime(),
    parameters: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9
    }
  },

  // ATR
  atr: {
    indicatorId: 9,
    pairId: 1,
    timeframeId: 1,
    startTime: new Date('2024-01-01T00:00:00.000Z').getTime(),
    endTime: new Date('2024-12-30T23:59:59.999Z').getTime(),
    parameters: {
      period: 14
    }
  }
};

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    
    switch (command) {
      case 'calculate':
      case 'calc':
        // 计算指标
        if (args[1]) {
          // 如果提供了配置文件路径
          const configPath = args[1];
          const config = require(configPath);
          await calculateWithPriceData(config);
        } else {
          // 使用默认配置
          await calculateWithPriceData();
        }
        break;
        
      case 'preset':
        // 使用预设配置
        const presetName = args[1];
        if (!presetName || !presetConfigs[presetName]) {
          console.error('可用的预设配置:', Object.keys(presetConfigs).join(', '));
          process.exit(1);
        }
        await calculateWithPriceData(presetConfigs[presetName]);
        break;
        
      case 'list':
        // 列出所有指标
        await getAllIndicators();
        break;
        
      case 'info':
        // 获取指标详情
        if (!args[1]) {
          console.error('请提供指标ID: node calculate-with-price-data.js info <indicator-id>');
          process.exit(1);
        }
        await getIndicatorDetails(parseInt(args[1]));
        break;
        
      case 'params':
        // 获取指标参数
        if (!args[1]) {
          console.error('请提供指标ID: node calculate-with-price-data.js params <indicator-id>');
          process.exit(1);
        }
        await getIndicatorParameters(parseInt(args[1]));
        break;
        
      case 'symbol':
        // 使用交易对符号计算
        if (!args[1]) {
          console.error('请提供配置文件: node calculate-with-price-data.js symbol <config.json>');
          process.exit(1);
        }
        const symbolConfig = require(args[1]);
        await calculateBySymbol(symbolConfig);
        break;
        
      case 'status':
        // 检查服务状态
        await checkServiceStatus();
        break;
        
      default:
        console.log(`
📊 指标计算工具

用法:
  node calculate-with-price-data.js calculate [config.json]  - 计算指标 (可选配置文件)
  node calculate-with-price-data.js preset <name>           - 使用预设配置计算
  node calculate-with-price-data.js list                    - 列出所有指标
  node calculate-with-price-data.js info <id>               - 获取指标详情
  node calculate-with-price-data.js params <id>             - 获取指标参数
  node calculate-with-price-data.js symbol <config.json>    - 使用交易对符号计算
  node calculate-with-price-data.js status                  - 检查服务状态

预设配置:
  ${Object.keys(presetConfigs).map(key => `${key} - ${presetConfigs[key].parameters ? Object.keys(presetConfigs[key].parameters).join(', ') : 'N/A'}`).join('\n  ')}

示例:
  node calculate-with-price-data.js calculate               # 使用默认配置
  node calculate-with-price-data.js calculate ./my-config.json  # 使用自定义配置
  node calculate-with-price-data.js preset ma               # 计算移动平均线
  node calculate-with-price-data.js list                    # 查看所有指标
  node calculate-with-price-data.js info 1                  # 查看指标1的详情
  node calculate-with-price-data.js params 1                # 查看指标1的参数
        `);
    }
    
  } catch (error) {
    console.error('程序执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

// 导出函数供其他模块使用
module.exports = {
  calculateWithPriceData,
  calculateBySymbol,
  getAllIndicators,
  getIndicatorDetails,
  getIndicatorParameters,
  presetConfigs
};