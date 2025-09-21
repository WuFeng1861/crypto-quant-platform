-- 添加止盈止损字段到策略表
-- 执行时间: 2025-01-22

USE crypto_data;

-- 添加止盈比例字段（可选，大于100%）
ALTER TABLE strategies 
ADD COLUMN take_profit_ratio DECIMAL(10,2) NULL COMMENT '止盈比例，大于100%时触发止盈';

-- 添加止损比例字段（可选，0-100%之间）
ALTER TABLE strategies 
ADD COLUMN stop_loss_ratio DECIMAL(10,2) NULL COMMENT '止损比例，小于100%时触发止损';

-- 添加索引以提高查询性能
CREATE INDEX idx_strategies_take_profit ON strategies(take_profit_ratio);
CREATE INDEX idx_strategies_stop_loss ON strategies(stop_loss_ratio);

-- 显示表结构确认修改
DESCRIBE strategies;

-- 示例数据更新（可选）
-- UPDATE strategies SET take_profit_ratio = 110.0, stop_loss_ratio = 95.0 WHERE id = 1;

COMMIT;