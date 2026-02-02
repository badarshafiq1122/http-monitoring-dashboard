require("dotenv").config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",

  //database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || "bizscout",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },

  // Polling
  polling: {
    intervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES, 10) || 5,
    targetUrl: process.env.TARGET_URL || "https://httpbin.org/anything",
  },

  // Anomaly Detection
  anomaly: {
    windowHours: parseInt(process.env.ANOMALY_WINDOW_HOURS, 10) || 24,
    zScoreThreshold: parseFloat(process.env.ANOMALY_Z_SCORE_THRESHOLD) || 2.5,
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
};

// Validation
const requiredInProduction = ["DATABASE_URL"];
if (config.nodeEnv === "production") {
  for (const key of requiredInProduction) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = config;
