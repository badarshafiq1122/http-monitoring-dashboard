const express = require("express");
const anomalyDetector = require("../services/anomalyDetector");
const anomalyRepository = require("../services/anomalyRepository");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// GET /api/anomalies/status - Get current anomaly detection status and statistics
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const status = await anomalyDetector.getAnomalyStatus();
    res.json({ data: status });
  })
);

// GET /api/anomalies/recent - Get recent anomalies (query: count)
router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const count = Math.min(
      100,
      Math.max(1, parseInt(req.query.count, 10) || 20)
    );
    const anomalies = await anomalyRepository.getRecentAnomalies(count);
    res.json({ data: anomalies });
  })
);

// GET /api/anomalies/visualization - Get anomaly visualization chart data (query: hours)
router.get(
  "/visualization",
  asyncHandler(async (req, res) => {
    const hours = Math.min(
      168,
      Math.max(1, parseInt(req.query.hours, 10) || 24)
    );
    const data = await anomalyRepository.getAnomalyVisualizationData(hours);
    res.json({ data });
  })
);

module.exports = router;
