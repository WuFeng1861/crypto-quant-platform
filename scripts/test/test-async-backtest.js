// 测试异步回测功能
const axios = require('axios');

async function testAsyncBacktest() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('开始测试异步回测功能...');
    
    // 1. 启动回测
    const backtestData = {
      strategyId: 1,
      pairId: 1,
      timeframeId: 1,
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-01-31T23:59:59Z',
      initialCapital: 10000,
      positionDivision: 1,
      earlyStopThreshold: 10
    };
    
    console.log('发送回测请求...');
    const startResponse = await axios.post(`${baseURL}/backtest`, backtestData);
    console.log('回测启动响应:', startResponse.data);
    
    if (startResponse.data.success && startResponse.data.backtestId) {
      const backtestId = startResponse.data.backtestId;
      console.log(`回测已启动，ID: ${backtestId}`);
      
      // 2. 等待一段时间后查询结果
      console.log('等待 5 秒后查询结果...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 3. 查询单个回测结果
      console.log('查询回测结果...');
      const resultResponse = await axios.get(`${baseURL}/backtest/${backtestId}`);
      console.log('回测结果:', {
        id: resultResponse.data.id,
        status: resultResponse.data.status, // 'running', 'completed', 'failed'
        finalCapital: resultResponse.data.finalCapital,
        totalProfit: resultResponse.data.totalProfit,
        profitRate: resultResponse.data.profitRate,
        totalTrades: resultResponse.data.totalTrades,
        winRate: resultResponse.data.winRate
      });
      
      // 如果还在运行中，可以继续等待
      if (resultResponse.data.status === 'running') {
        console.log('回测仍在运行中，可以稍后再次查询...');
      } else if (resultResponse.data.status === 'completed') {
        console.log('回测已完成！');
      } else if (resultResponse.data.status === 'failed') {
        console.log('回测失败:', resultResponse.data.earlyStopReason);
      }
      
      // 4. 查询所有回测结果
      console.log('查询所有回测结果...');
      const allResultsResponse = await axios.get(`${baseURL}/backtest`);
      console.log(`找到 ${allResultsResponse.data.length} 个回测结果`);
      
      // 显示最近的几个结果
      const recentResults = allResultsResponse.data.slice(-3).map(result => ({
        id: result.id,
        status: result.status,
        createdAt: result.createdAt,
        finalCapital: result.finalCapital,
        profitRate: result.profitRate
      }));
      console.log('最近的回测结果:', recentResults);
      
    } else {
      console.error('回测启动失败:', startResponse.data);
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testAsyncBacktest();