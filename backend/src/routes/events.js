const express = require("express");
const sseManager = require("../services/sseManager");

const router = express.Router();

// GET /api/events - SSE endpoint for real-time updates (new-response, anomaly-detected)
router.get("/", (req, res) => {
  sseManager.addClient(res);
  req.on("close", () => {});
});

module.exports = router;
