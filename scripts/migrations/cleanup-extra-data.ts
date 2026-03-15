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

const QUANT_DB_CONFIG = {
  host: envConfig.DB_HOST || 'localhost',
  port: parseInt(envConfig.DB_PORT || '3306'),
  user: envConfig.DB_USERNAME || 'root',
  password: envConfig.DB_PASSWORD || '666666',
  database: envConfig.DB_DATABASE || 'crypto_data',
};

async function cleanup() {
  let quantConn: mysql.Connection | null = null;

  try {
    console.log('正在连接数据库进行重复数据清理 (数据量优先策略)...');
    quantConn = await mysql.createConnection(QUANT_DB_CONFIG);

    // 1. 查找重复的 Trading Pairs
    console.log('\n--- 1. 查找重复交易对 ---');
    const [duplicates]: any = await quantConn.execute(`
      SELECT symbol, COUNT(*) as count, GROUP_CONCAT(id) as all_ids
      FROM trading_pairs 
      WHERE symbol LIKE '%-CNY' 
      GROUP BY symbol 
      HAVING count > 1
    `);

    console.log(`找到重复交易对共 ${duplicates.length} 组。`);

    if (duplicates.length > 0) {
      for (const group of duplicates) {
        const allIds = group.all_ids.split(',').map((id: string) => parseInt(id));

        console.log(`\n分析 ${group.symbol} (IDs: ${allIds.join(', ')}):`);

        // 2. 统计每个 ID 的价格数据量
        const idDataCounts = [];
        for (const id of allIds) {
          const [countResult]: any = await quantConn.query(
            'SELECT COUNT(*) as count FROM price_data WHERE pair_id = ?',
            [id]
          );
          idDataCounts.push({ id, count: countResult[0].count });
          console.log(`  - ID ${id}: ${countResult[0].count} 条记录`);
        }

        // 3. 决定保留哪个 ID (记录数最多的，如果记录数相同则保留 ID 最小的)
        idDataCounts.sort((a, b) => b.count - a.count || a.id - b.id);
        const keepId = idDataCounts[0].id;
        const deleteIds = allIds.filter(id => id !== keepId);

        console.log(`  => 决定保留 ID ${keepId}，删除 ID ${deleteIds.join(', ')}`);

        // 4. 执行删除
        if (deleteIds.length > 0) {
          // 先删价格数据
          const [priceResult]: any = await quantConn.query(
            'DELETE FROM price_data WHERE pair_id IN (?)',
            [deleteIds]
          );
          console.log(`  - 已删除关联价格数据: ${priceResult.affectedRows} 行`);

          // 再删交易对
          const [pairResult]: any = await quantConn.query(
            'DELETE FROM trading_pairs WHERE id IN (?)',
            [deleteIds]
          );
          console.log(`  - 已删除交易对: ${pairResult.affectedRows} 行`);
        }
      }

      console.log('\n--- 2. 添加数据库约束防止重复 ---');
      try {
        // 给 trading_pairs 添加唯一约束
        console.log('正在给 trading_pairs(symbol) 添加唯一约束...');
        await quantConn.execute('ALTER TABLE trading_pairs ADD UNIQUE INDEX uk_symbol (symbol)');
        console.log('✅ trading_pairs 唯一约束添加成功');

        // 给 price_data 添加唯一约束
        console.log('正在给 price_data(pair_id, timeframe_id, timestamp) 添加唯一约束...');
        await quantConn.execute('ALTER TABLE price_data ADD UNIQUE INDEX uk_pair_tf_ts (pair_id, timeframe_id, timestamp)');
        console.log('✅ price_data 唯一约束添加成功');
      } catch (e: any) {
        console.warn(`添加约束失败 (可能已存在或数据仍有冲突): ${e.message}`);
      }

      console.log('\n✅ 所有清理任务完成！');
    } else {
      console.log('未发现重复数据，无需清理。');

      // 即使没有重复，也尝试添加约束（如果尚未添加）
      try {
        await quantConn.execute('ALTER TABLE trading_pairs ADD UNIQUE INDEX uk_symbol (symbol)');
        await quantConn.execute('ALTER TABLE price_data ADD UNIQUE INDEX uk_pair_tf_ts (pair_id, timeframe_id, timestamp)');
        console.log('✅ 唯一约束已确保存在');
      } catch (e) { }
    }

  } catch (error) {
    console.error('清理过程中发生错误:', error);
  } finally {
    if (quantConn) await quantConn.end();
  }
}

cleanup();
