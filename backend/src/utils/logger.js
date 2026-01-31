const winston = require("winston");
const config = require("../config");

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: "bizscout-api" },
  transports: [
    new winston.transports.Console({
      format:
        config.nodeEnv === "production"
          ? combine(timestamp(), json())
          : combine(timestamp(), colorize(), devFormat),
    }),
  ],
});

// Add file transport in production
if (config.nodeEnv === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp(), json()),
    })
  );
  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp(), json()),
    })
  );
}

module.exports = logger;
