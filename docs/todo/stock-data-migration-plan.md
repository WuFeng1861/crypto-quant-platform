# 股票数据迁移计划 (Stock Data Migration Plan)

## 1. 项目背景
将 `baostock-data` 项目中抓取的中国 A 股数据（日线、60分钟线）同步至 `crypto-quant-platform` 量化交易平台，以支持股票策略的回测与分析。

## 2. 数据库结构分析

### 2.1 源数据库 (baostock-data)
- **数据库名**: `stock_data` (MySQL)
- **关键表**:
    - `stock_info`: 股票基础资料（代码、名称、类型等）。
    - `kline_day`: 日线数据。
    - `kline_60min`: 60分钟线数据。
    - `trading_calendar`: 交易日历。

### 2.2 目标数据库 (crypto-quant-platform)
- **数据库名**: `crypto_data` (MySQL/TypeORM)
- **关键表**:
    - `trading_pairs`: 交易对元数据（Symbol, BaseAsset, QuoteAsset）。
    - `timeframes`: 时间周期定义（1d, 1h）。
    - `price_data`: OHLCV 价格数据。

## 3. 数据映射与逻辑

| 源 (Source) | 目标 (Target) | 转换规则 (Transformation) |
| :--- | :--- | :--- |
| `stock_info.code` + '-CNY' | `trading_pairs.symbol` | 示例: `sh.600000-CNY` |
| `stock_info.code` | `trading_pairs.base_asset` | 示例: `sh.600000` |
| 固定值 'CNY' | `trading_pairs.quote_asset` | 报价资产统一为人民币 |
| `kline_type` | `timeframes.name` | `day` -> `1D`, `60min` -> `1H` |
| `date` + `time` | `price_data.timestamp` | 转换为 Unix 毫秒时间戳 |
| `open`/`high`/`low`/`close` | `open_price`/`high_price`/... | 数值映射 |
| `volume` | `volume` | 成交量 (股) |
| `amount` | `volume_currency_quote` | 成交额 (元) |

## 4. 详细工作流程

1. **初始化元数据**:
   - 确认 `timeframes` 中已存在 `1D` 和 `1H`。
   - 遍历 `stock_info` 表，将所有 `status='1'` (活跃) 的股票导入 `trading_pairs`。
2. **编写迁移脚本**:
   - 创建 `StockDataMigrator` 类。
   - 使用流式读取（Streaming）或分页读取源库，防止内存溢出。
   - **仅迁移前复权 (qfq)** 数据。
3. **数据清洗**:
   - 处理停牌期间的数据（`tradestatus=0`）。
   - 统一时间戳格式。
4. **批量写入**:
   - 使用 `INSERT IGNORE` 避免重复记录导致脚本中断。
5. **增量同步**:
   - 已开发 [sync-stock-data-incremental.ts](file:///c:/Users/WuFeng/Desktop/project/AiTest/codebuddy-ai/crypto-quant-platform/scripts/migrations/sync-stock-data-incremental.ts)。
   - 逻辑：获取目标库各股票的最大时间戳，仅拉取源库中更新的数据。
6. **验证环节**:
   - 检查记录总数一致性。
   - 抽样检查特定日期的 OHLC 值。

## 5. 迁移决策执行状态

| 决策项 | 执行方案 | 状态 |
| :--- | :--- | :--- |
| **复权类型** | 确认仅同步 **前复权 (qfq)** 数据 | 已确认 |
| **同步范围** | 同步所有 **status=1** 的活跃股票 | 已确认 |
| **时间范围** | **全量迁移**，不限制时间范围 | 已确认 |
| **Symbol 格式** | 使用 `stock_info.code` + `-CNY` | 已确认 |
| **资产映射** | BaseAsset=`code`, QuoteAsset=`CNY` | 已确认 |
| **TradingPair 属性** | 不包含 `name` 属性（目标库实体不支持） | 已确认 |
