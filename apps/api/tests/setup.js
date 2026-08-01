process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_PORT = '3306';
process.env.MYSQL_USER = 'root';
process.env.MYSQL_PASSWORD = '123456';
process.env.MYSQL_DATABASE = 'download_manager_test';

console.log('🧪 测试环境已初始化');