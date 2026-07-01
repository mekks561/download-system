# MySQL 安装指南

## 🚨 当前状态

在开始之前，我需要说明一下情况：

### Windows 环境中安装 MySQL 的挑战

1. **需要下载** - MySQL安装包约200MB
2. **需要交互** - 安装向导需要用户点击和选择
3. **需要配置** - 需要设置root密码和其他选项
4. **需要时间** - 整个过程可能需要15-30分钟

## 📥 MySQL 安装步骤

### 方法 1: 使用 MySQL Installer (推荐)

#### 步骤 1: 下载 MySQL Installer

1. 访问 MySQL 官方下载页面：
   https://dev.mysql.com/downloads/installer/

2. 下载 **mysql-installer-community-8.0.x.msi** (约 200MB)

#### 步骤 2: 运行安装程序

1. 双击下载的 `.msi` 文件
2. 如果提示"用户账户控制"，点击"是"
3. 选择安装类型：
   - **Developer Default** (推荐) - 包含所有开发工具
   - **Server Only** (最小) - 只安装MySQL服务器

#### 步骤 3: 配置 MySQL Server

1. 在 Configuration Type 页面，选择 **Standalone MySQL Server**
2. 设置 root 密码（记住这个密码！）：
   - 建议使用：`root123456` (测试用)
   - 或者你自己的密码
3. 其他配置保持默认

#### 步骤 4: 完成安装

1. 等待安装完成
2. 确保 **MySQL Server** 服务已启动
3. 点击 Finish

### 方法 2: 使用 Chocolatey (命令行)

如果你有 Chocolatey 包管理器，可以运行：

```powershell
# 安装 MySQL
choco install mysql -y

# 启动 MySQL 服务
net start mysql
```

### 方法 3: 使用 XAMPP (包含 MySQL)

如果你想要一个简单的开发环境，可以安装 XAMPP：

1. 下载 XAMPP: https://www.apachefriends.org/download.html
2. 安装时选择 MySQL 模块
3. 启动 XAMPP Control Panel
4. 点击 MySQL 的 "Start" 按钮

---

## ✅ 安装完成后验证

### 1. 检查 MySQL 服务

打开命令提示符 (CMD)，运行：

```powershell
sc query MySQL80
```

或

```powershell
sc query MySQL
```

应该看到 `STATE` 显示为 `RUNNING`

### 2. 测试 MySQL 连接

```powershell
mysql -u root -p
```

输入你设置的 root 密码

如果看到 `mysql>` 提示符，说明安装成功！

输入 `EXIT` 退出。

---

## ⚙️ 配置项目连接

### 1. 编辑 .env 文件

打开 `backend/.env` 文件，配置你的 MySQL 连接信息：

```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
UPLOAD_PATH=./uploads

# MySQL 数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_root_password  # 替换为你设置的密码
MYSQL_DATABASE=download_manager
```

### 2. 安装 Node.js 依赖

```powershell
cd backend
npm install
```

### 3. 初始化数据库

```powershell
node database/init.js
```

你应该看到类似输出：

```
🚀 开始初始化MySQL数据库...

✅ 连接到MySQL服务器成功！
✅ 数据库创建成功！
✅ users表创建成功！
✅ downloads表创建成功！
✅ uploads表创建成功！

🎉 数据库初始化完成！
```

### 4. 迁移旧数据 (可选)

如果你有 LowDB 的旧数据：

```powershell
node database/migrate.js
```

### 5. 启动后端服务

```powershell
npm start
```

应该看到：

```
✅ MySQL数据库连接成功！
Server running on port 5001
```

---

## 🎉 完成后

恭喜！如果一切顺利，你应该：

1. ✅ MySQL 已安装并运行
2. ✅ 数据库已创建
3. ✅ 项目已连接到 MySQL
4. ✅ 可以访问 GM 后台管理面板

现在启动前端应用：

```powershell
# 在另一个终端
cd download-manager
npm start
```

访问 http://localhost:3000 并登录，点击「🎛 GM 后台」标签页查看管理面板！

---

## 🆘 故障排除

### 问题 1: MySQL 服务未启动

**解决方案：**

```powershell
# 手动启动服务
net start MySQL80
```

或

```powershell
# 手动启动服务
net start MySQL
```

### 问题 2: 连接被拒绝

**检查：**
- MySQL 服务是否正在运行
- 密码是否正确
- 防火墙是否阻止了 3306 端口

### 问题 3: 密码错误

**解决方案：**

1. 打开 MySQL Command Line Client
2. 输入当前密码
3. 修改密码：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### 问题 4: 端口被占用

**解决方案：**

3306 端口可能被其他程序占用。可以：

1. 更换 MySQL 端口：在 `my.ini` 中修改 `port=3307`
2. 或者停止占用端口的程序

---

## 💡 提示

1. **备份重要数据** - 在进行任何数据库操作前备份你的数据
2. **记住密码** - root 密码很重要，确保记住或安全保存
3. **保持更新** - 定期更新 MySQL 到最新版本
4. **阅读文档** - MySQL 官方文档非常全面

---

## 📚 更多资源

- MySQL 官方文档：https://dev.mysql.com/doc/
- MySQL Installer：https://dev.mysql.com/downloads/installer/
- MySQL Workbench (GUI工具)：https://dev.mysql.com/downloads/workbench/

---

**如果安装过程中遇到任何问题，请告诉我具体的错误信息，我会帮你解决！** 🎯
