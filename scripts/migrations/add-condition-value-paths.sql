-- 添加条件值路径字段到策略条件表
-- 执行时间: 2025-01-22

USE crypto_data;

-- 添加当前值路径字段
ALTER TABLE strategy_conditions 
ADD COLUMN current_value_path VARCHAR(255) NULL 
COMMENT '当前值的属性路径，用于从复杂对象中提取值，如 macd 或 signal 或 histogram';

-- 添加比较值路径字段
ALTER TABLE strategy_conditions 
ADD COLUMN compared_value_path VARCHAR(255) NULL 
COMMENT '比较值的属性路径，用于从复杂对象中提取值，如 macd 或 signal 或 histogram';

-- 添加索引以提高查询性能
CREATE INDEX idx_strategy_conditions_current_value_path ON strategy_conditions(current_value_path);
CREATE INDEX idx_strategy_conditions_compared_value_path ON strategy_conditions(compared_value_path);

-- 显示表结构确认修改
DESCRIBE strategy_conditions;

SELECT 'Migration completed: Added current_value_path and compared_value_path columns to strategy_conditions table' as status;