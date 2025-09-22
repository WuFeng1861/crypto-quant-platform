const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3099';
const BACKTEST_ENDPOINT = '/backtest';

// 默认回测配置 - 根据 CreateBacktestDto 结构
const defaultBacktestConfig = {
  strategyId: 2, // 策略ID (数字)
  pairId: 1, // 交易对ID (数字)
  timeframeId: 1, // 时间框架ID (数字)
  startTime: '2021-01-01T00:00:00.000Z', // 开始时间 (ISO字符串)
  endTime: '2024-12-31T23:59:59.999Z', // 结束时间 (ISO字符串)
  initialCapital: 10000, // 初始资金
  earlyStopThreshold: 10, // 早停阈值 (可选，默认10%)
  positionDivision: 5 // 仓位分割 (可选，默认1表示全仓)
};

/**
 * 执行回测
 * @param {Object} config - 回测配置
 */
async function runBacktest(config = defaultBacktestConfig) {
  try {
    console.log('🚀 开始执行回测...');
    console.log('配置:', JSON.stringify(config, null, 2));
    
    // 发送回测请求
    const response = await axios.post(`${API_BASE_URL}${BACKTEST_ENDPOINT}`, config, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10*60*1000 // 5分钟超时
    });
    
    console.log('✅ 回测执行成功!');
    console.log('回测结果:', JSON.stringify(response.data, null, 2));
    
    // 如果有回测ID，可以查询详细结果
    if (response.data.id) {
      await getBacktestResult(response.data.id);
    }
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 回测执行失败:');
    
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
 * 获取回测结果详情
 * @param {string} backtestId - 回测ID
 */
async function getBacktestResult(backtestId) {
  try {
    console.log(`📊 获取回测结果 (ID: ${backtestId})...`);
    
    const response = await axios.get(`${API_BASE_URL}${BACKTEST_ENDPOINT}/${backtestId}`);
    
    console.log('📈 回测详细结果:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 获取回测结果失败:', error.message);
    throw error;
  }
}

/**
 * 获取所有回测记录
 */
async function getAllBacktests() {
  try {
    console.log('📋 获取所有回测记录...');
    
    const response = await axios.get(`${API_BASE_URL}${BACKTEST_ENDPOINT}`);
    
    console.log('📊 回测记录列表:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
    
  } catch (error) {
    console.error('❌ 获取回测记录失败:', error.message);
    throw error;
  }
}

/**
 * 检查服务状态
 */
async function checkServiceStatus() {
  try {
    console.log('🔍 检查服务状态...');
    
    const response = await axios.get(`${API_BASE_URL}/health`, {
      timeout: 5000
    });
    
    console.log('✅ 服务运行正常');
    console.log('服务状态:', response.data);
    
    return true;
    
  } catch (error) {
    console.error('❌ 服务不可用，请确保服务在端口 3099 上运行');
    return false;
  }
}

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    
    switch (command) {
      case 'run':
        // 运行回测
        if (args[1]) {
          // 如果提供了配置文件路径
          const configPath = args[1];
          const config = require(configPath);
          await runBacktest(config);
        } else {
          // 使用默认配置
          await runBacktest();
        }
        break;
        
      case 'list':
        // 列出所有回测
        await getAllBacktests();
        break;
        
      case 'get':
        // 获取特定回测结果
        if (!args[1]) {
          console.error('请提供回测ID: node run-backtest.js get <backtest-id>');
          process.exit(1);
        }
        await getBacktestResult(args[1]);
        break;
        
      case 'status':
        // 检查服务状态
        await checkServiceStatus();
        break;
        
      default:
        console.log(`
📊 回测执行工具

用法:
  node run-backtest.js run [config.json]  - 执行回测 (可选配置文件)
  node run-backtest.js list               - 列出所有回测记录
  node run-backtest.js get <id>           - 获取特定回测结果
  node run-backtest.js status             - 检查服务状态

示例:
  node run-backtest.js run                     # 使用默认配置执行回测
  node run-backtest.js run ./my-config.json    # 使用自定义配置执行回测
  node run-backtest.js list                    # 查看所有回测记录
  node run-backtest.js get abc123              # 获取ID为abc123的回测结果
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
  runBacktest,
  getBacktestResult,
  getAllBacktests,
  checkServiceStatus
};