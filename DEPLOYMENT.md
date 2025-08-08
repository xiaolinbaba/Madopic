# 🚀 Madopic 部署指南

本指南将帮助您将 Madopic 项目部署到服务器上。

## 📦 项目打包

Madopic 是一个纯前端项目，无需复杂的构建过程，只需要将项目文件上传到服务器即可。

### 需要上传的文件
```
Madopic/
├── index.html          # 主页面
├── script.js           # 核心脚本
├── style.css           # 样式文件
├── favicon.svg         # 网站图标
├── madopic.png         # 项目图片
├── manifest.json       # PWA 配置
└── README.md           # 说明文档（可选）
```

## 🌐 服务器部署

### 方法一：使用 SCP 上传文件

1. **创建项目压缩包**
   ```bash
   # 在项目根目录下
   tar -czf madopic.tar.gz index.html script.js style.css favicon.svg madopic.png manifest.json
   ```

2. **上传到服务器**
   ```bash
   scp -P 22 madopic.tar.gz root@your-server-ip:/var/www/html/
   ```

3. **登录服务器并解压**
   ```bash
   ssh root@your-server-ip -p 22
   cd /var/www/html/
   tar -xzf madopic.tar.gz
   rm madopic.tar.gz
   ```

### 方法二：使用 rsync 同步文件

```bash
# 同步项目文件到服务器
rsync -avz -e "ssh -p 22" \
  --include='*.html' \
  --include='*.js' \
  --include='*.css' \
  --include='*.svg' \
  --include='*.png' \
  --include='*.json' \
  --exclude='*' \
  ./ root@your-server-ip:/var/www/html/madopic/
```

### 方法三：使用 Git 部署

1. **在服务器上克隆项目**
   ```bash
   ssh root@your-server-ip -p 22
   cd /var/www/html/
   git clone https://github.com/your-username/Madopic.git
   ```

2. **后续更新**
   ```bash
   cd /var/www/html/Madopic
   git pull origin main
   ```

## ⚙️ 服务器配置

### Nginx 配置示例

创建 Nginx 配置文件 `/etc/nginx/sites-available/madopic`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或 IP
    
    root /var/www/html/madopic;
    index index.html;
    
    # 启用 gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # 缓存静态资源
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 主页面配置
    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
    }
    
    # 安全头配置
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/madopic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache 配置示例

创建 `.htaccess` 文件：

```apache
# 启用压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 缓存设置
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# 安全头
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
```

## 🔧 快速部署脚本

创建部署脚本 `deploy.sh`：

```bash
#!/bin/bash

# 配置变量
SERVER="root@your-server-ip"
PORT="22"
REMOTE_PATH="/var/www/html/madopic"

echo "🚀 开始部署 Madopic..."

# 创建远程目录
ssh -p $PORT $SERVER "mkdir -p $REMOTE_PATH"

# 同步文件
echo "📁 同步文件到服务器..."
rsync -avz -e "ssh -p $PORT" \
  --include='*.html' \
  --include='*.js' \
  --include='*.css' \
  --include='*.svg' \
  --include='*.png' \
  --include='*.json' \
  --exclude='*' \
  ./ $SERVER:$REMOTE_PATH/

echo "✅ 部署完成！"
echo "🌐 访问地址: http://your-server-ip/madopic/"
```

使用脚本：
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔍 部署验证

部署完成后，访问以下地址验证：
- http://your-server-ip/madopic/
- 检查所有功能是否正常工作
- 验证科学公式和图表渲染
- 测试导出功能

## 🛠️ 故障排除

### 常见问题

1. **403 Forbidden 错误**
   ```bash
   # 检查文件权限
   sudo chown -R www-data:www-data /var/www/html/madopic
   sudo chmod -R 755 /var/www/html/madopic
   ```

2. **静态资源加载失败**
   - 检查文件路径是否正确
   - 确认所有必需文件都已上传

3. **功能异常**
   - 检查浏览器控制台错误
   - 确认 CDN 资源可正常访问

### 日志查看

```bash
# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Apache 日志
sudo tail -f /var/log/apache2/access.log
sudo tail -f /var/log/apache2/error.log
```

## 🔄 自动化部署

可以配置 GitHub Actions 实现自动部署：

```yaml
# .github/workflows/deploy.yml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: your-server-ip
        username: root
        port: 22
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/html/madopic
          git pull origin main
          sudo systemctl reload nginx
```

---

💡 **提示**：建议使用 HTTPS 和域名访问，提升用户体验和安全性。