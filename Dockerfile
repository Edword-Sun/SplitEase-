# 仅构建后端 API（前端由 web/Dockerfile 单独构建）
# 最终阶段使用 scratch，避免再拉取 alpine 基础镜像（国内镜像站对多基础镜像 TLS 超时更常见）
FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /main ./cmd/main.go

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /usr/share/zoneinfo/Asia/Shanghai /usr/share/zoneinfo/Asia/Shanghai
ENV TZ=Asia/Shanghai
COPY --from=builder /main /main
EXPOSE 8080
ENTRYPOINT ["/main"]
