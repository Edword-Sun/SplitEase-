# 第一阶段：构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# 第二阶段：构建后端
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# 从前端构建阶段复制编译好的资源
COPY --from=frontend-builder /app/web/dist ./web/dist
RUN go build -o main ./cmd/main.go

# 第三阶段：运行
FROM golang:1.25-alpine
WORKDIR /app
# 复制二进制文件
COPY --from=backend-builder /app/main .
# 复制静态资源 (Go 程序运行时需要读取 ./web/dist)
COPY --from=backend-builder /app/web/dist ./web/dist

# 暴露后端端口
EXPOSE 8080

# 启动服务
CMD ["./main"]
