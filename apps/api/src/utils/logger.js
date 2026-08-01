const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor() {
    this.logDir = LOG_DIR;
    this.currentLevel = levels[LOG_LEVEL] || levels.info;
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`;
  }

  writeToFile(filename, content) {
    const filepath = path.join(this.logDir, filename);
    fs.appendFileSync(filepath, content + '\n');
  }

  shouldLog(level) {
    return levels[level] <= this.currentLevel;
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, meta);
      console.error(formatted);
      this.writeToFile('error.log', formatted);
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, meta);
      console.warn(formatted);
      this.writeToFile('warn.log', formatted);
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, meta);
      console.log(formatted);
      this.writeToFile('info.log', formatted);
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, meta);
      console.debug(formatted);
      this.writeToFile('debug.log', formatted);
    }
  }

  logRequest(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this[level](`${req.method} ${req.originalUrl}`, meta);
  }

  logError(error, context = {}) {
    const meta = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context
    };
    this.error('Error occurred', meta);
  }
}

const logger = new Logger();

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

const errorLogger = (err, req, res, next) => {
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    body: req.body
  });
  next(err);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger
};
