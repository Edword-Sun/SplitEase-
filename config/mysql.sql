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
