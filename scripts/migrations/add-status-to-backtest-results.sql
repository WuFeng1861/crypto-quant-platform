-- 添加 status 字段到 backtest_results 表，使用 ENUM 类型
ALTER TABLE backtest_results 
ADD COLUMN status ENUM('running', 'completed', 'failed') DEFAULT 'running' AFTER early_stop_time;

-- 更新现有记录的状态为 'completed'（假设现有的都是已完成的）
UPDATE backtest_results 
SET status = 'completed' 
WHERE status IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX idx_backtest_results_status ON backtest_results(status);