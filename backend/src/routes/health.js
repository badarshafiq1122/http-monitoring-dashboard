const express = require("express");
const { getPool } = require("../db/pool");
const httpPoller = require("../services/httpPoller");
const sseManager = require("../services/sseManager");

const router = express.Router();

// GET /api/health - Basic health check
router.get("/", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  res.json(health);
});

// GET /api/health/detailed - Detailed health check including dependencies
router.get("/detailed", async (req, res) => {
  const checks = {
    database: { status: "unknown" },
    poller: { status: "unknown" },
    sse: { status: "unknown" },
  };

  // Check database
  try {
    const pool = getPool();
    const result = await pool.query("SELECT 1 as ok");
    checks.database = {
      status: result.rows[0]?.ok === 1 ? "healthy" : "unhealthy",
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      error: error.message,
    };
  }

  // Check poller
  const pollerStatus = httpPoller.getPollerStatus();
  checks.poller = {
    status: pollerStatus.isRunning ? "healthy" : "stopped",
    ...pollerStatus,
  };

  // Check SSE
  checks.sse = {
    status: "healthy",
    connectedClients: sseManager.getClientCount(),
  };

  // Overall status
  const isHealthy = Object.values(checks).every(
    (c) => c.status === "healthy" || c.status === "stopped"
  );

  const health = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  res.status(isHealthy ? 200 : 503).json(health);
});

module.exports = router;
