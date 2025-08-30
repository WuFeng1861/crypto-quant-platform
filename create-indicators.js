const axios = require('axios');

// 创建指标的通用函数
async function createIndicator(indicatorData) {
  try {
    const response = await axios.post('http://localhost:3099/indicators', indicatorData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`${indicatorData.name} 指标创建成功:`);
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error(`创建 ${indicatorData.name} 指标失败:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

// 定义所有指标数据
const indicators = [
  // 1. RSI指标
  {
    name: "相对强弱指数_RSI",
    description: "计算价格的相对强弱指数",
    calculationCode: "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; let gains = 0; let losses = 0; for (let i = 0; i < priceData.length; i++) { if (i === 0) { result.push(null); continue; } const change = priceData[i].close_price - priceData[i-1].close_price; if (i < period) { if (change >= 0) gains += change; else losses -= change; if (i === period - 1) { const avgGain = gains / period; const avgLoss = losses / period; const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; const rsi = 100 - (100 / (1 + rs)); result.push(rsi); } else { result.push(null); } } else { let avgGain = (gains * (period - 1) + (change >= 0 ? change : 0)) / period; let avgLoss = (losses * (period - 1) + (change < 0 ? -change : 0)) / period; gains = avgGain; losses = avgLoss; const rs = avgLoss === 0 ? 100 : avgGain / avgLoss; const rsi = 100 - (100 / (1 + rs)); result.push(rsi); } } return result; }",
    parameters: [
      {
        name: "period",
        description: "周期",
        defaultValue: "14",
        paramType: "number"
      }
    ]
  },
  
  // 2. 布林带指标
  {
    name: "布林带_Bollinger Bands",
    description: "计算价格的布林带上中下轨",
    calculationCode: "function calculate(priceData, parameters) { const period = parameters.period || 20; const stdDev = parameters.stdDev || 2; const result = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push({ middle: null, upper: null, lower: null }); continue; } let sum = 0; for (let j = 0; j < period; j++) { sum += priceData[i - j].close_price; } const sma = sum / period; let sumSquares = 0; for (let j = 0; j < period; j++) { sumSquares += Math.pow(priceData[i - j].close_price - sma, 2); } const std = Math.sqrt(sumSquares / period); result.push({ middle: sma, upper: sma + stdDev * std, lower: sma - stdDev * std }); } return result; }",
    parameters: [
      {
        name: "period",
        description: "周期",
        defaultValue: "20",
        paramType: "number"
      },
      {
        name: "stdDev",
        description: "标准差倍数",
        defaultValue: "2",
        paramType: "number"
      }
    ]
  },
  
  // 3. MACD指标
  {
    name: "MACD",
    description: "计算价格的MACD指标",
    calculationCode: "function calculate(priceData, parameters) { const fastPeriod = parameters.fastPeriod || 12; const slowPeriod = parameters.slowPeriod || 26; const signalPeriod = parameters.signalPeriod || 9; const result = []; let fastEMA = null; let slowEMA = null; let macdLine = []; let signalLine = null; for (let i = 0; i < priceData.length; i++) { // 计算快速EMA if (i < fastPeriod - 1) { result.push({ macd: null, signal: null, histogram: null }); continue; } if (fastEMA === null) { let sum = 0; for (let j = 0; j < fastPeriod; j++) { sum += priceData[i - j].close_price; } fastEMA = sum / fastPeriod; } else { const k = 2 / (fastPeriod + 1); fastEMA = priceData[i].close_price * k + fastEMA * (1 - k); } // 计算慢速EMA if (i < slowPeriod - 1) { result.push({ macd: null, signal: null, histogram: null }); continue; } if (slowEMA === null) { let sum = 0; for (let j = 0; j < slowPeriod; j++) { sum += priceData[i - j].close_price; } slowEMA = sum / slowPeriod; } else { const k = 2 / (slowPeriod + 1); slowEMA = priceData[i].close_price * k + slowEMA * (1 - k); } // 计算MACD线 const macd = fastEMA - slowEMA; macdLine.push(macd); // 计算信号线 if (macdLine.length >= signalPeriod) { if (signalLine === null) { let sum = 0; for (let j = 0; j < signalPeriod; j++) { sum += macdLine[macdLine.length - 1 - j]; } signalLine = sum / signalPeriod; } else { const k = 2 / (signalPeriod + 1); signalLine = macd * k + signalLine * (1 - k); } // 计算柱状图 const histogram = macd - signalLine; result.push({ macd, signal: signalLine, histogram }); } else { result.push({ macd, signal: null, histogram: null }); } } return result; }",
    parameters: [
      {
        name: "fastPeriod",
        description: "快线周期",
        defaultValue: "12",
        paramType: "number"
      },
      {
        name: "slowPeriod",
        description: "慢线周期",
        defaultValue: "26",
        paramType: "number"
      },
      {
        name: "signalPeriod",
        description: "信号线周期",
        defaultValue: "9",
        paramType: "number"
      }
    ]
  },
  
  // 4. KDJ指标
  {
    name: "KDJ",
    description: "计算价格的KDJ随机指标",
    calculationCode: "function calculate(priceData, parameters) { const period = parameters.period || 9; const kPeriod = parameters.kPeriod || 3; const dPeriod = parameters.dPeriod || 3; const result = []; let kValues = []; let dValues = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push({ k: null, d: null, j: null }); continue; } let highestHigh = -Infinity; let lowestLow = Infinity; for (let j = 0; j < period; j++) { const high = priceData[i - j].high_price; const low = priceData[i - j].low_price; if (high > highestHigh) highestHigh = high; if (low < lowestLow) lowestLow = low; } const close = priceData[i].close_price; const rsv = (highestHigh === lowestLow) ? 50 : ((close - lowestLow) / (highestHigh - lowestLow)) * 100; let k; if (kValues.length === 0) { k = rsv; } else { k = (kValues[kValues.length - 1] * (kPeriod - 1) + rsv) / kPeriod; } kValues.push(k); let d; if (dValues.length === 0) { d = k; } else { d = (dValues[dValues.length - 1] * (dPeriod - 1) + k) / dPeriod; } dValues.push(d); const j = 3 * k - 2 * d; result.push({ k, d, j }); } return result; }",
    parameters: [
      {
        name: "period",
        description: "周期",
        defaultValue: "9",
        paramType: "number"
      },
      {
        name: "kPeriod",
        description: "K值周期",
        defaultValue: "3",
        paramType: "number"
      },
      {
        name: "dPeriod",
        description: "D值周期",
        defaultValue: "3",
        paramType: "number"
      }
    ]
  },
  
  // 5. ATR指标
  {
    name: "平均真实波幅_ATR",
    description: "计算价格的平均真实波幅",
    calculationCode: "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; let atr = null; for (let i = 0; i < priceData.length; i++) { if (i === 0) { result.push(null); continue; } const high = priceData[i].high_price; const low = priceData[i].low_price; const prevClose = priceData[i-1].close_price; const tr1 = high - low; const tr2 = Math.abs(high - prevClose); const tr3 = Math.abs(low - prevClose); const tr = Math.max(tr1, tr2, tr3); if (atr === null) { if (i >= period) { let sum = 0; for (let j = 0; j < period; j++) { const h = priceData[i - j].high_price; const l = priceData[i - j].low_price; const pc = priceData[i - j - 1].close_price; sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)); } atr = sum / period; result.push(atr); } else { result.push(null); } } else { atr = ((atr * (period - 1)) + tr) / period; result.push(atr); } } return result; }",
    parameters: [
      {
        name: "period",
        description: "周期",
        defaultValue: "14",
        paramType: "number"
      }
    ]
  }
];

// 主函数
async function main() {
  try {
    console.log("开始创建指标...");
    
    // 依次创建所有指标
    for (const indicator of indicators) {
      console.log(`正在创建 ${indicator.name} 指标...`);
      await createIndicator(indicator);
      console.log(`${indicator.name} 指标创建完成\n`);
    }
    
    console.log("所有指标创建完成！");
  } catch (error) {
    console.error("创建指标过程中出错:", error);
  }
}

// 执行主函数
main();