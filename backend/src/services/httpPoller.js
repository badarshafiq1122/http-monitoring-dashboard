const axios = require("axios");
const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");
const responseRepository = require("./responseRepository");
const anomalyDetector = require("./anomalyDetector");
const rollingStatsService = require("./rollingStatsService");
const sseManager = require("./sseManager");
const logger = require("../utils/logger");

let scheduledTask = null;
let statsUpdateTask = null;
let isPolling = false;

// Generate a random JSON payload for the request
function generateRandomPayload() {
  return {
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
    randomNumber: Math.floor(Math.random() * 10000),
    randomString: Math.random().toString(36).substring(2, 15),
    metadata: {
      source: "bizscout-monitor",
      version: "1.0.0",
    },
  };
}

// Execute a single poll to the target endpoint
async function executePoll() {
  if (isPolling) {
    logger.warn("Previous poll still in progress, skipping");
    return null;
  }

  isPolling = true;
  const startTime = Date.now();
  const requestPayload = generateRandomPayload();

  let response = null;
  let statusCode = 0;
  let responsePayload = null;
  let responseTimeMs = 0;

  try {
    logger.info("Executing poll", {
      targetUrl: config.polling.targetUrl,
      requestId: requestPayload.requestId,
    });

    response = await axios.post(config.polling.targetUrl, requestPayload, {
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestPayload.requestId,
      },
    });

    responseTimeMs = Date.now() - startTime;
    statusCode = response.status;
    responsePayload = response.data;

    logger.info("Poll successful", {
      statusCode,
      responseTimeMs,
      requestId: requestPayload.requestId,
    });
  } catch (error) {
    responseTimeMs = Date.now() - startTime;

    if (error.response) {
      // Server responded with error status
      statusCode = error.response.status;
      responsePayload = error.response.data;
    } else if (error.code === "ECONNABORTED") {
      // Timeout
      statusCode = 408;
      responsePayload = { error: "Request timeout" };
    } else {
      // Network error
      statusCode = 0;
      responsePayload = { error: error.message };
    }

    logger.error("Poll failed", {
      statusCode,
      responseTimeMs,
      error: error.message,
      requestId: requestPayload.requestId,
    });
  } finally {
    isPolling = false;
  }

  // Persist to database
  const savedResponse = await responseRepository.saveResponse({
    requestPayload,
    targetUrl: config.polling.targetUrl,
    responsePayload,
    statusCode,
    responseTimeMs,
  });

  // Run anomaly detection
  const anomalyResult = await anomalyDetector.analyzeResponse(savedResponse);

  // Broadcast to connected clients
  const broadcastData = {
    ...savedResponse,
    anomaly: anomalyResult,
  };
  sseManager.broadcast("new-response", broadcastData);

  if (anomalyResult?.is_anomaly) {
    sseManager.broadcast("anomaly-detected", anomalyResult);
  }

  return savedResponse;
}

// Start the polling scheduler
function startPolling() {
  if (scheduledTask) {
    logger.warn("Polling already started");
    return;
  }

  const intervalMinutes = config.polling.intervalMinutes;
  const cronExpression = `*/${intervalMinutes} * * * *`;

  logger.info("Starting HTTP poller", {
    intervalMinutes,
    targetUrl: config.polling.targetUrl,
    cronExpression,
  });

  // Execute immediately on start
  executePoll().catch((err) => {
    logger.error("Initial poll failed", { error: err.message });
  });

  // Schedule recurring polls
  scheduledTask = cron.schedule(cronExpression, () => {
    executePoll().catch((err) => {
      logger.error("Scheduled poll failed", { error: err.message });
    });
  });

  // Start rolling stats cache updater (every 5 minutes)
  startStatsUpdater();

  logger.info("HTTP poller started successfully");
}

// Start the rolling stats cache updater (runs every 5 minutes)
function startStatsUpdater() {
  if (statsUpdateTask) {
    return;
  }

  logger.info("Starting rolling stats cache updater");

  // Compute initial stats
  rollingStatsService
    .computeAndStoreStats(config.anomaly.windowHours)
    .catch((err) => {
      logger.error("Initial stats computation failed", { error: err.message });
    });

  // Schedule recurring updates every 5 minutes
  statsUpdateTask = cron.schedule("*/5 * * * *", async () => {
    try {
      await rollingStatsService.computeAndStoreStats(
        config.anomaly.windowHours
      );
      await rollingStatsService.cleanupOldStats();
    } catch (err) {
      logger.error("Stats update failed", { error: err.message });
    }
  });

  logger.info("Rolling stats updater started");
}

// Stop the polling scheduler
function stopPolling() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info("HTTP poller stopped");
  }

  if (statsUpdateTask) {
    statsUpdateTask.stop();
    statsUpdateTask = null;
    logger.info("Stats updater stopped");
  }
}

// Manually trigger a poll (for testing purposes)
async function triggerManualPoll() {
  logger.info("Manual poll triggered");
  return executePoll();
}

// Get poller status
function getPollerStatus() {
  return {
    isRunning: scheduledTask !== null,
    isPolling,
    intervalMinutes: config.polling.intervalMinutes,
    targetUrl: config.polling.targetUrl,
  };
}

module.exports = {
  startPolling,
  stopPolling,
  triggerManualPoll,
  getPollerStatus,
  executePoll,
  generateRandomPayload,
};
