-- 更新 strategy_conditions 表，添加 condition_group 字段
ALTER TABLE strategy_conditions ADD COLUMN condition_group INT DEFAULT 1 AFTER action;