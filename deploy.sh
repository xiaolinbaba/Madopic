#!/bin/bash

# Madopic 部署脚本
# 使用方法: ./deploy.sh

# 配置变量
SERVER="root@your-server-ip"
PORT="22"
REMOTE_PATH="/var/www/html/madopic"

echo "🚀 开始部署 Madopic 到服务器..."
echo "📍 服务器: $SERVER"
echo "📁 目标路径: $REMOTE_PATH"
echo ""

# 检查必要文件是否存在
echo "🔍 检查项目文件..."
required_files=("index.html" "script.js" "style.css" "favicon.svg" "madopic.png" "manifest.json")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ 缺少必要文件:"
    printf '   - %s\n' "${missing_files[@]}"
    echo "请确保在项目根目录下运行此脚本。"
    exit 1
fi

echo "✅ 所有必要文件检查完毕"
echo ""

# 测试服务器连接
echo "🔗 测试服务器连接..."
if ! ssh -p $PORT -o ConnectTimeout=10 $SERVER "echo '连接成功'" 2>/dev/null; then
    echo "❌ 无法连接到服务器 $SERVER"
    echo "请检查:"
    echo "   - 服务器地址是否正确"
    echo "   - SSH 密钥是否配置"
    echo "   - 网络连接是否正常"
    exit 1
fi

echo "✅ 服务器连接正常"
echo ""

# 创建远程目录
echo "📁 创建远程目录..."
ssh -p $PORT $SERVER "mkdir -p $REMOTE_PATH"

if [ $? -eq 0 ]; then
    echo "✅ 远程目录创建成功"
else
    echo "❌ 远程目录创建失败"
    exit 1
fi

echo ""

# 同步文件到服务器
echo "📤 上传文件到服务器..."
# 使用 scp 上传文件（服务器没有 rsync）
files_to_upload=("index.html" "script.js" "style.css" "favicon.svg" "madopic.png" "manifest.json" "README.md")
for file in "${files_to_upload[@]}"; do
    if [ -f "$file" ]; then
        echo "  上传: $file"
        scp -P $PORT "$file" $SERVER:$REMOTE_PATH/
        if [ $? -ne 0 ]; then
            echo "❌ 文件 $file 上传失败"
            exit 1
        fi
    fi
done

echo "✅ 所有文件上传成功"

echo ""

# 设置文件权限
echo "🔐 设置文件权限..."
ssh -p $PORT $SERVER "chown -R www-data:www-data $REMOTE_PATH 2>/dev/null || chown -R apache:apache $REMOTE_PATH 2>/dev/null || echo '权限设置跳过（可能需要手动设置）'"
ssh -p $PORT $SERVER "chmod -R 755 $REMOTE_PATH"

echo "✅ 权限设置完成"
echo ""

# 重启 Web 服务器（可选）
echo "🔄 重启 Web 服务器..."
ssh -p $PORT $SERVER "systemctl reload nginx 2>/dev/null || systemctl reload apache2 2>/dev/null || echo 'Web 服务器重启跳过'"

echo ""
echo "🎉 部署完成！"
echo ""
echo "🌐 访问地址:"
echo "   http://xxx.xxx.xxx.xxx/madopic/"
echo ""
echo "💡 提示:"
echo "   - 如果无法访问，请检查防火墙设置"
echo "   - 建议配置域名和 HTTPS"
echo "   - 查看部署指南: DEPLOYMENT.md"
echo ""