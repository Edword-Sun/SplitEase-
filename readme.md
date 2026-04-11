# SplitEase - 智能分账助手 💰

SplitEase 是一个基于 Go 语言和 React 开发的现代化智能分账系统，旨在解决多人旅行、聚会及团队活动中的财务结算问题。系统支持账单记录、成员管理、团队协作，并提供核心的“一键分账”功能。

## 🚀 核心特性

- **模块化架构**：后端采用 Repository/Handler 分层结构，前端基于 React 19 + Vite 8 构建，清晰易扩展。
- **智能分账算法**：
  - **余数平摊**：内部运算以“角”为单位（`int64`），自动处理除不尽的余数，确保账目一分不差。
  - **最简转账路径**：通过贪心算法自动匹配债权人与债务人，生成最直观的“谁给谁多少钱”清单。
- **财务严谨性**：彻底规避浮点数精度问题。展示层自动转换，支持 100 角 = 1 元的货币换算。
- **自动化测试**：集成 Mock 数据库测试，所有 Repository 和 Handler 均有完整的单元测试覆盖。
- **容器化部署**：提供 Docker 和 Docker Compose 配置，支持一键部署。

## 🛠️ 技术栈

### 后端 (Backend)
- **语言**: [Go (Golang)](https://go.dev/) 1.25+
- **Web 框架**: [Gin](https://gin-gonic.com/)
- **ORM**: [GORM](https://gorm.io/) (MySQL 8.0)
- **测试**: [sqlmock](https://github.com/DATA-DOG/go-sqlmock), [testify](https://github.com/stretchr/testify)
- **工具库**: [samber/lo](https://github.com/samber/lo) (集合处理)

### 前端 (Frontend)
- **框架**: [React 19](https://react.dev/)
- **构建工具**: [Vite 8](https://vitejs.dev/)
- **语言**: [TypeScript 6](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **路由**: [React Router 7](https://reactrouter.com/)
- **通信**: [Axios](https://axios-http.com/)

## 📂 项目结构

```text
split_ease/
├── cmd/                # 后端入口
├── config/             # 数据库配置及 SQL 脚本
├── model/              # 数据模型定义
├── repository/         # 数据库操作层 (DAO)
├── router/             # API 路由及业务逻辑层 (Handler)
├── utils/              # 加密、哈希等工具类
├── web/                # React 前端项目
│   ├── src/            # 前端源代码
│   └── nginx.conf      # 容器化 Nginx 配置
├── Dockerfile          # 后端 Docker 构建文件
└── docker-compose.yml  # 全栈容器编排
```

## ⚙️ 快速开始

### 1. 环境准备
- 安装 [Go 1.25+](https://go.dev/doc/install)
- 安装 [Node.js 20+](https://nodejs.org/)
- 安装 [MySQL 8.0](https://dev.mysql.com/downloads/mysql/)

### 2. 数据库配置
1. 创建数据库 `split_ease`。
2. 执行 `config/mysql.sql` 中的脚本初始化表结构。

### 3. 后端运行
```bash
# 进入项目根目录
go mod tidy
# 复制并修改环境变量（根据实际数据库配置）
cp .env.example .env
# 运行后端
go run cmd/main.go
```

### 4. 前端运行
```bash
cd web
npm install
npm run dev
```
访问：`http://localhost:5173`

### 5. 容器化本地开发
```bash
# 根目录下执行
docker compose up -d
```
访问：`http://localhost` (前端已通过 Nginx 反向代理至后端)

## 🌐 云服务器部署 (Docker)

本节介绍如何在 Linux 云服务器上快速部署 SplitEase 生产环境。

### 1. 准备工作
- 确保服务器已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。
- 准备好一个可用的 MySQL 8.0 实例（可以是本地 Docker 运行或云数据库）。

### 2. 获取代码
```bash
git clone <your-repo-url>
cd split_ease
```

### 3. 配置环境变量
复制 `.env.example` 并根据服务器实际情况修改：
```bash
cp .env.example .env
nano .env
```
**关键变量说明：**
- `DB_HOST`: 数据库连接地址。若使用 Docker 部署且数据库在宿主机，通常设为 `host.docker.internal`。
- `FRONTEND_PORT`: 前端访问端口，默认 `3000`。
- `DB_PASSWORD`: 数据库密码。

### 4. 启动服务
使用 `docker-compose.yml` 构建并启动所有容器：
```bash
docker compose up -d --build
```
该命令会自动：
1. **后端构建**：基于 `golang:alpine` 编译二进制，并在 `scratch` 镜像中运行。
2. **前端构建**：基于 `node` 编译静态资源，并由 `nginx:alpine` 托管。
3. **网络配置**：前端 Nginx 会将 `/api/` 请求自动转发至后端容器。

### 5. 验证部署
- 访问：`http://<服务器IP>:<FRONTEND_PORT>` (默认 3000)。
- 检查后端状态：`curl http://<服务器IP>:8080/health`。

### 6. 常用运维命令
- **查看日志**：`docker compose logs -f`
- **停止服务**：`docker compose down`
- **更新代码后重启**：
  ```bash
  git pull
  docker compose up -d --build
  ```

## 🧪 运行测试
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
5. **展示转换**：输出时自动将“角”转换为“元”字符串（如 `123.45 元`），保证精度。

## 📖 接口文档概览

### 1. 用户模块 (`/user`)
- `POST /login`, `POST /register`: 身份鉴权
- `POST /find_by_id`, `POST /update_by_id`: 资料管理

### 2. 账单模块 (`/bill`)
- `POST /add`, `POST /find_by_id`, `POST /delete_by_id`: 账单流水管理

### 3. 旅行模块 (`/trip`)
- `POST /add`, `POST /find_by_id`: 旅行计划管理
- **`POST /split`**: 核心接口，一键生成结算清单。

---
Made with ❤️ by SplitEase Team
