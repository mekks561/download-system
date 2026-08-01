const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getPool } = require('../config/mysql');

const gmLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '请输入用户名和密码'
    });
  }

  try {
    const pool = await getPool();
    
    const [users] = await pool.execute(
      'SELECT id, username, password, role FROM users WHERE username = ? AND role IN ("admin", "super_admin")',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('GM登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
};

const gmGetProfile = async (req, res) => {
  const { userId } = req.user;

  try {
    const pool = await getPool();
    
    const [users] = await pool.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
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
      data: users[0]
    });
  } catch (error) {
    console.error('获取GM用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
};

module.exports = {
  gmLogin,
  gmGetProfile
};