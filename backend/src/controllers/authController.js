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

module.exports = { register, login, getProfile };
