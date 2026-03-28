#!/bin/bash

# 🔍 简单检测：如果用 sh 执行，提示用 bash
if [ -z "$BASH_VERSION" ]; then
    echo "❌ 请使用 bash 执行本脚本："
    echo "   bash $0 $*"
    exit 1
fi

# =============================================================================
# 脚本名称：netcheck.sh
# 功能描述：容器/服务器网络连通性诊断工具
# 使用方式：./netcheck.sh [目标域名] [端口]
# 示例：    ./netcheck.sh
#           ./netcheck.sh github.com
#           ./netcheck.sh api.example.com 80
# =============================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认目标
TARGET_HOST="${1:-google.com}"
TARGET_PORT="${2:-443}"
TARGET_URL="https://${TARGET_HOST}"

# 打印函数
print_header() {
    echo -e "${BLUE}=================================================================${NC}"
    echo -e "${BLUE}🔍 网络诊断报告${NC}"
    echo -e "${BLUE}=================================================================${NC}"
    echo -e "📅 时间：$(date '+%Y-%m-%d %H:%M:%S %Z')"
    echo -e "🎯 目标：${TARGET_HOST}:${TARGET_PORT}"
    echo -e "${BLUE}-----------------------------------------------------------------${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 主检测逻辑
main() {
    local exit_code=0

    print_header

    # 1. DNS 解析测试
    echo ""
    echo "【1/4】DNS 解析测试"
    DNS_RESULT=$(getent hosts "${TARGET_HOST}" 2>/dev/null | head -1 | awk '{print $1}')
    if [ -n "${DNS_RESULT}" ]; then
        print_success "DNS 解析成功：${DNS_RESULT}"
    else
        print_error "DNS 解析失败"
        exit_code=1
    fi

    # 2. HTTP/HTTPS 连通性测试
    echo ""
    echo "【2/4】HTTP 连通性测试"
    HTTP_RESULT=$(curl -o /dev/null -s -w "DNS 解析:%{time_namelookup}s | 连接建立:%{time_connect}s | 总耗时:%{time_total}s" "${TARGET_URL}" 2>/dev/null)
    HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" "${TARGET_URL}" 2>/dev/null)
    if [ "${HTTP_CODE}" != "000" ] && [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 400 ]; then
        print_success "HTTP 连通成功 (状态码：${HTTP_CODE})"
        print_info "耗时详情：${HTTP_RESULT}"
    else
        print_error "HTTP 连通失败 (状态码：${HTTP_CODE})"
        exit_code=1
    fi

    # 3. TCP 端口连通性测试（改进版，兼容多种 nc 输出）
    echo ""
    echo "【3/4】TCP 端口连通性测试"
    if command -v nc &> /dev/null; then
        NC_OUTPUT=$(nc -zv -w 3 "${TARGET_HOST}" "${TARGET_PORT}" 2>&1)
        if echo "${NC_OUTPUT}" | grep -qE "succeeded|open|OK|Connection.*succeeded"; then
            print_success "端口 ${TARGET_PORT} 开放"
        else
            # HTTP 能通则端口肯定是通的，这里只给警告
            if [ "${HTTP_CODE}" != "000" ] && [ "${HTTP_CODE}" -ge 200 ]; then
                print_warning "端口检测误报（HTTP 能通则端口肯定通）"
            else
                print_error "端口 ${TARGET_PORT} 检测失败"
                exit_code=1
            fi
        fi
    else
        print_warning "nc 命令未安装，跳过端口检测"
    fi

    # 4. 基础环境信息
    echo ""
    echo "【4/4】环境信息"
    print_info "主机名：$(hostname 2>/dev/null || echo '未知')"
    print_info "当前用户：$(whoami 2>/dev/null || echo '未知')"
    print_info "容器检测：$(cat /proc/1/cgroup &>/dev/null && echo '是容器环境' || echo '物理机/虚拟机')"

    # 总结
    echo ""
    echo -e "${BLUE}-----------------------------------------------------------------${NC}"
    if [ ${exit_code} -eq 0 ]; then
        print_success "网络诊断完成 - 所有检查通过！"
    else
        print_warning "网络诊断完成 - 部分检查未通过，请排查"
    fi
    echo -e "${BLUE}=================================================================${NC}"

    return ${exit_code}
}

# 显示帮助信息
show_help() {
    echo "用法：$0 [目标域名] [端口]"
    echo ""
    echo "示例:"
    echo "  $0                    # 默认检测 google.com:443"
    echo "  $0 github.com         # 检测 github.com:443"
    echo "  $0 api.example.com 80 # 检测 api.example.com:80"
    echo ""
    echo "退出码:"
    echo "  0 - 所有检查通过"
    echo "  1 - 部分检查失败"
}

# 处理参数
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_help
    exit 0
fi

# 执行主逻辑
main
exit $?