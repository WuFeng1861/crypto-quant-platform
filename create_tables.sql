-- Trading pairs table
CREATE TABLE IF NOT EXISTS trading_pairs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  base_asset VARCHAR(10) NOT NULL,
  quote_asset VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timeframes table
CREATE TABLE IF NOT EXISTS timeframes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(10) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Price data table
CREATE TABLE IF NOT EXISTS price_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pair_id INT NOT NULL,
  timeframe_id INT NOT NULL,
  timestamp BIGINT NOT NULL,
  open_price DECIMAL(20, 8) NOT NULL,
  high_price DECIMAL(20, 8) NOT NULL,
  low_price DECIMAL(20, 8) NOT NULL,
  close_price DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8) NOT NULL,
  volume_currency DECIMAL(20, 8) NOT NULL,
  volume_currency_quote DECIMAL(20, 8) NOT NULL,
  confirmed TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indicators table
CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indicator parameters table
CREATE TABLE IF NOT EXISTS indicator_parameters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  indicator_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  default_value VARCHAR(255),
  param_type ENUM('number', 'string', 'boolean') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_indicator_id (indicator_id)
);

-- Strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  position_type ENUM('long', 'short', 'both') NOT NULL DEFAULT 'both',
  buy_fee DECIMAL(10, 6) NOT NULL DEFAULT 0,
  sell_fee DECIMAL(10, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Strategy indicators table
CREATE TABLE IF NOT EXISTS strategy_indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_id INT NOT NULL,
  indicator_id INT NOT NULL,
  signal_type ENUM('buy', 'sell') NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_indicator_id (indicator_id)
);

-- Strategy indicator parameters table
CREATE TABLE IF NOT EXISTS strategy_indicator_params (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_indicator_id INT NOT NULL,
  parameter_id INT NOT NULL,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_indicator_id (strategy_indicator_id),
  INDEX idx_parameter_id (parameter_id)
);

-- Backtest results table
CREATE TABLE IF NOT EXISTS backtest_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  strategy_id INT NOT NULL,
  pair_id INT NOT NULL,
  timeframe_id INT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  initial_capital DECIMAL(20, 8) NOT NULL,
  final_capital DECIMAL(20, 8) NOT NULL,
  total_profit DECIMAL(20, 8) NOT NULL,
  profit_rate DECIMAL(10, 4) NOT NULL,
  max_drawdown DECIMAL(10, 4) NOT NULL,
  total_trades INT NOT NULL,
  winning_trades INT NOT NULL,
  losing_trades INT NOT NULL,
  win_rate DECIMAL(10, 4) NOT NULL,
  sharpe_ratio DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_pair_id (pair_id),
  INDEX idx_timeframe_id (timeframe_id)
);

-- Backtest trades table
CREATE TABLE IF NOT EXISTS backtest_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  backtest_id INT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  trade_type ENUM('buy', 'sell') NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  fee DECIMAL(20, 8) NOT NULL,
  profit DECIMAL(20, 8),
  profit_rate DECIMAL(10, 4),
  balance DECIMAL(20, 8) NOT NULL,
  signal_indicator_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_backtest_id (backtest_id),
  INDEX idx_timestamp (timestamp)
);