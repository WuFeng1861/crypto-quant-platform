# AI指标生成器使用指南

## 功能概述

AI指标生成器是一个基于Kimi AI的智能指标创建工具，能够根据用户的自然语言描述自动生成技术指标计算函数，并直接集成到量化交易平台中。

## 主要特性

- 🤖 **AI驱动**: 使用Kimi AI大模型理解用户需求
- 📊 **智能生成**: 自动生成符合BigNumber规范的指标计算函数
- 🔧 **即插即用**: 生成的指标可直接用于回测和实盘交易
- 🧪 **实时测试**: 支持生成指标的同时进行功能验证
- 📚 **参数自动提取**: 自动识别和配置指标参数

## API端点

### 1. 生成指标函数

**POST** `/ai-indicator-generator/generate`

根据用户描述生成指标计算函数代码。

**请求参数:**
```json
{
  "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天"
}
```

**响应示例:**
```json
{
  "success": true,
  "generatedCode": "function calculate(priceData, parameters) { /* 生成的代码 */ }"
}
```

### 2. 创建AI指标

**POST** `/ai-indicator-generator/create`

生成指标函数并创建到系统中。

**请求参数:**
```json
{
  "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天",
  "indicatorName": "AI_SMA_20",  // 可选
  "description": "AI生成的20日简单移动平均线"  // 可选
}
```

**响应示例:**
```json
{
  "success": true,
  "indicator": {
    "id": 1,
    "name": "AI_SMA_20",
    "description": "AI生成的20日简单移动平均线",
    "code": "function calculate(priceData, parameters) { /* 生成的代码 */ }",
    "parameters": [{"name": "period", "type": "number", "defaultValue": 20}],
    "returnType": "single-value",
    "isCustom": true
  },
  "generatedCode": "function calculate(priceData, parameters) { /* 生成的代码 */ }"
}
```

### 3. 生成并测试指标

**POST** `/ai-indicator-generator/generate-and-test`

生成指标函数，创建指标，并使用测试数据进行验证。

**请求参数:**
```json
{
  "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天",
  "indicatorName": "AI_SMA_20",  // 可选
  "description": "AI生成的20日简单移动平均线",  // 可选
  "testData": [  // 可选测试数据
    {"timestamp": "2024-01-01", "closePrice": 100},
    {"timestamp": "2024-01-02", "closePrice": 102},
    {"timestamp": "2024-01-03", "closePrice": 98}
  ]
}
```

**响应示例:**
```json
{
  "success": true,
  "indicator": { /* 指标信息 */ },
  "generatedCode": "function calculate(priceData, parameters) { /* 生成的代码 */ }",
  "testResult": {
    "sampleData": [
      {"timestamp": "2024-01-01", "closePrice": 100, "result": null},
      {"timestamp": "2024-01-02", "closePrice": 102, "result": 101},
      {"timestamp": "2024-01-03", "closePrice": 98, "result": 100}
    ],
    "summary": {
      "totalDataPoints": 3,
      "validResults": 2,
      "nullResults": 1
    }
  }
}
```

## 使用示例

### 基本使用

1. **简单移动平均线**
```bash
curl -X POST http://localhost:3000/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个基于收盘价的简单移动平均线，周期为20天",
    "indicatorName": "AI_SMA_20"
  }'
```

2. **相对强弱指标(RSI)**
```bash
curl -X POST http://localhost:3000/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个RSI指标，周期为14天",
    "indicatorName": "AI_RSI_14"
  }'
```

3. **布林带指标**
```bash
curl -X POST http://localhost:3000/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个布林带指标，周期为20天，标准差倍数为2",
    "indicatorName": "AI_BollingerBands_20"
  }'
```

### 高级用法

1. **复合指标**
```bash
curl -X POST http://localhost:3000/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个结合移动平均线和RSI的复合指标，当价格上穿20日均线且RSI大于50时买入信号",
    "indicatorName": "AI_Composite_Signal"
  }'
```

2. **自定义参数**
```bash
curl -X POST http://localhost:3000/ai-indicator-generator/create \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "创建一个自适应移动平均线，能够根据市场波动率动态调整周期参数",
    "indicatorName": "AI_Adaptive_MA",
    "description": "基于市场波动率的自适应移动平均线指标"
  }'
```

## 环境配置

### 必要环境变量

在 `.env` 文件中添加以下配置：

```bash
# Kimi AI API配置
KIMI_API_KEY=your_kimi_api_key_here

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=crypto_data
```

### 获取Kimi API密钥

1. 访问 [Kimi开放平台](https://platform.moonshot.cn/)
2. 注册账号并创建应用
3. 在应用详情页获取API密钥
4. 将密钥配置到环境变量中

## 测试脚本

使用提供的测试脚本验证功能：

```bash
node scripts/test/test-ai-indicator-generator.js
```

## 注意事项

1. **API限制**: Kimi API有调用频率限制，请合理控制请求频率
2. **代码质量**: AI生成的代码需要人工审核，确保逻辑正确性
3. **性能优化**: 对于复杂指标，建议进行性能测试
4. **错误处理**: 生成失败时会有详细的错误信息，请根据提示调整输入

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查环境变量是否正确配置
   - 确认API密钥是否有效
   - 检查网络连接

2. **生成代码错误**
   - 检查用户输入描述是否清晰
   - 尝试使用更简单的描述
   - 参考示例输入格式

3. **数据库连接失败**
   - 检查数据库配置
   - 确认数据库服务正常运行
   - 检查网络连接

### 错误代码说明

- `400`: 请求参数错误
- `401`: API密钥无效
- `500`: 服务器内部错误
- `503`: AI服务不可用

## 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🚀 支持AI指标生成
- 📊 集成BigNumber规范
- 🧪 添加测试功能