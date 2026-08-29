#!/bin/bash

# 词汇生长 GitHub Pages 部署脚本
# 作者：九思
# 日期：2026-08-28

echo "🌱 词汇生长 GitHub Pages 部署脚本"
echo "=============================="

# 检查网络连接
echo "🔍 检查网络连接..."
if curl -I https://github.com 2>/dev/null | grep "200 OK" > /dev/null; then
    echo "✅ GitHub 连接正常"
else
    echo "❌ GitHub 连接失败，请检查网络"
    exit 1
fi

# 检查Git状态
echo "📋 检查Git状态..."
if git status | grep "nothing to commit" > /dev/null; then
    echo "✅ Git 状态正常"
else
    echo "⚠️ Git 有未提交的更改，建议先提交"
    read -p "是否继续？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 步骤1：创建GitHub仓库
echo "🚀 步骤1：创建GitHub仓库"
echo "请访问 https://github.com/new 并创建新仓库"
echo "仓库名称：vocab-growth"
echo "描述：词汇生长 MVP - 不背单词，让单词长出来"
echo "公开仓库，添加README文件"
read -p "按回车键继续..."

# 步骤2：配置仓库
echo "🔧 步骤2：配置GitHub Pages"
echo "进入仓库设置 → Pages → 选择main分支"
echo "等待部署完成（通常需要几分钟）"
read -p "按回车键继续..."

# 步骤3：获取仓库URL
echo "🔗 步骤3：获取仓库URL"
echo "在仓库页面点击'Code'按钮，复制HTTPS URL"
read -p "请输入仓库URL: " repo_url

# 步骤4：添加远程仓库
echo "📤 步骤4：添加远程仓库"
git remote add origin "$repo_url"
if [ $? -eq 0 ]; then
    echo "✅ 远程仓库添加成功"
else
    echo "❌ 远程仓库添加失败"
    exit 1
fi

# 步骤5：推送代码
echo "📤 步骤5：推送代码到GitHub"
git push -u origin master
if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功"
else
    echo "❌ 代码推送失败"
    exit 1
fi

# 步骤6：等待部署
echo "⏳ 步骤6：等待GitHub Pages部署"
echo "部署通常需要1-5分钟"
echo "请访问 https://你的用户名.github.io/vocab-growth/ 检查部署状态"
read -p "按回车键继续..."

# 步骤7：测试部署
echo "🧪 步骤7：测试部署结果"
echo "访问部署的URL并测试以下功能："
echo "1. 核心功能（学新词、复习、造句、说法库、我的词汇）"
echo "2. 使用次数限制功能"
echo "3. 反馈系统"
echo "4. 跨平台兼容性"
echo "5. TTS发音功能"

# 步骤8：微信测试
echo "📱 步骤8：微信白名单测试"
echo "在微信中打开链接，测试是否可以直接访问"
echo "如果无法访问，需要在微信开放平台配置白名单"

# 步骤9：收集反馈
echo "📝 步骤9：收集用户反馈"
echo "分享链接到朋友圈、微信群"
echo "邀请朋友测试并提供反馈"

echo "=============================="
echo "🎉 部署完成！"
echo "访问地址：https://你的用户名.github.io/vocab-growth/"
echo "请测试所有功能并收集用户反馈"