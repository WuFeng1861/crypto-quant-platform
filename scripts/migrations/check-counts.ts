import * as mysql from 'mysql2/promise';

async function checkCounts() {
  const BAOSTOCK_DB_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '666666',
    database: 'stock_data',
  };

  const QUANT_DB_CONFIG = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '666666',
    database: 'crypto_data',
  };

  try {
    const bConn = await mysql.createConnection(BAOSTOCK_DB_CONFIG);
    const qConn = await mysql.createConnection(QUANT_DB_CONFIG);

    const [bDay]: any = await bConn.execute('SELECT COUNT(*) as count FROM kline_day WHERE adjust_type = "qfq"');
    const [bHour]: any = await bConn.execute('SELECT COUNT(*) as count FROM kline_60min WHERE adjust_type = "qfq"');

    const [qDay]: any = await qConn.execute('SELECT COUNT(*) as count FROM price_data p JOIN trading_pairs t ON p.pair_id = t.id WHERE p.timeframe_id = 2 AND t.symbol LIKE "%-CNY"');
    const [qHour]: any = await qConn.execute('SELECT COUNT(*) as count FROM price_data p JOIN trading_pairs t ON p.pair_id = t.id WHERE p.timeframe_id = 1 AND t.symbol LIKE "%-CNY"');

    console.log(`BaoStock Day (qfq): ${bDay[0].count}`);
    console.log(`Quant Day (1D): ${qDay[0].count}`);
    console.log(`BaoStock Hour (qfq): ${bHour[0].count}`);
    console.log(`Quant Hour (1H): ${qHour[0].count}`);

    await bConn.end();
    await qConn.end();
  } catch (e) {
    console.error(e);
  }
}

checkCounts();
