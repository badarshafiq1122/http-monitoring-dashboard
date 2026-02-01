const config = require("../config");
const responseRepository = require("./responseRepository");
const anomalyRepository = require("./anomalyRepository");
const logger = require("../utils/logger");

// Calculate Z-score for a value given mean and standard deviation
function calculateZScore(value, mean, stddev) {
  if (stddev === 0 || isNaN(stddev)) {
    return 0; // Can't calculate Z-score without variance
  }
  return (value - mean) / stddev;
}

// Simple time-series prediction using exponential moving average
function predictNextValue(recentValues, alpha = 0.3) {
  if (!recentValues || recentValues.length === 0) {
    return null;
  }

  // Exponential moving average
  let ema = recentValues[0];
  for (let i = 1; i < recentValues.length; i++) {
    ema = alpha * recentValues[i] + (1 - alpha) * ema;
  }

  return ema;
}

// Analyze a response for anomalies and save record (always saves for visualization)
async function analyzeResponse(response) {
  const { id: responseId, response_time_ms: responseTime } = response;

  try {
    // Get rolling statistics from database
    const stats = await responseRepository.getRollingStats(
      config.anomaly.windowHours
    );

    // Get recent values for prediction (always needed for visualization)
    const recentResponses = await responseRepository.getResponsesInWindow(1); // Last hour
    const recentValues = recentResponses.map((r) => r.response_time_ms);

    // Calculate predicted value using EMA (or fallback to current value if no history)
    const predictedValue = predictNextValue(recentValues) || responseTime;

    // Need minimum samples for meaningful Z-score statistics
    const MIN_SAMPLES_FOR_ZSCORE = 5;
    const hasEnoughSamples = stats.sampleCount >= MIN_SAMPLES_FOR_ZSCORE;

    // Calculate Z-score (0 if not enough samples or no stddev)
    let zScore = 0;
    let isAnomaly = false;
    let anomalyType = null;

    if (hasEnoughSamples && stats.stddev > 0) {
      zScore = calculateZScore(responseTime, stats.mean, stats.stddev);
      isAnomaly = Math.abs(zScore) > config.anomaly.zScoreThreshold;

      // Determine anomaly type
      if (isAnomaly) {
        if (zScore > 0) {
          anomalyType = responseTime > stats.mean * 2 ? "severe_high" : "high";
        } else {
          anomalyType = "low"; // Unusually fast (might indicate caching or error)
        }
      }
    }

    // Use current stats for rolling mean, or calculate simple average if not enough samples
    const rollingMean = hasEnoughSamples
      ? stats.mean
      : recentValues.length > 0
      ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
      : responseTime;

    const rollingStddev = hasEnoughSamples ? stats.stddev : 0;

    // ALWAYS save anomaly record for visualization (even with insufficient samples)
    const anomalyData = {
      responseId,
      zScore: Math.round(zScore * 10000) / 10000,
      predictedValue: Math.round(predictedValue * 100) / 100,
      actualValue: responseTime,
      rollingMean: Math.round(rollingMean * 100) / 100,
      rollingStddev: Math.round(rollingStddev * 10000) / 10000,
      isAnomaly,
      anomalyType,
    };

    const savedAnomaly = await anomalyRepository.saveAnomaly(anomalyData);

    if (isAnomaly) {
      logger.warn("Anomaly detected", {
        responseId,
        responseTime,
        zScore: anomalyData.zScore,
        threshold: config.anomaly.zScoreThreshold,
        anomalyType,
      });
    } else {
      logger.debug("Response analyzed", {
        responseId,
        responseTime,
        rollingMean: anomalyData.rollingMean,
        predicted: anomalyData.predictedValue,
        sampleCount: stats.sampleCount,
      });
    }

    return savedAnomaly;
  } catch (error) {
    logger.error("Anomaly detection failed", {
      responseId,
      error: error.message,
    });
    return null;
  }
}

// Get current anomaly detection status and statistics
async function getAnomalyStatus() {
  const [stats, recentAnomalies, rollingStats] = await Promise.all([
    anomalyRepository.getAnomalyStats(config.anomaly.windowHours),
    anomalyRepository.getRecentAnomalies(5),
    responseRepository.getRollingStats(config.anomaly.windowHours),
  ]);

  return {
    windowHours: config.anomaly.windowHours,
    zScoreThreshold: config.anomaly.zScoreThreshold,
    stats,
    recentAnomalies,
    rollingStats,
  };
}

module.exports = {
  analyzeResponse,
  getAnomalyStatus,
  calculateZScore,
  predictNextValue,
};
