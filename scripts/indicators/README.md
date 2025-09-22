# 指标计算工具

这个目录包含用于计算技术指标的脚本工具，支持使用价格数据和交易对符号两种方式。

## 文件说明

- `calculate-with-price-data.js` - 主要的指标计算脚本
- `calculate-indicators.bat` - Windows 批处理文件，方便快速执行
- `example-config.json` - 使用价格数据的示例配置文件
- `symbol-config.json` - 使用交易对符号的示例配置文件
- `README.md` - 本说明文件

## 前置要求

1. 确保已安装 Node.js
2. 安装 axios 依赖：
   ```bash
   npm install axios
   ```
3. 确保指标服务在端口 3099 上运行

## 使用方法

### 1. 命令行使用

```bash
# 检查服务状态
node calculate-with-price-data.js status

# 列出所有可用指标
node calculate-with-price-data.js list

# 获取指标详情
node calculate-with-price-data.js info 1

# 获取指标参数
node calculate-with-price-data.js params 1

# 使用默认配置计算指标
node calculate-with-price-data.js calculate

# 使用自定义配置计算指标
node calculate-with-price-data.js calculate example-config.json

# 使用预设配置计算指标
node calculate-with-price-data.js preset ma    # 移动平均线
node calculate-with-price-data.js preset rsi   # RSI
node calculate-with-price-data.js preset macd  # MACD

# 使用交易对符号计算指标
node calculate-with-price-data.js symbol symbol-config.json
```

### 2. Windows 批处理使用

```cmd
# 检查服务状态
calculate-indicators.bat status

# 列出指标
calculate-indicators.bat list

# 计算指标
calculate-indicators.bat calculate

# 使用预设配置
calculate-indicators.bat preset ma

# 获取指标信息
calculate-indicators.bat info 1
calculate-indicators.bat params 1
```

### 3. 在其他 Node.js 脚本中使用

```javascript
const { 
  calculateWithPriceData, 
  getAllIndicators,
  getIndicatorParameters 
} = require('./calculate-with-price-data');

// 获取所有指标
const indicators = await getAllIndicators();

// 计算指标
const result = await calculateWithPriceData({
  indicatorId: 1,
  pairId: 1,
  timeframeId: 1,
  startTime: '2024-01-01T00:00:00.000Z',
  endTime: '2024-03-31T23:59:59.999Z',
  parameters: { period: 20 }
});
```

## 配置文件格式

### 使用价格数据计算 (example-config.json)

```json
{
  "indicatorId": 1,
  "pairId": 1,
  "timeframeId": 1,
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-03-31T23:59:59.999Z",
  "parameters": {
    "period": 20,
    "source": "close"
  }
}
```

### 使用交易对符号计算 (symbol-config.json)

```json
{
  "indicatorId": 1,
  "symbol": "BTCUSDT",
  "timeframeName": "1h",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": "2024-03-31T23:59:59.999Z",
  "parameters": {
    "period": 20,
    "source": "close"
  }
}
```

## 预设配置

脚本包含以下预设配置：

### 移动平均线 (MA)
```bash
node calculate-with-price-data.js preset ma
```
- 周期: 20
- 数据源: 收盘价

### 相对强弱指数 (RSI)
```bash
node calculate-with-price-data.js preset rsi
```
- 周期: 14

### MACD
```bash
node calculate-with-price-data.js preset macd
```
- 快线周期: 12
- 慢线周期: 26
- 信号线周期: 9

## API 端点

脚本使用以下 API 端点：

- `GET /indicators` - 获取所有指标
- `GET /indicators/:id` - 获取指标详情
- `GET /indicators/:id/parameters` - 获取指标参数
- `POST /indicators/:id/calculate-with-data` - 使用价格数据计算指标
- `POST /indicators/:id/calculate-by-symbol` - 使用交易对符号计算指标

## 功能特性

### ✅ 多种计算方式
- 使用价格数据ID计算
- 使用交易对符号计算
- 预设配置快速计算

### 📊 结果展示
- 智能结果显示（前几个和后几个）
- JSON 格式化输出
- 数据点数量统计

### 🔧 管理功能
- 指标列表查看
- 指标详情获取
- 参数信息查询
- 服务状态检查

### ⚙️ 配置灵活
- 支持自定义配置文件
- 预设常用指标配置
- 参数可自定义

## 常用指标参数

### 移动平均线 (MA)
- `period`: 周期 (默认: 20)
- `source`: 数据源 (open/high/low/close)

### RSI
- `period`: 周期 (默认: 14)

### MACD
- `fastPeriod`: 快线周期 (默认: 12)
- `slowPeriod`: 慢线周期 (默认: 26)
- `signalPeriod`: 信号线周期 (默认: 9)

### 布林带 (Bollinger Bands)
- `period`: 周期 (默认: 20)
- `stdDev`: 标准差倍数 (默认: 2)

## 错误处理

脚本包含完整的错误处理机制：

- 网络连接错误
- 服务不可用
- 参数验证错误
- 指标计算错误
- 超时处理

## 注意事项

1. 确保指标服务正在运行并监听端口 3099
2. 指标计算可能需要较长时间，脚本设置了 2 分钟的超时时间
3. 大量历史数据的计算可能消耗较多内存和计算资源
4. 建议在执行计算前先检查服务状态和指标参数

## 故障排除

### 服务连接失败
- 检查服务是否在端口 3099 上运行
- 确认防火墙设置允许本地连接

### 指标计算超时
- 减少计算时间范围
- 使用更大的时间框架
- 检查服务器资源使用情况

### 参数验证错误
- 检查配置文件格式是否正确
- 确认指标ID是否存在
- 验证参数类型和范围

### 数据不足
- 确认指定时间范围内有足够的价格数据
- 检查交易对和时间框架是否正确