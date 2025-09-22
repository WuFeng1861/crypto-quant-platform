# 回测执行脚本

这个目录包含用于执行加密货币量化交易回测的脚本工具。

## 文件说明

- `run-backtest.js` - 主要的回测执行脚本
- `run-backtest.bat` - Windows 批处理文件，方便快速执行
- `example-config.json` - 示例配置文件
- `README.md` - 本说明文件

## 前置要求

1. 确保已安装 Node.js
2. 安装 axios 依赖：
   ```bash
   npm install axios
   ```
3. 确保回测服务在端口 3099 上运行

## 使用方法

### 1. 命令行使用

```bash
# 检查服务状态
node run-backtest.js status

# 使用默认配置执行回测
node run-backtest.js run

# 使用自定义配置执行回测
node run-backtest.js run example-config.json

# 列出所有回测记录
node run-backtest.js list

# 获取特定回测结果
node run-backtest.js get <backtest-id>
```

### 2. Windows 批处理使用

```cmd
# 检查服务状态
run-backtest.bat status

# 执行回测
run-backtest.bat run

# 使用自定义配置
run-backtest.bat run example-config.json

# 列出回测记录
run-backtest.bat list
```

### 3. 在其他 Node.js 脚本中使用

```javascript
const { runBacktest, getBacktestResult } = require('./run-backtest');

// 执行回测
const result = await runBacktest({
  strategyId: 'my-strategy',
  symbol: 'ETHUSDT',
  timeframe: '1h',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  initialCapital: 10000
});

// 获取回测结果
const details = await getBacktestResult(result.id);
```

## 配置文件格式

配置文件应为 JSON 格式，包含以下字段：

```json
{
  "strategyId": "策略ID",
  "symbol": "交易对符号 (如 BTCUSDT)",
  "timeframe": "时间框架 (如 1h, 4h, 1d)",
  "startDate": "开始日期 (YYYY-MM-DD)",
  "endDate": "结束日期 (YYYY-MM-DD)",
  "initialCapital": "初始资金",
  "parameters": {
    "fastPeriod": "快速移动平均线周期",
    "slowPeriod": "慢速移动平均线周期",
    "stopLoss": "止损比例 (如 0.02 表示 2%)",
    "takeProfit": "止盈比例 (如 0.05 表示 5%)"
  }
}
```

## 错误处理

脚本包含完整的错误处理机制：

- 网络连接错误
- 服务不可用
- 参数验证错误
- 超时处理

## 注意事项

1. 确保回测服务正在运行并监听端口 3099
2. 回测可能需要较长时间，脚本设置了 5 分钟的超时时间
3. 大量历史数据的回测可能消耗较多内存和计算资源
4. 建议在执行回测前先检查服务状态

## 故障排除

### 服务连接失败
- 检查服务是否在端口 3099 上运行
- 确认防火墙设置允许本地连接

### 回测执行超时
- 减少回测时间范围
- 使用更大的时间框架（如从 1m 改为 1h）
- 检查服务器资源使用情况

### 参数验证错误
- 检查配置文件格式是否正确
- 确认所有必需字段都已提供
- 验证日期格式和数值范围