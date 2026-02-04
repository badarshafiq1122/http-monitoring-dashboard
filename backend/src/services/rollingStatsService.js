const { query } = require("../db/pool");
const logger = require("../utils/logger");
const config = require("../config");

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Compute and store rolling statistics for a time window
async function computeAndStoreStats(windowHours = 24) {
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const windowEnd = new Date();

  logger.debug("Computing rolling stats", {
    windowHours,
    windowStart,
    windowEnd,
  });

  try {
    // Compute stats from responses table
    const statsResult = await query(
      `SELECT 
         COUNT(*) as sample_count,
         COALESCE(AVG(response_time_ms), 0) as mean,
         COALESCE(STDDEV_POP(response_time_ms), 0) as stddev,
         COALESCE(MIN(response_time_ms), 0) as min_value,
         COALESCE(MAX(response_time_ms), 0) as max_value,
         COALESCE(SUM(response_time_ms), 0) as sum_value,
         COALESCE(SUM(response_time_ms::bigint * response_time_ms::bigint), 0) as sum_squared,
         COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as success_count
       FROM responses 
       WHERE deleted_at IS NULL
         AND created_at >= $1
         AND created_at <= $2`,
      [windowStart, windowEnd]
    );

    const stats = statsResult.rows[0];
    const successRate =
      stats.sample_count > 0
        ? (parseFloat(stats.success_count) / parseFloat(stats.sample_count)) *
          100
        : 0;

    // Insert new cache entry
    // We don't update existing entries - just insert new ones
    // Old entries are cleaned up by cleanupOldStats()
    await query(
      `INSERT INTO rolling_stats (
         window_start, window_end, 
         mean_response_time, stddev_response_time,
         min_response_time, max_response_time,
         sample_count, sum_response_time, sum_squared
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        windowStart,
        windowEnd,
        parseFloat(stats.mean) || 0,
        parseFloat(stats.stddev) || 0,
        parseInt(stats.min_value, 10) || 0,
        parseInt(stats.max_value, 10) || 0,
        parseInt(stats.sample_count, 10) || 0,
        parseInt(stats.sum_value, 10) || 0,
        parseInt(stats.sum_squared, 10) || 0,
      ]
    );

    logger.info("Rolling stats updated", {
      windowHours,
      sampleCount: stats.sample_count,
      mean: parseFloat(stats.mean).toFixed(2),
      successRate: successRate.toFixed(1),
    });

    return {
      sampleCount: parseInt(stats.sample_count, 10) || 0,
      mean: parseFloat(stats.mean) || 0,
      stddev: parseFloat(stats.stddev) || 0,
      min: parseInt(stats.min_value, 10) || 0,
      max: parseInt(stats.max_value, 10) || 0,
      sum: parseInt(stats.sum_value, 10) || 0,
      sumSquared: parseInt(stats.sum_squared, 10) || 0,
      successRate: parseFloat(successRate.toFixed(1)),
      cached: false,
      computedAt: new Date(),
    };
  } catch (error) {
    logger.error("Failed to compute rolling stats", { error: error.message });
    throw error;
  }
}

// Get rolling statistics - uses cache if fresh, computes if stale
async function getRollingStats(windowHours = 24) {
  try {
    // Try to get from cache first
    const cacheResult = await query(
      `SELECT * FROM rolling_stats 
       WHERE created_at >= NOW() - INTERVAL '${CACHE_TTL_MS / 1000} seconds'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (cacheResult.rows.length > 0) {
      const cached = cacheResult.rows[0];
      // Calculate success rate from cached data by querying responses
      const successResult = await query(
        `SELECT COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as success_count,
                COUNT(*) as total_count
         FROM responses
         WHERE deleted_at IS NULL
           AND created_at >= $1
           AND created_at <= $2`,
        [cached.window_start, cached.window_end]
      );
      const successData = successResult.rows[0];
      const successRate =
        successData.total_count > 0
          ? (parseFloat(successData.success_count) /
              parseFloat(successData.total_count)) *
            100
          : 0;

      return {
        sampleCount: parseInt(cached.sample_count, 10) || 0,
        mean: parseFloat(cached.mean_response_time) || 0,
        stddev: parseFloat(cached.stddev_response_time) || 0,
        min: parseInt(cached.min_response_time, 10) || 0,
        max: parseInt(cached.max_response_time, 10) || 0,
        sum: parseInt(cached.sum_response_time, 10) || 0,
        sumSquared: parseInt(cached.sum_squared, 10) || 0,
        successRate: parseFloat(successRate.toFixed(1)),
        cached: true,
        cachedAt: cached.created_at,
      };
    }

    // Cache miss or stale - compute fresh stats
    logger.debug("Cache miss, computing fresh stats");
    return await computeAndStoreStats(windowHours);
  } catch (error) {
    logger.error("Failed to get rolling stats", { error: error.message });

    // Fallback to direct computation without caching
    return await computeDirectStats(windowHours);
  }
}

// Direct computation fallback (no caching)
async function computeDirectStats(windowHours) {
  const result = await query(
    `SELECT 
       COUNT(*) as sample_count,
       COALESCE(AVG(response_time_ms), 0) as mean,
       COALESCE(STDDEV_POP(response_time_ms), 0) as stddev,
       COALESCE(MIN(response_time_ms), 0) as min_value,
       COALESCE(MAX(response_time_ms), 0) as max_value,
       COALESCE(SUM(response_time_ms), 0) as sum_value,
       COALESCE(SUM(response_time_ms::bigint * response_time_ms::bigint), 0) as sum_squared,
       COUNT(*) FILTER (WHERE status_code >= 200 AND status_code < 300) as success_count
     FROM responses 
     WHERE deleted_at IS NULL
       AND created_at >= NOW() - INTERVAL '${windowHours} hours'`
  );

  const stats = result.rows[0];
  const successRate =
    stats.sample_count > 0
      ? (parseFloat(stats.success_count) / parseFloat(stats.sample_count)) * 100
      : 0;

  return {
    sampleCount: parseInt(stats.sample_count, 10) || 0,
    mean: parseFloat(stats.mean) || 0,
    stddev: parseFloat(stats.stddev) || 0,
    min: parseInt(stats.min_value, 10) || 0,
    max: parseInt(stats.max_value, 10) || 0,
    sum: parseInt(stats.sum_value, 10) || 0,
    sumSquared: parseInt(stats.sum_squared, 10) || 0,
    successRate: parseFloat(successRate.toFixed(1)),
    cached: false,
    computedAt: new Date(),
  };
}

// Cleanup old cache entries (keeps last 24 hours)
async function cleanupOldStats() {
  try {
    const result = await query(
      `DELETE FROM rolling_stats 
       WHERE created_at < NOW() - INTERVAL '24 hours'
       RETURNING id`
    );

    if (result.rowCount > 0) {
      logger.info("Cleaned up old rolling stats", { deleted: result.rowCount });
    }
  } catch (error) {
    logger.error("Failed to cleanup old stats", { error: error.message });
  }
}

// Get cache status for monitoring
async function getCacheStatus() {
  const result = await query(
    `SELECT 
       COUNT(*) as total_entries,
       MAX(created_at) as latest_entry,
       MIN(created_at) as oldest_entry
     FROM rolling_stats`
  );

  const status = result.rows[0];
  const latestAge = status.latest_entry
    ? Date.now() - new Date(status.latest_entry).getTime()
    : null;

  return {
    totalEntries: parseInt(status.total_entries, 10) || 0,
    latestEntry: status.latest_entry,
    oldestEntry: status.oldest_entry,
    latestAgeMs: latestAge,
    isFresh: latestAge !== null && latestAge < CACHE_TTL_MS,
    cacheTtlMs: CACHE_TTL_MS,
  };
}

module.exports = {
  computeAndStoreStats,
  getRollingStats,
  computeDirectStats,
  cleanupOldStats,
  getCacheStatus,
  CACHE_TTL_MS,
};
