import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

// 手动解析 .env 文件
const envPath = path.join(__dirname, '../../.env');
const envConfig = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .reduce((acc: any, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

const BAOSTOCK_DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '666666',
  database: 'stock_data',
};

const QUANT_DB_CONFIG = {
  host: envConfig.DB_HOST || 'localhost',
  port: parseInt(envConfig.DB_PORT || '3306'),
  user: envConfig.DB_USERNAME || 'root',
  password: envConfig.DB_PASSWORD || '666666',
  database: envConfig.DB_DATABASE || 'crypto_data',
};

async function verify() {
  let baostockConn: mysql.Connection | null = null;
  let quantConn: mysql.Connection | null = null;

  try {
    console.log('正在连接数据库进行验证...');
    baostockConn = await mysql.createConnection(BAOSTOCK_DB_CONFIG);
    quantConn = await mysql.createConnection(QUANT_DB_CONFIG);

    // 1. 验证 Trading Pairs 数量
    console.log('\n--- 1. 验证交易对 (Trading Pairs) ---');
    const [baostockStockCount]: any = await baostockConn.execute(
      "SELECT COUNT(*) as count FROM stock_info WHERE status = '1'"
    );
    const [quantPairCount]: any = await quantConn.execute(
      "SELECT COUNT(*) as count FROM trading_pairs WHERE symbol LIKE '%-CNY'"
    );

    console.log(`源数据库活跃股票数 (status=1): ${baostockStockCount[0].count}`);
    console.log(`目标数据库股票交易对数 (*-CNY): ${quantPairCount[0].count}`);

    if (baostockStockCount[0].count === quantPairCount[0].count) {
      console.log('✅ 交易对数量匹配！');
    } else {
      console.log('❌ 交易对数量不匹配，请检查是否有漏掉的股票。');
    }

    // 2. 验证 K 线数据总量
    console.log('\n--- 2. 验证 K 线数据总量 ---');
    const [baostockDayCount]: any = await baostockConn.execute(
      'SELECT COUNT(*) as count FROM kline_day WHERE adjust_type = "qfq"'
    );
    const [baostockHourCount]: any = await baostockConn.execute(
      'SELECT COUNT(*) as count FROM kline_60min WHERE adjust_type = "qfq"'
    );

    // 获取 timeframe ID
    const [tfRows]: any = await quantConn.execute('SELECT id, name FROM timeframes WHERE name IN ("1D", "1H")');
    const timeframeMap = tfRows.reduce((acc: any, row: any) => {
      acc[row.name] = row.id;
      return acc;
    }, {});

    const [quantDayCount]: any = await quantConn.execute(
      'SELECT COUNT(*) as count FROM price_data p JOIN trading_pairs t ON p.pair_id = t.id WHERE t.symbol LIKE "%-CNY" AND p.timeframe_id = ?',
      [timeframeMap['1D']]
    );
    const [quantHourCount]: any = await quantConn.execute(
      'SELECT COUNT(*) as count FROM price_data p JOIN trading_pairs t ON p.pair_id = t.id WHERE t.symbol LIKE "%-CNY" AND p.timeframe_id = ?',
      [timeframeMap['1H']]
    );

    console.log(`源数据库日线数据量 (qfq): ${baostockDayCount[0].count}`);
    console.log(`目标数据库日线数据量 (1D): ${quantDayCount[0].count}`);
    console.log(`源数据库60分钟数据量 (qfq): ${baostockHourCount[0].count}`);
    console.log(`目标数据库60分钟数据量 (1H): ${quantHourCount[0].count}`);

    if (baostockDayCount[0].count === quantDayCount[0].count) {
      console.log('✅ 日线数据总量匹配！');
    } else {
      console.log(`❌ 日线数据总量不匹配 (差异: ${baostockDayCount[0].count - quantDayCount[0].count})`);
    }

    if (baostockHourCount[0].count === quantHourCount[0].count) {
      console.log('✅ 60分钟数据总量匹配！');
    } else {
      console.log(`❌ 60分钟数据总量不匹配 (差异: ${baostockHourCount[0].count - quantHourCount[0].count})`);
    }

    // 3. 抽样验证具体股票
    console.log('\n--- 3. 抽样验证具体股票 (随机 5 只) ---');
    const [sampleStocks]: any = await baostockConn.execute(
      "SELECT code FROM stock_info WHERE status = '1' ORDER BY RAND() LIMIT 5"
    );

    for (const stock of sampleStocks) {
      const stockCode = stock.code;
      const symbol = `${stockCode}-CNY`;

      const [bDay]: any = await baostockConn.execute(
        'SELECT COUNT(*) as count FROM kline_day WHERE code = ? AND adjust_type = "qfq"',
        [stockCode]
      );
      const [qDay]: any = await quantConn.execute(
        'SELECT COUNT(*) as count FROM price_data p JOIN trading_pairs t ON p.pair_id = t.id WHERE t.symbol = ? AND p.timeframe_id = ?',
        [symbol, timeframeMap['1D']]
      );

      const [bHour]: any = await baostockConn.execute(
        'SELECT COUNT(*) as count FROM kline_60min WHERE code = ? AND adjust_type = "qfq"',
        [stockCode]
      );
      const [qHour]: any = await quantConn.execute(
        'SELECT COUNT(*) as count FROM price_data p JOIN trading_pairs t ON p.pair_id = t.id WHERE t.symbol = ? AND p.timeframe_id = ?',
        [symbol, timeframeMap['1H']]
      );

      console.log(`[${stockCode}] 日线: 源(${bDay[0].count}) vs 目标(${qDay[0].count}) | 60分: 源(${bHour[0].count}) vs 目标(${qHour[0].count})`);
    }

  } catch (error) {
    console.error('验证过程中发生错误:', error);
  } finally {
    if (baostockConn) await baostockConn.end();
    if (quantConn) await quantConn.end();
  }
}

verify();
