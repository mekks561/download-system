const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/mysql');
require('dotenv').config();

const register = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名、邮箱和密码都是必填项'
    });
  }

  try {
    const pool = await getPool();
    
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    const token = jwt.sign(
      { userId, username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: { id: userId, username, email }
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败'
    });
  }
};

const login = async (req, res) => {
  const { username, email, password } = req.body;

  if (!password || (!username && !email)) {
    return res.status(400).json({
      success: false,
      message: '用户名/邮箱和密码都是必填项'
    });
  }

  try {
    const pool = await getPool();
    
    const [users] = email 
      ? await pool.execute('SELECT id, username, email, password FROM users WHERE email = ?', [email])
      : await pool.execute('SELECT id, username, email, password FROM users WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
};

const getProfile = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    
    const [users] = await pool.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

const updateProfile = async (req, res) => {
  const { userId } = req.user;
  const { username, email, phone } = req.body;

  if (!username && !email && !phone) {
    return res.status(400).json({
      success: false,
      message: '至少需要提供一个更新字段'
    });
  }

  try {
    const pool = await getPool();
    
    const fields = [];
    const values = [];
    
    if (username) {
      fields.push('username = ?');
      values.push(username);
    }
    if (email) {
      fields.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      values.push(phone);
    }
    
    values.push(userId);

    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [users] = await pool.execute(
      'SELECT id, username, email, phone, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '更新成功',
      data: users[0]
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
};

const changePassword = async (req, res) => {
  const { userId } = req.user;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: '旧密码和新密码都是必填项'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: '新密码至少需要6个字符'
    });
  }

  try {
    const pool = await getPool();
    
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, users[0].password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '旧密码不正确'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
};

const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
};

const deleteAccount = async (req, res) => {
  const { userId } = req.user;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: '请输入密码以确认注销'
    });
  }

  try {
    const pool = await getPool();
    
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const isMatch = await bcrypt.compare(password, users[0].password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '密码不正确'
      });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: '账户已注销'
    });
  } catch (error) {
    console.error('注销账户错误:', error);
    res.status(500).json({
      success: false,
      message: '注销失败'
    });
  }
};

const send2FACode = async (req, res) => {
  const { userId } = req.user;
  const { phone } = req.body;

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: '请输入有效的手机号'
    });
  }

  try {
    const pool = await getPool();
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const hashedCode = await bcrypt.hash(code, 8);
    
    await pool.execute(
      'UPDATE users SET two_factor_secret = ?, two_factor_expires_at = ?, two_factor_phone = ? WHERE id = ?',
      [hashedCode, expiresAt, phone, userId]
    );

    res.json({
      success: true,
      message: '验证码已发送'
    });
  } catch (error) {
    console.error('发送验证码错误:', error);
    res.status(500).json({
      success: false,
      message: '发送验证码失败'
    });
  }
};

const verify2FACode = async (req, res) => {
  const { userId } = req.user;
  const { phone, code } = req.body;

  if (!code || !/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: '请输入6位数字验证码'
    });
  }

  try {
    const pool = await getPool();
    
    const [users] = await pool.execute(
      'SELECT two_factor_secret, two_factor_expires_at, two_factor_phone FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    if (new Date(user.two_factor_expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: '验证码已过期'
      });
    }

    const isMatch = await bcrypt.compare(code, user.two_factor_secret);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '验证码错误'
      });
    }

    await pool.execute(
      'UPDATE users SET two_factor_enabled = 1, two_factor_secret = NULL, two_factor_expires_at = NULL WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '两步验证已启用'
    });
  } catch (error) {
    console.error('验证验证码错误:', error);
    res.status(500).json({
      success: false,
      message: '验证失败'
    });
  }
};

const disable2FA = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    
    await pool.execute(
      'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL, two_factor_phone = NULL WHERE id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: '两步验证已关闭'
    });
  } catch (error) {
    console.error('关闭两步验证错误:', error);
    res.status(500).json({
      success: false,
      message: '关闭失败'
    });
  }
};

module.exports = { 
  register, 
  login, 
  getProfile,
  updateProfile,
  changePassword,
  logout,
  deleteAccount,
  send2FACode,
  verify2FACode,
  disable2FA
};
