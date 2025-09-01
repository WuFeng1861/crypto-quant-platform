# 测试脚本使用说明

这个目录包含了用于测试 `calculateWithPriceData` 接口的脚本。

## 安装依赖

```bash
cd scripts
npm install
```

## 脚本说明

### 1. quick-test.js - 快速测试
最简单的测试脚本，适合快速验证接口是否正常工作。

```bash
node quick-test.js
```

### 2. test-calculate-with-price-data.js - 完整测试套件
功能完整的测试脚本，支持多种测试模式。

#### 使用方法：

```bash
# 单个测试 (默认)
node test-calculate-with-price-data.js
# 或
npm run test:single

# 性能测试
node test-calculate-with-price-data.js performance
# 或
npm run test:performance

# 运行所有测试
node test-calculate-with-price-data.js all
# 或
npm run test:all
```

## 配置修改

在使用脚本前，请根据你的实际情况修改以下配置：

### quick-test.js
```javascript
const BASE_URL = 'http://localhost:3000';  // 服务器地址
const INDICATOR_ID = 1;                    // 指标ID
```

### test-calculate-with-price-data.js
```javascript
const config = {
  baseURL: 'http://localhost:3000',        // 服务器地址
  timeout: 30000,                          // 超时时间
};
```

## 测试数据说明

### 请求参数格式：
```json
{
  "pairId": 1,           // 交易对ID
  "timeframeId": 1,      // 时间框架ID
  "startTime": 1640995200000,  // 开始时间戳
  "endTime": 1641081600000,    // 结束时间戳
  "parameters": {
    "period": 14,        // 指标参数
    "smoothing": 2
  }
}
```

### 时间戳转换：
```javascript
// 获取当前时间戳
Date.now()

// 获取7天前的时间戳
Date.now() - 7 * 24 * 60 * 60 * 1000

// 将日期转换为时间戳
new Date('2022-01-01').getTime()
```

## 常见问题

### 1. 连接错误
- 确保服务器正在运行
- 检查服务器地址和端口是否正确
- 确认防火墙设置

### 2. 指标不存在
- 检查指标ID是否正确
- 确认指标已经创建并保存到数据库

### 3. 价格数据不存在
- 确认交易对ID和时间框架ID是否正确
- 检查指定时间范围内是否有价格数据
- 可以先调用价格数据预加载接口

### 4. 参数错误
- 检查指标参数是否符合指标定义
- 确认参数类型和格式正确

## 示例输出

### 成功响应：
```
✅ 请求成功!
⏱️  响应时间: 245ms
📊 状态码: 200
📈 数据类型: object
📋 数据点数量: 24

📄 前3个数据点:
  1: {
    "timestamp": 1640995200000,
    "value": 45.67,
    "signal": "buy"
  }
```

### 错误响应：
```
❌ 请求失败!
📊 状态码: 400
📄 错误信息: {
  "message": "未找到指定时间范围内的价格数据",
  "statusCode": 400
}