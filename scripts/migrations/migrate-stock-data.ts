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

async function migrate() {
  let baostockConn: mysql.Connection | null = null;
  let quantConn: mysql.Connection | null = null;

  try {
    console.log('正在连接数据库...');
    baostockConn = await mysql.createConnection(BAOSTOCK_DB_CONFIG);
    quantConn = await mysql.createConnection(QUANT_DB_CONFIG);
    console.log('数据库连接成功！');

    // 1. 获取已有的 Timeframes (1D, 1H)
    console.log('正在获取已有时间周期 (Timeframes)...');
    const [tfRows]: any = await quantConn.execute('SELECT id, name FROM timeframes WHERE name IN ("1D", "1H")');
    const timeframeMap = tfRows.reduce((acc: any, row: any) => {
      acc[row.name] = row.id;
      return acc;
    }, {});

    if (!timeframeMap['1D'] || !timeframeMap['1H']) {
      console.warn('警告：目标数据库中缺少 1D 或 1H 时间周期，请先手动检查 timeframes 表。');
    }

    // 2. 迁移 Trading Pairs
    console.log('正在同步交易对 (Trading Pairs)...');
    const [stockRows]: any = await baostockConn.execute(
      "SELECT code FROM stock_info WHERE status = '1'"
    );

    for (const stock of stockRows) {
      const symbol = `${stock.code}-CNY`;
      const baseAsset = stock.code;
      const quoteAsset = 'CNY';

      await quantConn.execute(
        'INSERT IGNORE INTO trading_pairs (symbol, base_asset, quote_asset) VALUES (?, ?, ?)',
        [symbol, baseAsset, quoteAsset]
      );
    }

    const [pairRows]: any = await quantConn.execute('SELECT id, symbol, base_asset FROM trading_pairs');
    const pairMap = pairRows.reduce((acc: any, row: any) => {
      acc[row.base_asset] = row.id;
      return acc;
    }, {});

    // 3. 迁移 K 线数据 (Price Data)
    console.log(`开始迁移价格数据 (共 ${stockRows.length} 只股票)...`);
    let count = 0;

    for (const stock of stockRows) {
      count++;
      const stockCode = stock.code;
      const pairId = pairMap[stockCode];

      if (count % 100 === 0) {
        console.log(`进度: ${count}/${stockRows.length} (${((count / stockRows.length) * 100).toFixed(2)}%)`);
      }

      if (!pairId) {
        console.warn(`跳过 ${stockCode}: 在 trading_pairs 中未找到对应的 pairId`);
        continue;
      }

      // 迁移日线数据 (1D)
      if (timeframeMap['1D']) {
        const [dayKlines]: any = await baostockConn.execute(
          'SELECT date, open, high, low, close, volume, amount FROM kline_day WHERE code = ? AND adjust_type = "qfq"',
          [stockCode]
        );

        if (dayKlines.length > 0) {
          // console.log(`正在迁移 ${stockCode} 的日线数据 (${dayKlines.length} 条)...`);
          const values = dayKlines.map((k: any) => {
            // 处理 date，可能是 Date 对象或字符串
            let dateStr = k.date;
            if (k.date instanceof Date) {
              dateStr = k.date.toISOString().split('T')[0];
            }

            // 转换为时间戳 (北京时间 15:00)
            const timestamp = new Date(`${dateStr}T15:00:00+08:00`).getTime();

            if (isNaN(timestamp)) {
              throw new Error(`无效的日期或时间: ${k.time || k.date} for ${stockCode}。程序已停止以防产生无效数据。`);
            }

            return [
              pairId,
              timeframeMap['1D'],
              timestamp,
              k.open,
              k.high,
              k.low,
              k.close,
              k.volume,
              k.amount,
              k.amount, // volume_currency_quote 同 amount
              1, // confirmed
            ];
          }).filter((v: any) => !isNaN(v[2])); // 过滤掉无效时间戳

          await quantConn.query(
            'INSERT IGNORE INTO price_data (pair_id, timeframe_id, timestamp, open_price, high_price, low_price, close_price, volume, volume_currency, volume_currency_quote, confirmed) VALUES ?',
            [values]
          );
        }
      }

      // 迁移 60 分钟线数据 (1H)
      if (timeframeMap['1H']) {
        const [hourKlines]: any = await baostockConn.execute(
          'SELECT date, time, open, high, low, close, volume, amount FROM kline_60min WHERE code = ? AND adjust_type = "qfq"',
          [stockCode]
        );

        if (hourKlines.length > 0) {
          // console.log(`正在迁移 ${stockCode} 的 60 分钟线数据 (${hourKlines.length} 条)...`);
          const values = hourKlines.map((k: any) => {
            // k.time 格式应该是 20250312100000000 (17位) 或 20250312100000 (14位)
            if (!k.time || k.time.length < 14) {
              throw new Error(`股票 ${stockCode} 的 60 分钟线数据缺少有效的 time 字段: "${k.time}"。程序已停止。`);
            }

            const year = k.time.substring(0, 4);
            const month = k.time.substring(4, 6);
            const day = k.time.substring(6, 8);
            const hour = k.time.substring(8, 10);
            const min = k.time.substring(10, 12);
            const sec = k.time.substring(12, 14);
            const timestamp = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}+08:00`).getTime();

            if (isNaN(timestamp)) {
              throw new Error(`无效的日期或时间: ${k.time} for ${stockCode}。程序已停止。`);
            }

            return [
              pairId,
              timeframeMap['1H'],
              timestamp,
              k.open,
              k.high,
              k.low,
              k.close,
              k.volume,
              k.amount,
              k.amount,
              1,
            ];
          }).filter((v: any) => !isNaN(v[2])); // 过滤掉无效时间戳

          await quantConn.query(
            'INSERT IGNORE INTO price_data (pair_id, timeframe_id, timestamp, open_price, high_price, low_price, close_price, volume, volume_currency, volume_currency_quote, confirmed) VALUES ?',
            [values]
          );
        }
      }
    }

    console.log('数据迁移完成！');
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
  } finally {
    if (baostockConn) await baostockConn.end();
    if (quantConn) await quantConn.end();
  }
}

migrate();
