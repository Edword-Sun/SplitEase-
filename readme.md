# SplitEase - 团体分账神器 💸

SplitEase 是一款专为团队旅行、聚餐、团建等场景设计的**团体分账后端服务**。它基于 Go 语言开发，能够高效地管理成员关系、追踪活动开销，并自动计算复杂的账单分摊，让每一笔钱都清清楚楚。

## 🌟 核心功能

- **👤 用户管理**: 支持用户注册、个人资料管理及多设备登录。
- **👥 团队协作**: 
    - 创建自定义团队，支持设置**领队**与**普通成员**权限。
    - 团队成员共同维护账单，数据实时同步。
- **🗺️ 活动/旅行管理 (Trip)**: 
    - 以“次”为单位组织账单，例如“2026年成都三日游”。
    - 将复杂的长期活动拆分为独立的单元进行管理。
- **💰 智能分账 (Bill)**:
    - 详细记录费用分类（餐饮、交通、住宿等）。
    - 记录费用创建者、所属团队及所属活动。
    - 费用单位精确到“角/分”（int64 存储），彻底杜绝浮点数精度丢失问题。

## 🛠️ 技术栈

- **语言**: [Go](https://golang.org/) (v1.23+)
- **Web 框架**: [Gin](https://github.com/gin-gonic/gin) - 高性能 HTTP 路由
- **数据库 ORM**: [GORM](https://gorm.io/) - 支持自动迁移、关联查询
- **数据库**: [MySQL](https://www.mysql.com/) (5.7+)
- **架构**: 遵循标准的 MVC 模型设计，具备良好的扩展性。

## 📂 项目结构

```text
split_ease/
├── config/             # 配置文件与数据库初始化
├── model/              # 数据模型定义 (GORM Models)
│   ├── bill.go         # 账单模型
│   ├── team.go         # 团队模型
│   ├── trip.go         # 活动/旅行模型
│   └── user.go         # 用户模型
├── repo/               # 数据访问层
└── main.go             # 项目入口
```

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd split_ease
```

### 2. 配置数据库
在 `config/database.go` 中修改你的数据库连接信息：
```go
dsn := "user:password@tcp(127.0.0.1:3306)/split_ease?charset=utf8mb4&parseTime=True&loc=Local"
```

### 3. 安装依赖
```bash
go mod tidy
```

### 4. 运行服务
```bash
go run main.go
```

## 📝 开发者备注

本项目在模型设计上采用了**高精度金额存储策略**（使用 `int64` 存储“角/分”），在 MySQL 中对应 `BIGINT` 类型。对于数组类型（如团队成员列表），推荐使用 GORM 的 `serializer:json` 标签以获得最佳的 MySQL 兼容性。

---
Made with ❤️ by SplitEase Team.
