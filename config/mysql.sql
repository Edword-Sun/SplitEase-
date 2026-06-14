-- Bill Table
CREATE TABLE IF NOT EXISTS `bill` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` TEXT,
    `description` TEXT,
    `category` INT,
    `cost_cent` BIGINT,
    `trip_id` VARCHAR(36),
    `team_id` VARCHAR(36),
    `creator` VARCHAR(36),
    `create_time` DATETIME NOT NULL,
    `update_time` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- Team Table
CREATE TABLE IF NOT EXISTS `team` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` TEXT,
    `description` TEXT,
    `creator` VARCHAR(36),
    `leaders` JSON,
    `members` JSON,
    `create_time` DATETIME NOT NULL,
    `update_time` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trip Table
CREATE TABLE IF NOT EXISTS `trip` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` TEXT,
    `description` TEXT,
    `creator` VARCHAR(36),
    `members` JSON,
    `create_time` DATETIME NOT NULL,
    `update_time` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User Table
CREATE TABLE IF NOT EXISTS `user` (
    `id` VARCHAR(36) PRIMARY KEY,
    `name` TEXT,
    `account_name` VARCHAR(255) UNIQUE,
    `password` TEXT,
    `email` VARCHAR(255) UNIQUE,
    `phone_number` VARCHAR(50) UNIQUE,
    `create_time` DATETIME NOT NULL,
    `update_time` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20260409
-- Add involved_members to bill table
ALTER TABLE `bill` ADD COLUMN `involved_members` JSON;
ALTER TABLE `bill` ADD COLUMN `payer_id` VARCHAR(36);


-- 20260613
-- 分账系统数据库，先加一张 session 表
CREATE TABLE session (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,           -- 角色: admin/finance/viewer
    permissions JSON,                     -- 权限列表，JSON格式
    ip_address VARCHAR(45),
    user_agent TEXT, -- 使用的浏览器
    expires_at DATETIME NOT NULL, -- 过期时间
    create_time DATETIME,
    update_time DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_expires ON session(expires_at);
CREATE INDEX idx_user_id ON session(user_id);