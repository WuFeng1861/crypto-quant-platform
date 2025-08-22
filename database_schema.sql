-- 已有表:
-- trading_pairs, timeframes, price_data

-- 指标表
CREATE TABLE indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '指标名称',
  description TEXT COMMENT '指标描述',
  calculation_code TEXT NOT NULL COMMENT '指标计算代码(NodeJS)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 指标参数表
CREATE TABLE indicator_parameters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  indicator_id INT NOT NULL COMMENT '关联的指标ID',
  name VARCHAR(100) NOT NULL COMMENT '参数名称',
  description TEXT COMMENT '参数描述',
  default_value VARCHAR(255) COMMENT '默认值',
  param_type ENUM('number', 'string', 'boolean') NOT NULL COMMENT '参数类型',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_indicator_id (indicator_id)
);

-- 策略方案表
CREATE TABLE strategies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '方案名称',
  description TEXT COMMENT '方案描述',
  position_type ENUM('long', 'short', 'both') NOT NULL DEFAULT 'both' COMMENT '仓位类型: 做多/做空/两者',
  buy_fee DECIMAL(10, 6) NOT NULL DEFAULT 0 COMMENT '买入手续费率',
  sell_fee DECIMAL(10, 6) NOT NULL DEFAULT 0 COMMENT '卖出手续费率',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 策略指标关联表
CREATE TABLE strategy_indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_id INT NOT NULL COMMENT '关联的策略ID',
  indicator_id INT NOT NULL COMMENT '关联的指标ID',
  signal_type ENUM('buy', 'sell') NOT NULL COMMENT '信号类型: 买入/卖出',
  priority INT NOT NULL DEFAULT 0 COMMENT '优先级',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_indicator_id (indicator_id)
);

-- 策略指标参数表
CREATE TABLE strategy_indicator_params (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_indicator_id INT NOT NULL COMMENT '关联的策略指标ID',
  parameter_id INT NOT NULL COMMENT '关联的参数ID',
  value VARCHAR(255) NOT NULL COMMENT '参数值',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_indicator_id (strategy_indicator_id),
  INDEX idx_parameter_id (parameter_id)
);

-- 回测结果表
CREATE TABLE backtest_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_id INT NOT NULL COMMENT '关联的策略ID',
  pair_id INT NOT NULL COMMENT '关联的交易对ID',
  timeframe_id INT NOT NULL COMMENT '关联的时间周期ID',
  start_time TIMESTAMP NOT NULL COMMENT '回测开始时间',
  end_time TIMESTAMP NOT NULL COMMENT '回测结束时间',
  initial_capital DECIMAL(20, 8) NOT NULL COMMENT '初始资金',
  final_capital DECIMAL(20, 8) NOT NULL COMMENT '最终资金',
  total_profit DECIMAL(20, 8) NOT NULL COMMENT '总盈利',
  profit_rate DECIMAL(10, 4) NOT NULL COMMENT '盈利率(%)',
  max_drawdown DECIMAL(10, 4) NOT NULL COMMENT '最大回撤(%)',
  total_trades INT NOT NULL COMMENT '总交易次数',
  winning_trades INT NOT NULL COMMENT '盈利交易次数',
  losing_trades INT NOT NULL COMMENT '亏损交易次数',
  win_rate DECIMAL(10, 4) NOT NULL COMMENT '胜率(%)',
  sharpe_ratio DECIMAL(10, 4) COMMENT '夏普比率',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_pair_id (pair_id),
  INDEX idx_timeframe_id (timeframe_id)
);

-- 回测交易记录表
CREATE TABLE backtest_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  backtest_id INT NOT NULL COMMENT '关联的回测ID',
  timestamp TIMESTAMP NOT NULL COMMENT '交易时间',
  trade_type ENUM('buy', 'sell') NOT NULL COMMENT '交易类型: 买入/卖出',
  price DECIMAL(20, 8) NOT NULL COMMENT '交易价格',
  amount DECIMAL(20, 8) NOT NULL COMMENT '交易数量',
  fee DECIMAL(20, 8) NOT NULL COMMENT '手续费',
  profit DECIMAL(20, 8) COMMENT '交易盈亏(仅卖出时有效)',
  profit_rate DECIMAL(10, 4) COMMENT '盈亏率(%)(仅卖出时有效)',
  balance DECIMAL(20, 8) NOT NULL COMMENT '交易后余额',
  signal_indicator_id INT COMMENT '触发信号的指标ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_backtest_id (backtest_id),
  INDEX idx_timestamp (timestamp)
);