#!/bin/bash

# 简单部署脚本 - 直接上传到GitHub Pages

echo "🌱 词汇生长 简单部署脚本"
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

# 步骤1：创建临时分支用于部署
echo "🚀 步骤1：创建临时分支"
git checkout -b gh-pages

# 步骤2：复制文件
echo "📋 步骤2：复制文件到临时分支"
cp -r ./* .

# 步骤3：提交到临时分支
echo "📤 步骤3：提交到临时分支"
git add .
git commit -m "Deploy to GitHub Pages"

# 步骤4：推送到远程
echo "📤 步骤4：推送到远程"
git push -u origin gh-pages

# 步骤5：切换回主分支
echo "🔄 步骤5：切换回主分支"
git checkout master

echo "=============================="
echo "🎉 部署完成！"
echo "访问地址：https://Dukekang0124.github.io/vocab-growth/"
echo "请等待几分钟让GitHub Pages部署完成"