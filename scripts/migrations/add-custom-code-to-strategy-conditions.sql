-- 添加自定义代码字段到策略条件表
-- 执行时间: 2025-09-23

ALTER TABLE strategy_conditions 
ADD COLUMN custom_code TEXT NULL 
COMMENT '自定义代码逻辑，用于替代传统的条件判断';

-- 添加索引以提高查询性能（可选）
-- CREATE INDEX idx_strategy_conditions_custom_code ON strategy_conditions(custom_code(100));