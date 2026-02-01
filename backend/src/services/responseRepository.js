const { query, withTransaction } = require("../db/pool");
const logger = require("../utils/logger");

// Save a new response record
async function saveResponse(responseData) {
  const {
    requestPayload,
    targetUrl,
    responsePayload,
    statusCode,
    responseTimeMs,
  } = responseData;

  const result = await query(
    `INSERT INTO responses (request_payload, target_url, response_payload, status_code, response_time_ms)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      JSON.stringify(requestPayload),
      targetUrl,
      responsePayload ? JSON.stringify(responsePayload) : null,
      statusCode,
      responseTimeMs,
    ]
  );

  logger.debug("Response saved", { id: result.rows[0].id });
  return result.rows[0];
}

// Get paginated responses with optional filters
async function getResponses({
  page = 1,
  limit = 20,
  statusCode,
  startDate,
  endDate,
} = {}) {
  const offset = (page - 1) * limit;
  const conditions = ["deleted_at IS NULL"];
  const params = [];
  let paramIndex = 1;

  if (statusCode) {
    conditions.push(`status_code = $${paramIndex++}`);
    params.push(statusCode);
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(endDate);
  }

  const whereClause = conditions.join(" AND ");

  // Get total count for pagination
  const countResult = await query(
    `SELECT COUNT(*) FROM responses WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated data
  params.push(limit, offset);
  const dataResult = await query(
    `SELECT * FROM responses 
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Get recent responses (last N)
async function getRecentResponses(count = 10) {
  const result = await query(
    `SELECT * FROM responses 
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $1`,
    [count]
  );
  return result.rows;
}

// Get response by ID
async function getResponseById(id) {
  const result = await query(
    `SELECT * FROM responses WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

// Get responses within a time window (for anomaly detection)
async function getResponsesInWindow(windowHours) {
  const result = await query(
    `SELECT id, response_time_ms, created_at 
     FROM responses 
     WHERE deleted_at IS NULL
       AND created_at >= NOW() - INTERVAL '${windowHours} hours'
     ORDER BY created_at ASC`,
    []
  );
  return result.rows;
}

// Get rolling statistics - delegates to rollingStatsService for caching (O(1) lookup)
async function getRollingStats(windowHours) {
  // Use the caching service
  const rollingStatsService = require("./rollingStatsService");
  return rollingStatsService.getRollingStats(windowHours);
}

// Get response time trend for visualization
async function getResponseTimeTrend(hours = 24, bucketMinutes = 15) {
  const result = await query(
    `SELECT 
       date_trunc('hour', created_at) + 
         INTERVAL '${bucketMinutes} min' * FLOOR(EXTRACT(minute FROM created_at) / ${bucketMinutes}) as bucket,
       AVG(response_time_ms) as avg_response_time,
       COUNT(*) as count
     FROM responses 
     WHERE deleted_at IS NULL
       AND created_at >= NOW() - INTERVAL '${hours} hours'
     GROUP BY bucket
     ORDER BY bucket ASC`,
    []
  );
  return result.rows;
}

module.exports = {
  saveResponse,
  getResponses,
  getRecentResponses,
  getResponseById,
  getResponsesInWindow,
  getRollingStats,
  getResponseTimeTrend,
};
