# Redis 管理工具

这个目录包含用于管理本地 Redis 数据库的脚本工具。

## 文件说明

- `redis-manager.js` - 主要的 Redis 管理脚本
- `redis-manager.bat` - Windows 批处理文件，方便快速执行
- `README.md` - 本说明文件

## 前置要求

1. 确保已安装 Node.js
2. 安装 redis 依赖：
   ```bash
   npm install redis
   ```
3. 确保本地 Redis 服务正在运行（默认端口 6379）

## 使用方法

### 1. 命令行使用

```bash
# 检查 Redis 连接状态
node redis-manager.js check

# 清空当前数据库
node redis-manager.js flush

# 清空指定数据库（例如数据库 0）
node redis-manager.js flush 0

# 清空所有数据库
node redis-manager.js flush --all

# 获取 Redis 信息
node redis-manager.js info

# 列出所有键
node redis-manager.js keys

# 列出匹配模式的键
node redis-manager.js keys "user:*"

# 列出前50个键
node redis-manager.js keys "*" 50

# 删除匹配模式的键
node redis-manager.js delete "temp:*"
```

### 2. Windows 批处理使用

```cmd
# 检查连接状态
redis-manager.bat check

# 清空数据（会有确认提示）
redis-manager.bat flush

# 清空所有数据库（会有确认提示）
redis-manager.bat flush --all

# 获取信息
redis-manager.bat info

# 列出键
redis-manager.bat keys

# 删除键（会有确认提示）
redis-manager.bat delete "temp:*"
```

### 3. 在其他 Node.js 脚本中使用

```javascript
const { 
  checkRedisConnection, 
  flushRedisData, 
  listRedisKeys 
} = require('./redis-manager');

// 检查连接
const isConnected = await checkRedisConnection();

// 清空当前数据库
await flushRedisData();

// 清空指定数据库
await flushRedisData(1);

// 清空所有数据库
await flushRedisData(null, true);

// 列出键
const keys = await listRedisKeys('user:*', 100);
```

## 配置说明

默认 Redis 配置（可在 `redis-manager.js` 中修改）：

```javascript
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
```

## 功能特性

### ✅ 连接管理
- 自动连接重试
- 连接状态检查
- 错误处理和日志

### 🗑️ 数据清理
- 清空当前数据库
- 清空指定数据库
- 清空所有数据库
- 按模式删除键

### 📊 信息查看
- Redis 服务器信息
- 内存使用情况
- 客户端连接状态
- 数据库大小

### 🔍 键管理
- 列出所有键
- 按模式搜索键
- 限制显示数量
- 批量删除操作

## 安全提示

⚠️ **重要警告**：
- `flush` 操作会永久删除数据，无法恢复
- `delete` 操作会删除匹配的键，请谨慎使用
- 建议在生产环境使用前先在测试环境验证
- 批处理文件包含确认提示，防止误操作

## 错误处理

脚本包含完整的错误处理机制：

- Redis 连接失败
- 网络超时
- 权限错误
- 参数验证错误

## 故障排除

### Redis 连接失败
- 检查 Redis 服务是否运行：`redis-server`
- 确认端口 6379 是否被占用
- 检查防火墙设置

### 权限错误
- 确认 Redis 配置允许本地连接
- 检查是否需要密码认证

### 内存不足
- 检查 Redis 内存使用情况
- 考虑清理不需要的数据
- 调整 Redis 内存配置

## 常用场景

### 开发环境重置
```bash
# 清空所有测试数据
node redis-manager.js flush --all
```

### 清理缓存
```bash
# 删除所有缓存键
node redis-manager.js delete "cache:*"
```

### 监控数据库
```bash
# 查看数据库状态
node redis-manager.js info
node redis-manager.js keys