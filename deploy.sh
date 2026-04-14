#!/bin/bash

# SplitEase 部署脚本 (Linux/macOS)
# 功能：拉取镜像并显示详细镜像信息

COMPOSE_FILE="docker-compose.hub.yml"
ENV_FILE=".env"

# 颜色定义
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}[ERROR] $COMPOSE_FILE 不存在！${NC}"
    exit 1
fi

# 加载 .env 环境变量
if [ -f "$ENV_FILE" ]; then
    echo -e "${CYAN}[INFO] 正在从 $ENV_FILE 加载环境变量...${NC}"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# 获取镜像名称（处理默认值）
BACKEND_IMAGE=${BACKEND_IMAGE:-edwordddddddddd/split_ease-backend:latest}
FRONTEND_IMAGE=${FRONTEND_IMAGE:-edwordddddddddd/split_ease-frontend:latest}

echo -e "\n${CYAN}[1/2] 正在拉取最新镜像...${NC}"
echo -e "  -> 后端镜像: ${YELLOW}$BACKEND_IMAGE${NC}"
echo -e "  -> 前端镜像: ${YELLOW}$FRONTEND_IMAGE${NC}"

docker compose -f "$COMPOSE_FILE" pull
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] 镜像拉取失败。${NC}"
    exit 1
fi
echo -e "${GREEN}[SUCCESS] 所有镜像拉取成功。${NC}\n"

echo -e "${CYAN}[2/2] 正在启动服务...${NC}"
docker compose -f "$COMPOSE_FILE" up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] 服务启动失败。${NC}"
    exit 1
fi

echo -e "\n${GREEN}[SUCCESS] 服务已成功运行！${NC}"
echo -e "${GRAY}--------------------------------------------------${NC}"
# 使用 -a 显示所有服务（包括可能启动失败的），并等待 1 秒确保状态更新
sleep 1
docker compose -f "$COMPOSE_FILE" ps -a --format "table {{.Service}}\t{{.Status}}\t{{.Image}}"
echo -e "${GRAY}--------------------------------------------------${NC}"
