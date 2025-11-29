// Logger utility - only logs in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, log to error reporting service
      // Example: Sentry.captureException(...args);
      console.error('[Error]', args[0]); // Only log first argument in production
    }
  },
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

export default logger;

