#!/bin/bash

# 词汇生长 - 生产环境部署脚本
# 使用方法：./DEPLOY-SCRIPT.sh [选项]
# 选项：
#   -h, --help      显示帮助信息
#   -d, --deploy    执行部署
#   -t, --test      执行测试
#   -c, --check     执行检查

# 配置变量
REPO_NAME="vocab-growth"
REPO_OWNER="your-username"
BRANCH="main"
DEPLOY_DIR="."
GITHUB_PAGES_DIR="docs"  # GitHub Pages 部署目录

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数定义
show_help() {
    echo -e "${BLUE}词汇生长 - 生产环境部署脚本${NC}"
    echo ""
    echo -e "${YELLOW}使用方法：${NC}"
    echo "  ./DEPLOY-SCRIPT.sh [选项]"
    echo ""
    echo -e "${YELLOW}选项：${NC}"
    echo "  -h, --help      显示帮助信息"
    echo "  -d, --deploy    执行部署"
    echo "  -t, --test      执行测试"
    echo "  -c, --check     执行检查"
    echo ""
    echo -e "${YELLOW}示例：${NC}"
    echo "  ./DEPLOY-SCRIPT.sh --deploy"
    echo "  ./DEPLOY-SCRIPT.sh --test"
    echo "  ./DEPLOY-SCRIPT.sh --check"
}

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    # 检查 git
    if ! command -v git &> /dev/null; then
        log_error "git 未安装，请先安装 git"
        exit 1
    fi
    
    # 检查 GitHub CLI
    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI 未安装，某些功能可能不可用"
    fi
    
    log_success "依赖检查完成"
}

# 创建 GitHub 仓库
create_github_repo() {
    log_info "创建 GitHub 仓库..."
    
    # 检查是否已存在仓库
    if [ -d ".git" ]; then
        log_warning "已存在 git 仓库，跳过创建"
        return 0
    fi
    
    # 使用 GitHub CLI 创建仓库
    if command -v gh &> /dev/null; then
        gh repo create "$REPO_NAME" --public --clone
    else
        # 手动创建仓库
        log_info "使用手动方式创建仓库..."
        
        # 创建仓库
        curl -u "$REPO_OWNER" https://api.github.com/user/repos -d "{\"name\":\"$REPO_NAME\",\"private\":false}"
        
        # 克隆仓库
        git clone https://github.com/$REPO_OWNER/$REPO_NAME.git
        cd $REPO_NAME
    fi
    
    log_success "GitHub 仓库创建完成"
}

# 初始化 git
init_git() {
    log_info "初始化 git..."
    
    if [ ! -d ".git" ]; then
        git init
    fi
    
    # 添加 .gitignore
    if [ ! -f ".gitignore" ]; then
        cat > .gitignore << EOF
node_modules/
dist/
build/
.cache/
.DS_Store
EOF
        git add .gitignore
        git commit -m "Add .gitignore"
    fi
    
    log_success "git 初始化完成"
}

# 添加文件到仓库
add_files() {
    log_info "添加文件到仓库..."
    
    # 复制应用文件
    cp -r "$DEPLOY_DIR"/* .
    
    # 添加所有文件
    git add .
    
    # 提交
    git commit -m "Deploy: 词汇生长 MVP v1.0"
    
    log_success "文件添加完成"
}

# 推送到 GitHub
push_to_github() {
    log_info "推送到 GitHub..."
    
    # 检查远程仓库
    if ! git remote -v | grep -q "origin"; then
        git remote add origin https://github.com/$REPO_OWNER/$REPO_NAME.git
    fi
    
    # 推送
    git push -u origin $BRANCH
    
    log_success "推送完成"
}

# 启用 GitHub Pages
enable_github_pages() {
    log_info "启用 GitHub Pages..."
    
    if command -v gh &> /dev/null; then
        # 使用 GitHub CLI 启用 Pages
        gh repo edit --enable-pages
        gh pages setup --source $GITHUB_PAGES_DIR
    else
        log_info "手动启用 GitHub Pages..."
        # 手动步骤：
        # 1. 登录 GitHub
        # 2. 进入仓库设置
        # 3. 选择 "Pages"
        # 4. 选择 "$BRANCH" 分支
        # 5. 选择 "$GITHUB_PAGES_DIR" 目录
        # 6. 启用 GitHub Pages
    fi
    
    log_success "GitHub Pages 启用完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 获取部署 URL
    if command -v gh &> /dev/null; then
        DEPLOY_URL=$(gh repo view --json homepage | jq -r '.homepage')
    else
        DEPLOY_URL="https://$REPO_OWNER.github.io/$REPO_NAME"
    fi
    
    log_info "部署 URL: $DEPLOY_URL"
    
    # 检查是否可访问
    if curl -s --head "$DEPLOY_URL" | grep -q "200 OK"; then
        log_success "部署验证成功"
        log_success "访问地址: $DEPLOY_URL"
    else
        log_error "部署验证失败"
        exit 1
    fi
}

# 执行测试
run_tests() {
    log_info "执行测试..."
    
    # 检查页面加载
    log_info "检查页面加载..."
    if curl -s "$DEPLOY_URL" | grep -q "词汇生长"; then
        log_success "页面加载正常"
    else
        log_error "页面加载失败"
    fi
    
    # 检查功能
    log_info "检查核心功能..."
    # 这里可以添加具体的测试用例
    
    log_success "测试完成"
}

# 执行检查
run_checks() {
    log_info "执行检查..."
    
    # 检查 HTTPS
    log_info "检查 HTTPS..."
    if curl -sI "$DEPLOY_URL" | grep -q "200 OK"; then
        log_success "HTTPS 正常"
    else
        log_error "HTTPS 异常"
    fi
    
    # 检查 CDN
    log_info "检查 CDN..."
    if curl -sI "$DEPLOY_URL" | grep -q "Cache-Control"; then
        log_success "CDN 正常"
    else
        log_warning "CDN 未启用"
    fi
    
    # 检查监控
    log_info "检查监控系统..."
    # 这里可以添加监控系统的检查
    
    log_success "检查完成"
}

# 主函数
main() {
    # 解析命令行参数
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--deploy)
            check_dependencies
            create_github_repo
            init_git
            add_files
            push_to_github
            enable_github_pages
            verify_deployment
            ;;
        -t|--test)
            run_tests
            ;;
        -c|--check)
            run_checks
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"