# SplitEase - 智能分账助手

SplitEase 是一个基于 Go 语言和 Gin 框架开发的智能分账系统，旨在解决多人旅行、活动中的财务结算问题。系统支持账单记录、成员管理、团队协作，并提供核心的“一键分账”功能。

## 🚀 核心特性

- **模块化设计**：清晰的 Repository/Handler 分层结构，便于扩展和测试。
- **智能分账算法**：
  - **余数平摊**：采用整数运算（角为单位），自动处理除不尽的余数，确保账目一分不差。
  - **最简转账路径**：通过贪心算法自动匹配债权人与债务人，生成最直观的“谁给谁多少钱”清单。
- **财务严谨性**：
  - 内部计算统一使用 `int64`（单位：角），彻底规避浮点数精度问题。
  - 展示层自动转换，支持 100 角 = 1 元的货币换算。
- **自动化测试**：集成 Mock 数据库测试，所有 Repository 和 Handler 均有完整的单元测试覆盖。

## 🛠️ 技术栈

- **后端**: Go (Golang)
- **Web 框架**: Gin
- **ORM**: GORM (MySQL)
- **测试**: sqlmock, testify
- **工具库**: samber/lo (集合处理)

## 📖 接口文档

### 1. 用户模块 (`/user`)
- `POST /register`: 用户注册
- `POST /login`: 用户登录
- `POST /find_by_id`: 查询用户信息
- `POST /update_by_id`: 修改个人资料
- `POST /delete_by_id`: 注销账户

### 2. 账单模块 (`/bill`)
- `POST /add`: 创建新账单（需关联 TripID）
- `POST /find_by_id`: 查询账单详情
- `POST /update_by_id`: 编辑账单
- `POST /delete_by_id`: 删除账单

### 3. 旅行模块 (`/trip`)
- `POST /add`: 创建旅行计划
- `POST /find_by_id`: 获取旅行详情及成员
- `POST /update_by_id`: 更新旅行信息
- `POST /delete_by_id`: 归档旅行
- **`POST /split`**: 一键结算。计算该旅行下所有账单，生成成员间的转账清单。

### 4. 团队模块 (`/team`)
- `POST /add`: 创建团队
- `POST /find_by_id`: 查询团队成员及配置
- `POST /update_by_id`: 修改团队信息
- `POST /delete_by_id`: 解散团队

## ⚙️ 快速开始

### 1. 数据库配置
执行 `config/mysql.sql` 中的脚本创建数据库表结构。

### 2. 环境运行
```bash
# 安装依赖
go mod tidy

# 运行主程序
go run cmd/main.go
```

### 3. 运行测试
```bash
# 运行所有 repository 测试
go test -v ./repository/...

# 运行所有 router 测试
go test -v ./router/...
```

## 📐 分账逻辑说明 (Split 阶段)

系统在结算时会将所有金额转换为“角”进行整数运算：
1. 计算总支出 $Total$。
2. 计算人均应付 $Avg = Total / Members$。
3. 计算余数 $Remainder = Total \% Members$。
4. **余数平摊**：前 $Remainder$ 位成员多承担 1 角，确保总额闭环。
5. **金额展示**：输出时自动调用 `toYuan` 函数，将“角”转换为“元”字符串（如 `123.45 元`），保证展示美观且无精度丢失。
