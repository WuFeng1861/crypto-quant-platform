const redis = require('redis');

// Redis 配置
const REDIS_CONFIG = {
  host: 'localhost',
  port: 6379,
  // password: '', // 如果有密码请取消注释并填写
  // db: 0, // 默认数据库
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true
};

/**
 * 创建 Redis 客户端
 */
function createRedisClient() {
  const client = redis.createClient(REDIS_CONFIG);
  
  client.on('error', (err) => {
    console.error('❌ Redis 连接错误:', err.message);
  });
  
  client.on('connect', () => {
    console.log('🔗 正在连接 Redis...');
  });
  
  client.on('ready', () => {
    console.log('✅ Redis 连接成功!');
  });
  
  client.on('end', () => {
    console.log('🔌 Redis 连接已断开');
  });
  
  return client;
}

/**
 * 检查 Redis 连接状态
 */
async function checkRedisConnection() {
  const client = createRedisClient();
  
  try {
    await client.connect();
    const pong = await client.ping();
    console.log('🏓 Redis 响应:', pong);
    
    // 获取 Redis 信息
    const info = await client.info('server');
    const lines = info.split('\r\n');
    const serverInfo = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          serverInfo[key] = value;
        }
      }
    });
    
    console.log('📊 Redis 服务器信息:');
    console.log(`  版本: ${serverInfo.redis_version || 'N/A'}`);
    console.log(`  运行模式: ${serverInfo.redis_mode || 'N/A'}`);
    console.log(`  运行时间: ${serverInfo.uptime_in_seconds || 'N/A'} 秒`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message);
    return false;
    
  } finally {
    await client.quit();
  }
}

/**
 * 清空 Redis 数据
 * @param {number} database - 数据库编号 (可选，默认当前数据库)
 * @param {boolean} allDatabases - 是否清空所有数据库
 */
async function flushRedisData(database = null, allDatabases = false) {
  const client = createRedisClient();
  
  try {
    await client.connect();
    
    if (allDatabases) {
      console.log('🗑️  正在清空所有 Redis 数据库...');
      await client.flushAll();
      console.log('✅ 所有数据库已清空!');
      
    } else if (database !== null) {
      console.log(`🗑️  正在清空 Redis 数据库 ${database}...`);
      await client.select(database);
      await client.flushDb();
      console.log(`✅ 数据库 ${database} 已清空!`);
      
    } else {
      console.log('🗑️  正在清空当前 Redis 数据库...');
      await client.flushDb();
      console.log('✅ 当前数据库已清空!');
    }
    
  } catch (error) {
    console.error('❌ 清空 Redis 数据失败:', error.message);
    throw error;
    
  } finally {
    await client.quit();
  }
}

/**
 * 获取 Redis 数据库信息
 */
async function getRedisInfo() {
  const client = createRedisClient();
  
  try {
    await client.connect();
    
    // 获取数据库大小
    const dbSize = await client.dbSize();
    console.log(`📊 当前数据库键数量: ${dbSize}`);
    
    // 获取内存使用情况
    const memoryInfo = await client.info('memory');
    const memoryLines = memoryInfo.split('\r\n');
    
    console.log('💾 内存使用情况:');
    memoryLines.forEach(line => {
      if (line.includes('used_memory_human') || 
          line.includes('used_memory_peak_human') ||
          line.includes('used_memory_rss_human')) {
        const [key, value] = line.split(':');
        if (key && value) {
          console.log(`  ${key}: ${value}`);
        }
      }
    });
    
    // 获取客户端连接信息
    const clientsInfo = await client.info('clients');
    const clientsLines = clientsInfo.split('\r\n');
    
    console.log('👥 客户端连接:');
    clientsLines.forEach(line => {
      if (line.includes('connected_clients') || line.includes('blocked_clients')) {
        const [key, value] = line.split(':');
        if (key && value) {
          console.log(`  ${key}: ${value}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 获取 Redis 信息失败:', error.message);
    throw error;
    
  } finally {
    await client.quit();
  }
}

/**
 * 列出 Redis 键
 * @param {string} pattern - 键模式 (默认 '*')
 * @param {number} limit - 限制数量 (默认 100)
 */
async function listRedisKeys(pattern = '*', limit = 100) {
  const client = createRedisClient();
  
  try {
    await client.connect();
    
    console.log(`🔍 搜索键模式: ${pattern}`);
    
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      console.log('📭 没有找到匹配的键');
      return [];
    }
    
    const displayKeys = keys.slice(0, limit);
    
    console.log(`🔑 找到 ${keys.length} 个键 (显示前 ${displayKeys.length} 个):`);
    displayKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
    
    if (keys.length > limit) {
      console.log(`  ... 还有 ${keys.length - limit} 个键未显示`);
    }
    
    return keys;
    
  } catch (error) {
    console.error('❌ 列出 Redis 键失败:', error.message);
    throw error;
    
  } finally {
    await client.quit();
  }
}

/**
 * 删除指定模式的键
 * @param {string} pattern - 键模式
 */
async function deleteKeysByPattern(pattern) {
  const client = createRedisClient();
  
  try {
    await client.connect();
    
    console.log(`🗑️  正在删除匹配模式 "${pattern}" 的键...`);
    
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      console.log('📭 没有找到匹配的键');
      return 0;
    }
    
    console.log(`找到 ${keys.length} 个匹配的键`);
    
    // 批量删除
    const deletedCount = await client.del(keys);
    
    console.log(`✅ 成功删除 ${deletedCount} 个键`);
    
    return deletedCount;
    
  } catch (error) {
    console.error('❌ 删除键失败:', error.message);
    throw error;
    
  } finally {
    await client.quit();
  }
}

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'check':
      case 'status':
        // 检查连接状态
        await checkRedisConnection();
        break;
        
      case 'flush':
      case 'clear':
        // 清空数据
        const database = args[1] ? parseInt(args[1]) : null;
        const allDbs = args.includes('--all') || args.includes('-a');
        await flushRedisData(database, allDbs);
        break;
        
      case 'info':
        // 获取信息
        await getRedisInfo();
        break;
        
      case 'keys':
      case 'list':
        // 列出键
        const pattern = args[1] || '*';
        const limit = args[2] ? parseInt(args[2]) : 100;
        await listRedisKeys(pattern, limit);
        break;
        
      case 'delete':
      case 'del':
        // 删除键
        if (!args[1]) {
          console.error('请提供要删除的键模式: node redis-manager.js delete <pattern>');
          process.exit(1);
        }
        await deleteKeysByPattern(args[1]);
        break;
        
      default:
        console.log(`
🔧 Redis 管理工具

用法:
  node redis-manager.js check                    - 检查 Redis 连接状态
  node redis-manager.js flush [db] [--all]       - 清空 Redis 数据
  node redis-manager.js info                     - 获取 Redis 信息
  node redis-manager.js keys [pattern] [limit]   - 列出 Redis 键
  node redis-manager.js delete <pattern>         - 删除匹配模式的键

示例:
  node redis-manager.js check                    # 检查连接
  node redis-manager.js flush                    # 清空当前数据库
  node redis-manager.js flush 0                  # 清空数据库 0
  node redis-manager.js flush --all              # 清空所有数据库
  node redis-manager.js info                     # 查看信息
  node redis-manager.js keys                     # 列出所有键
  node redis-manager.js keys "user:*"            # 列出用户相关键
  node redis-manager.js keys "*" 50              # 列出前50个键
  node redis-manager.js delete "temp:*"          # 删除临时键

⚠️  警告: flush 和 delete 操作不可逆，请谨慎使用！
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
  createRedisClient,
  checkRedisConnection,
  flushRedisData,
  getRedisInfo,
  listRedisKeys,
  deleteKeysByPattern
};