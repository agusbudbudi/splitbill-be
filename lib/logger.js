/**
 * Structured logging utility with sensitive data sanitization
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ||
  (process.env.NODE_ENV === "production" ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

const SENSITIVE_FIELDS = [
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "authorization",
  "cookie",
  "verificationToken",
];

/**
 * Sanitize sensitive data from objects
 */
function sanitizeData(data) {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Don't log very long strings (potential tokens/base64)
    if (data.length > 100) {
      return `[REDACTED: ${data.length} chars]`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  if (typeof data === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_FIELDS.some((field) =>
        lowerKey.includes(field.toLowerCase()),
      );

      if (isSensitive) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object") {
        sanitized[key] = sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Format log entry
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitizeData(meta);

  if (process.env.NODE_ENV === "production") {
    // JSON format for production (easier to parse by log aggregators)
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...sanitizedMeta,
    });
  } else {
    // Human-readable format for development
    const metaStr =
      Object.keys(sanitizedMeta).length > 0
        ? `\n${JSON.stringify(sanitizedMeta, null, 2)}`
        : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }
}

/**
 * Log debug message
 */
export function debug(message, meta = {}) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
    console.log(formatLog("DEBUG", message, meta));
  }
}

/**
 * Log info message
 */
export function info(message, meta = {}) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
    console.log(formatLog("INFO", message, meta));
  }
}

/**
 * Log warning message
 */
export function warn(message, meta = {}) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
    console.warn(formatLog("WARN", message, meta));
  }
}

/**
 * Log error message
 */
export function error(message, meta = {}) {
  if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
    console.error(formatLog("ERROR", message, meta));
  }
}

/**
 * Log security event (always logged)
 */
export function security(message, meta = {}) {
  console.warn(
    formatLog("SECURITY", message, {
      ...meta,
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Create logger with context
 */
export function createLogger(context = {}) {
  return {
    debug: (message, meta = {}) => debug(message, { ...context, ...meta }),
    info: (message, meta = {}) => info(message, { ...context, ...meta }),
    warn: (message, meta = {}) => warn(message, { ...context, ...meta }),
    error: (message, meta = {}) => error(message, { ...context, ...meta }),
    security: (message, meta = {}) =>
      security(message, { ...context, ...meta }),
  };
}

export default {
  debug,
  info,
  warn,
  error,
  security,
  createLogger,
};
