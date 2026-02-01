const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const { getPool, closePool } = require("./db/pool");
const { migrate } = require("./db/migrate");
const httpPoller = require("./services/httpPoller");
const sseManager = require("./services/sseManager");

let server;

async function startServer() {
  try {
    // Test database connection
    logger.info("Connecting to database...");
    const pool = getPool();
    await pool.query("SELECT 1");
    logger.info("Database connected successfully");

    // Run migrations
    logger.info("Running database migrations...");
    await migrate();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`, {
        environment: config.nodeEnv,
        port: config.port,
      });
    });

    // Start the HTTP poller
    httpPoller.startPolling();

    // Graceful shutdown handling
    setupGracefulShutdown();
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
}

function setupGracefulShutdown() {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info("HTTP server closed");
      });
    }

    // Stop poller
    httpPoller.stopPolling();

    // Close SSE connections
    sseManager.closeAll();

    // Close database pool
    await closePool();

    logger.info("Graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
    shutdown("unhandledRejection");
  });
}

startServer();
