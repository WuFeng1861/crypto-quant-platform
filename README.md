# 加密货币量化回测平台

基于NestJS、Redis和MySQL的量化回测平台，用于加密货币交易策略的开发和回测。

## 功能特点

- 指标管理：添加指标名称和指标计算方式（NodeJS代码）和指标对应的参数
- 策略管理：指定一个或多个指标（区分买和卖）和对应参数组成策略，支持做多和做空
- 回测系统：使用策略对指定时间的数据进行回测，得到回测结果和回测交易记录
- 数据缓存：使用Redis存储加密货币数据、指标、策略和回测结果，提高性能

## 技术栈

- 后端框架：NestJS
- 数据库：MySQL
- 缓存：Redis
- 语言：TypeScript

## 系统架构

```
crypto-quant-platform/
├── src/
│   ├── modules/
│   │   ├── indicators/      # 指标管理模块
│   │   ├── strategies/      # 策略管理模块
│   │   ├── backtest/        # 回测系统模块
│   │   ├── common/          # 公共模块
│   │   └── config/          # 配置模块
│   ├── app.module.ts        # 应用模块
│   └── main.ts              # 应用入口
├── .env                     # 环境变量
└── package.json             # 项目依赖
```

## 安装和运行

### 前提条件

- Node.js (>= 14.x)
- MySQL (>= 8.0)
- Redis (>= 6.0)

### 安装步骤

1. 克隆项目

```bash
git clone https://github.com/yourusername/crypto-quant-platform.git
cd crypto-quant-platform
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

创建 `.env` 文件并设置以下变量：

```
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=crypto_data

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 应用配置
PORT=3099
NODE_ENV=development
```

4. 创建数据库和表

```bash
mysql -u root -p < create_tables.sql
```

5. 启动应用

```bash
npm run start
```

开发模式：

```bash
npm run start:dev
```

## API 文档

详细的API文档请参考 [API文档](./api-documentation.md)。

## 使用示例

### 1. 创建指标

```bash
curl -X POST http://localhost:3099/indicators \
  -H "Content-Type: application/json" \
  -d '{
    "name": "简单移动平均线",
    "description": "计算价格的简单移动平均线",
    "calculationCode": "function calculate(priceData, parameters) { const period = parameters.period || 14; const result = []; for (let i = 0; i < priceData.length; i++) { if (i < period - 1) { result.push(null); continue; } let sum = 0; for (let j = 0; j < period; j++) { sum += priceData[i - j].close_price; } result.push(sum / period); } return result; }",
    "parameters": [
      {
        "name": "period",
        "description": "周期",
        "defaultValue": "14",
        "paramType": "number"
      }
    ]
  }'
```

### 2. 创建策略

```bash
curl -X POST http://localhost:3099/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "双均线交叉策略",
    "description": "当短期均线上穿长期均线时买入，下穿时卖出",
    "positionType": "both",
    "buyFee": 0.001,
    "sellFee": 0.001,
    "indicators": [
      {
        "indicatorId": 1,
        "signalType": "buy",
        "priority": 0,
        "parameters": [
          {
            "parameterId": 1,
            "value": "5"
          }
        ]
      },
      {
        "indicatorId": 1,
        "signalType": "sell",
        "priority": 0,
        "parameters": [
          {
            "parameterId": 1,
            "value": "20"
          }
        ]
      }
    ]
  }'
```

### 3. 执行回测

```bash
curl -X POST http://localhost:3099/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "strategyId": 1,
    "pairId": 1,
    "timeframeId": 1,
    "startTime": "2025-01-01T00:00:00.000Z",
    "endTime": "2025-08-01T00:00:00.000Z",
    "initialCapital": 10000
  }'
```

## 许可证

MIT