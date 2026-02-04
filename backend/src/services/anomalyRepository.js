const { query } = require("../db/pool");
const logger = require("../utils/logger");

// Save an anomaly record
async function saveAnomaly(anomalyData) {
  const {
    responseId,
    zScore,
    predictedValue,
    actualValue,
    rollingMean,
    rollingStddev,
    isAnomaly,
    anomalyType,
  } = anomalyData;

  const result = await query(
    `INSERT INTO anomalies 
     (response_id, z_score, predicted_value, actual_value, rolling_mean, rolling_stddev, is_anomaly, anomaly_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      responseId,
      zScore,
      predictedValue,
      actualValue,
      rollingMean,
      rollingStddev,
      isAnomaly,
      anomalyType,
    ]
  );

  logger.debug("Anomaly record saved", { id: result.rows[0].id, isAnomaly });
  return result.rows[0];
}

// Get recent anomalies
async function getRecentAnomalies(count = 50) {
  const result = await query(
    `SELECT a.*, r.response_time_ms, r.status_code, r.created_at as response_created_at
     FROM anomalies a
     JOIN responses r ON a.response_id = r.id
     WHERE a.is_anomaly = true
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [count]
  );
  return result.rows;
}

// Get anomaly data for visualization with confidence bands (mean plus/minus 2*stddev)
async function getAnomalyVisualizationData(hours = 24) {
  const result = await query(
    `SELECT 
       r.id,
       r.response_time_ms,
       r.created_at,
       a.z_score,
       a.predicted_value,
       a.rolling_mean,
       a.rolling_stddev,
       a.is_anomaly,
       a.anomaly_type
     FROM responses r
     LEFT JOIN anomalies a ON r.id = a.response_id
     WHERE r.deleted_at IS NULL
       AND r.created_at >= NOW() - INTERVAL '${hours} hours'
     ORDER BY r.created_at ASC`,
    []
  );
  return result.rows;
}

// Get anomaly statistics
async function getAnomalyStats(hours = 24) {
  const result = await query(
    `SELECT 
       COUNT(*) FILTER (WHERE is_anomaly = true) as anomaly_count,
       COUNT(*) as total_count,
       AVG(z_score) FILTER (WHERE is_anomaly = true) as avg_anomaly_zscore
     FROM anomalies
     WHERE created_at >= NOW() - INTERVAL '${hours} hours'`,
    []
  );

  const stats = result.rows[0];
  return {
    anomalyCount: parseInt(stats.anomaly_count, 10) || 0,
    totalCount: parseInt(stats.total_count, 10) || 0,
    avgAnomalyZScore: parseFloat(stats.avg_anomaly_zscore) || 0,
  };
}

module.exports = {
  saveAnomaly,
  getRecentAnomalies,
  getAnomalyVisualizationData,
  getAnomalyStats,
};
