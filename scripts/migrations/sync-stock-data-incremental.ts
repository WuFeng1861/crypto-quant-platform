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

async function syncIncremental() {
  let baostockConn: mysql.Connection | null = null;
  let quantConn: mysql.Connection | null = null;

  try {
    console.log('正在连接数据库进行增量同步...');
    baostockConn = await mysql.createConnection(BAOSTOCK_DB_CONFIG);
    quantConn = await mysql.createConnection(QUANT_DB_CONFIG);
    console.log('数据库连接成功！');

    // 1. 获取 Timeframes ID
    const [tfRows]: any = await quantConn.execute('SELECT id, name FROM timeframes WHERE name IN ("1D", "1H")');
    const timeframeMap = tfRows.reduce((acc: any, row: any) => {
      acc[row.name] = row.id;
      return acc;
    }, {});

    if (!timeframeMap['1D'] || !timeframeMap['1H']) {
      throw new Error('目标数据库中缺少 1D 或 1H 时间周期，请先检查 timeframes 表。');
    }

    // 2. 更新 Trading Pairs (检查是否有新股票)
    console.log('正在同步交易对 (Trading Pairs)...');
    const [stockRows]: any = await baostockConn.execute(
      "SELECT code FROM stock_info WHERE status = '1'"
    );

    for (const stock of stockRows) {
      const symbol = `${stock.code}-CNY`;
      await quantConn.execute(
        'INSERT IGNORE INTO trading_pairs (symbol, base_asset, quote_asset) VALUES (?, ?, ?)',
        [symbol, stock.code, 'CNY']
      );
    }

    const [pairRows]: any = await quantConn.execute('SELECT id, base_asset FROM trading_pairs WHERE symbol LIKE "%-CNY"');
    const pairMap = pairRows.reduce((acc: any, row: any) => {
      acc[row.base_asset] = row.id;
      return acc;
    }, {});

    // 3. 执行增量同步
    console.log(`开始对 ${stockRows.length} 只股票进行增量同步...`);
    let totalInserted = 0;
    let count = 0;

    for (const stock of stockRows) {
      count++;
      const stockCode = stock.code;
      const pairId = pairMap[stockCode];

      if (count % 100 === 0) {
        console.log(`进度: ${count}/${stockRows.length} (${((count / stockRows.length) * 100).toFixed(2)}%) | 已插入: ${totalInserted}`);
      }

      // --- 增量同步 1D 数据 ---
      const [maxDayTsRow]: any = await quantConn.execute(
        'SELECT MAX(timestamp) as max_ts FROM price_data WHERE pair_id = ? AND timeframe_id = ?',
        [pairId, timeframeMap['1D']]
      );
      const lastDayTs = maxDayTsRow[0].max_ts || 0;

      const [newDayKlines]: any = await baostockConn.execute(
        'SELECT date, open, high, low, close, volume, amount FROM kline_day WHERE code = ? AND adjust_type = "qfq"',
        [stockCode]
      );

      const dayValuesToInsert = newDayKlines.map((k: any) => {
        const dateStr = k.date instanceof Date ? k.date.toISOString().split('T')[0] : k.date;
        const timestamp = new Date(`${dateStr}T15:00:00+08:00`).getTime();
        return { timestamp, data: [pairId, timeframeMap['1D'], timestamp, k.open, k.high, k.low, k.close, k.volume, k.amount, k.amount, 1] };
      }).filter((item: any) => item.timestamp > lastDayTs);

      if (dayValuesToInsert.length > 0) {
        await quantConn.query(
          'INSERT IGNORE INTO price_data (pair_id, timeframe_id, timestamp, open_price, high_price, low_price, close_price, volume, volume_currency, volume_currency_quote, confirmed) VALUES ?',
          [dayValuesToInsert.map(i => i.data)]
        );
        totalInserted += dayValuesToInsert.length;
      }

      // --- 增量同步 1H 数据 ---
      const [maxHourTsRow]: any = await quantConn.execute(
        'SELECT MAX(timestamp) as max_ts FROM price_data WHERE pair_id = ? AND timeframe_id = ?',
        [pairId, timeframeMap['1H']]
      );
      const lastHourTs = maxHourTsRow[0].max_ts || 0;

      const [newHourKlines]: any = await baostockConn.execute(
        'SELECT date, time, open, high, low, close, volume, amount FROM kline_60min WHERE code = ? AND adjust_type = "qfq"',
        [stockCode]
      );

      const hourValuesToInsert = newHourKlines.map((k: any) => {
        if (!k.time || k.time.length < 14) return null;
        const year = k.time.substring(0, 4);
        const month = k.time.substring(4, 6);
        const day = k.time.substring(6, 8);
        const hour = k.time.substring(8, 10);
        const min = k.time.substring(10, 12);
        const sec = k.time.substring(12, 14);
        const timestamp = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}+08:00`).getTime();
        return { timestamp, data: [pairId, timeframeMap['1H'], timestamp, k.open, k.high, k.low, k.close, k.volume, k.amount, k.amount, 1] };
      }).filter((item: any) => item !== null && item.timestamp > lastHourTs);

      if (hourValuesToInsert.length > 0) {
        await quantConn.query(
          'INSERT IGNORE INTO price_data (pair_id, timeframe_id, timestamp, open_price, high_price, low_price, close_price, volume, volume_currency, volume_currency_quote, confirmed) VALUES ?',
          [hourValuesToInsert.map(i => i.data)]
        );
        totalInserted += hourValuesToInsert.length;
      }
    }

    console.log(`\n✅ 增量同步完成！总共插入新记录: ${totalInserted} 条`);
  } catch (error) {
    console.error('增量同步过程中发生错误:', error);
  } finally {
    if (baostockConn) await baostockConn.end();
    if (quantConn) await quantConn.end();
  }
}

syncIncremental();
