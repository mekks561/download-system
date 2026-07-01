# MySQL 数据库迁移指南

## ✅ 迁移准备

### 当前状态
- ✅ MySQL80服务已安装并运行
- ✅ 项目已配置MySQL连接
- ✅ 迁移脚本已准备

---

## 🚀 开始迁移

### 步骤 1: 安装MySQL依赖

在终端运行：

```powershell
cd backend
npm install
```

### 步骤 2: 初始化MySQL数据库

```powershell
node database/init-mysql.js
```

你应该看到：

```
🚀 开始初始化MySQL数据库...

✅ 连接到MySQL服务器成功！
✅ 数据库创建成功！
✅ users表创建成功！
✅ downloads表创建成功！
✅ uploads表创建成功！
✅ MySQL数据库初始化完成！
```

### 步骤 3: 迁移SQLite数据（可选）

如果你有SQLite中的数据想要迁移：

```powershell
node database/migrate-mysql.js
```

这个脚本会：
- 读取SQLite数据库文件
- 迁移用户、下载记录、上传记录到MySQL
- 跳过已存在的记录

### 步骤 4: 启动服务

```powershell
npm start
```

---

## 📋 验证迁移

### 检查数据库

使用MySQL客户端连接：

```bash
mysql -u root -p

USE download_manager;

SHOW TABLES;
```

你应该看到：

```
Tables_in_download_manager
downloads
uploads
users
```

### 检查数据

```sql
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as download_count FROM downloads;
SELECT COUNT(*) as upload_count FROM uploads;
```

---

## 🎛 GM后台管理面板

迁移完成后，访问：
- http://localhost:3001 → 点击「🎛 GM后台」
- 查看用户、下载记录、上传记录

---

## 📝 配置说明

### 环境变量

编辑 `backend/.env`：

```env
PORT=5001
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
UPLOAD_PATH=./uploads

# MySQL数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=download_manager
```

### 修改密码

如果MySQL root账户有密码，修改 `.env` 文件：

```env
MYSQL_PASSWORD=your_password
```

---

## 🆘 常见问题

### 问题 1: 连接被拒绝

**错误：** `ECONNREFUSED`

**解决方案：**
1. 检查MySQL服务是否运行
   ```powershell
   Get-Service MySQL80
   ```
2. 启动服务
   ```powershell
   Start-Service MySQL80
   ```

### 问题 2: 密码错误

**错误：** `Access denied for user 'root'`

**解决方案：**
1. 打开MySQL Command Line Client
2. 设置密码或重置密码
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
   FLUSH PRIVILEGES;
   ```
3. 更新 `.env` 文件中的密码

### 问题 3: 数据库不存在

运行初始化脚本：

```powershell
node database/init-mysql.js
```

---

## 🔄 回滚到SQLite

如果需要回滚到SQLite：

1. 更新 `backend/package.json`，将 `mysql2` 改为 `sql.js`
2. 使用SQLite的配置文件和控制器
3. 重启服务

---

## 🎉 完成

迁移完成后，你应该：

1. ✅ MySQL数据库已创建
2. ✅ 所有表已创建
3. ✅ 数据已迁移（如有）
4. ✅ 服务已启动
5. ✅ GM后台可访问

访问 http://localhost:3001 开始使用！

---

**有任何问题请随时告诉我！** 🚀
