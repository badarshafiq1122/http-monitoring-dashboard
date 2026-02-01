const express = require("express");
const responseRepository = require("../services/responseRepository");
const { asyncHandler, ApiError } = require("../middleware/errorHandler");

const router = express.Router();

// GET /api/responses - Fetch paginated historical responses (query: page, limit, statusCode, startDate, endDate)
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20)
    );
    const statusCode = req.query.statusCode
      ? parseInt(req.query.statusCode, 10)
      : null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const result = await responseRepository.getResponses({
      page,
      limit,
      statusCode,
      startDate,
      endDate,
    });

    res.json(result);
  })
);

// GET /api/responses/recent - Fetch most recent responses (query: count)
router.get(
  "/recent",
  asyncHandler(async (req, res) => {
    const count = Math.min(
      50,
      Math.max(1, parseInt(req.query.count, 10) || 10)
    );
    const responses = await responseRepository.getRecentResponses(count);
    res.json({ data: responses });
  })
);

// GET /api/responses/trend - Fetch response time trend data for charts (query: hours, bucket)
router.get(
  "/trend",
  asyncHandler(async (req, res) => {
    const hours = Math.min(
      168,
      Math.max(1, parseInt(req.query.hours, 10) || 24)
    );
    const bucket = Math.min(
      60,
      Math.max(5, parseInt(req.query.bucket, 10) || 15)
    );

    const trend = await responseRepository.getResponseTimeTrend(hours, bucket);
    res.json({ data: trend });
  })
);

// GET /api/responses/:id - Fetch a specific response by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Basic UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ApiError(400, "Invalid response ID format");
    }

    const response = await responseRepository.getResponseById(id);

    if (!response) {
      throw new ApiError(404, "Response not found");
    }

    res.json({ data: response });
  })
);

module.exports = router;
