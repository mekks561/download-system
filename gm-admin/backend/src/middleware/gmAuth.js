const jwt = require('jsonwebtoken');
const { getPool } = require('../config/mysql');

const gmAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供有效的认证令牌'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.GM_JWT_SECRET || 'gm-secret-key-change-in-production');

    const pool = await getPool();
    const [gmUsers] = await pool.execute(
      'SELECT id, username, email, role FROM gm_users WHERE id = ? AND is_active = 1',
      [decoded.gmUserId]
    );

    if (gmUsers.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'GM用户不存在或已被禁用'
      });
    }

    req.gmUser = gmUsers[0];
    next();
  } catch (error) {
    console.error('GM认证失败:', error);
    return res.status(401).json({
      success: false,
      message: '认证令牌无效或已过期'
    });
  }
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.gmUser) {
      return res.status(401).json({
        success: false,
        message: '未进行GM认证'
      });
    }

    const roleHierarchy = ['viewer', 'moderator', 'admin', 'super_admin'];
    const userRoleIndex = roleHierarchy.indexOf(req.gmUser.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    if (userRoleIndex < requiredRoleIndex) {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要更高的管理员权限'
      });
    }

    next();
  };
};

module.exports = { gmAuth, requireRole };
