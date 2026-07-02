/**
 * Simple logger for development
 * Uses console.log with colored output
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

const logger = {
  error: (message) => {
    console.log(`${colors.red}[ERROR]${colors.reset} ${getTimestamp()} - ${message}`);
  },
  warn: (message) => {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${getTimestamp()} - ${message}`);
  },
  info: (message) => {
    console.log(`${colors.green}[INFO]${colors.reset} ${getTimestamp()} - ${message}`);
  },
  http: (message) => {
    console.log(`${colors.cyan}[HTTP]${colors.reset} ${getTimestamp()} - ${message}`);
  },
  debug: (message) => {
    console.log(`${colors.magenta}[DEBUG]${colors.reset} ${getTimestamp()} - ${message}`);
  },
};

// Create a stream object for HTTP logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;