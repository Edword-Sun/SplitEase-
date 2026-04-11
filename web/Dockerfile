# 前端静态资源 + Nginx（将 /api 反代到后端）
# 构建阶段用 Debian（glibc）：Vite 8 / Rolldown 在 node:alpine（musl）下 npm ci 常漏装 @rolldown/binding-linux-x64-musl，导致 vite build 报错。
# 上下文须配合 web/.dockerignore 排除宿主机 node_modules，避免覆盖 npm ci。
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
