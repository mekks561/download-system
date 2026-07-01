const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/mysql');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名和密码都是必填项'
    });
  }

  try {
    const pool = await getPool();
    const [gmUsers] = await pool.execute(
      'SELECT * FROM gm_users WHERE username = ? AND is_active = 1',
      [username]
    );

    if (gmUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const gmUser = gmUsers[0];
    const isMatch = await bcrypt.compare(password, gmUser.password);

    if (!isMatch) {
      await pool.execute(
        'UPDATE gm_users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?',
        [gmUser.id]
      );
      
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    if (gmUser.failed_login_attempts >= 5) {
      return res.status(403).json({
        success: false,
        message: '账户已被锁定，请联系超级管理员'
      });
    }

    await pool.execute(
      'UPDATE gm_users SET failed_login_attempts = 0, last_login_at = NOW() WHERE id = ?',
      [gmUser.id]
    );

    const token = jwt.sign(
      { gmUserId: gmUser.id, username: gmUser.username, role: gmUser.role },
      process.env.GM_JWT_SECRET || 'gm-secret-key-change-in-production',
      { expiresIn: process.env.GM_JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      message: 'GM登录成功',
      token,
      gmUser: {
        id: gmUser.id,
        username: gmUser.username,
        email: gmUser.email,
        role: gmUser.role,
        name: gmUser.name
      }
    });
  } catch (error) {
    console.error('GM登录错误:', error);
    res.status(500).json({
      success: false,
      message: 'GM登录失败'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const pool = await getPool();
    const [gmUsers] = await pool.execute(
      'SELECT id, username, email, role, name, created_at, last_login_at FROM gm_users WHERE id = ?',
      [req.gmUser.id]
    );

    if (gmUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'GM用户不存在'
      });
    }

    res.json({
      success: true,
      gmUser: gmUsers[0]
    });
  } catch (error) {
    console.error('获取GM用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取GM用户信息失败'
    });
  }
};

const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'GM登出成功'
  });
};

module.exports = { login, getProfile, logout };
