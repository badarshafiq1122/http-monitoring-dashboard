const request = require("supertest");
const app = require("../app");
const { analyzeResponse } = require("../services/anomalyDetector");

jest.mock("../db/pool");
jest.mock("../services/responseRepository");
jest.mock("../services/anomalyRepository");

const responseRepository = require("../services/responseRepository");
const anomalyRepository = require("../services/anomalyRepository");
const mockPool = require("../db/pool");

describe("Anomaly Detection Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    anomalyRepository.getAnomalyVisualizationData = jest.fn();
    anomalyRepository.getAnomalyStats = jest.fn();
    anomalyRepository.getRecentAnomalies = jest.fn();
    anomalyRepository.saveAnomaly = jest.fn();

    responseRepository.getRollingStats = jest.fn();
    responseRepository.getResponsesInWindow = jest.fn();
  });

  describe("GET /api/anomalies/visualization", () => {
    test("returns visualization data with anomaly markers", async () => {
      const mockData = [
        {
          id: 1,
          response_time_ms: 200,
          created_at: new Date(),
          z_score: 0.5,
          predicted_value: 195,
          rolling_mean: 200,
          rolling_stddev: 10,
          is_anomaly: false,
          anomaly_type: null,
        },
        {
          id: 2,
          response_time_ms: 500,
          created_at: new Date(),
          z_score: 6.0,
          predicted_value: 200,
          rolling_mean: 200,
          rolling_stddev: 50,
          is_anomaly: true,
          anomaly_type: "severe_high",
        },
      ];

      anomalyRepository.getAnomalyVisualizationData.mockResolvedValue(mockData);

      const res = await request(app)
        .get("/api/anomalies/visualization?hours=24")
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[1].is_anomaly).toBe(true);
    });

    test("handles different time windows", async () => {
      anomalyRepository.getAnomalyVisualizationData.mockResolvedValue([]);

      await request(app)
        .get("/api/anomalies/visualization?hours=1")
        .expect(200);

      expect(
        anomalyRepository.getAnomalyVisualizationData
      ).toHaveBeenCalledWith(1);
    });
  });

  describe("GET /api/anomalies/status", () => {
    test("returns anomaly statistics", async () => {
      const mockStats = {
        anomaly_count: 5,
        total_count: 100,
        avg_anomaly_zscore: 3.2,
      };

      const mockRollingStats = {
        sampleCount: 100,
        mean: 200,
        stddev: 25,
        min: 150,
        max: 300,
      };

      anomalyRepository.getAnomalyStats.mockResolvedValue(mockStats);
      anomalyRepository.getRecentAnomalies.mockResolvedValue([]);
      responseRepository.getRollingStats.mockResolvedValue(mockRollingStats);

      const res = await request(app).get("/api/anomalies/status").expect(200);

      expect(res.body.data).toHaveProperty("stats");
      expect(res.body.data).toHaveProperty("rollingStats");
      expect(res.body.data).toHaveProperty("zScoreThreshold");
      expect(res.body.data.zScoreThreshold).toBe(2.5);
    });

    test("includes recent anomalies", async () => {
      const mockRecentAnomalies = [
        { id: 1, response_id: 1, z_score: 3.5, is_anomaly: true },
        { id: 2, response_id: 2, z_score: 4.0, is_anomaly: true },
      ];

      anomalyRepository.getAnomalyStats.mockResolvedValue({
        anomaly_count: 2,
        total_count: 50,
      });
      anomalyRepository.getRecentAnomalies.mockResolvedValue(
        mockRecentAnomalies
      );
      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 50,
        mean: 200,
        stddev: 20,
      });

      const res = await request(app).get("/api/anomalies/status").expect(200);

      expect(res.body.data.recentAnomalies).toHaveLength(2);
    });
  });

  describe("Anomaly Detection Service Integration", () => {
    test("analyzes response and detects anomaly", async () => {
      const response = { id: 1, response_time_ms: 500 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 20,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 190 },
        { response_time_ms: 200 },
        { response_time_ms: 210 },
      ]);

      const mockAnomaly = {
        id: 1,
        response_id: 1,
        z_score: 6.0,
        is_anomaly: true,
        anomaly_type: "severe_high",
      };

      anomalyRepository.saveAnomaly.mockResolvedValue(mockAnomaly);

      const result = await analyzeResponse(response);

      expect(result).toBeTruthy();
      expect(result.is_anomaly).toBe(true);
      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          responseId: 1,
          isAnomaly: true,
        })
      );
    });

    test("analyzes normal response without anomaly", async () => {
      const response = { id: 2, response_time_ms: 210 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 20,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 190 },
        { response_time_ms: 200 },
        { response_time_ms: 210 },
      ]);

      const mockAnomaly = {
        id: 2,
        response_id: 2,
        z_score: 0.2,
        is_anomaly: false,
        anomaly_type: null,
      };

      anomalyRepository.saveAnomaly.mockResolvedValue(mockAnomaly);

      const result = await analyzeResponse(response);

      expect(result).toBeTruthy();
      expect(result.is_anomaly).toBe(false);
    });

    test("handles multiple anomaly types correctly", async () => {
      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 20,
        mean: 200,
        stddev: 40,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 200 },
      ]);

      const testCases = [
        { response_time_ms: 600, expectedType: "severe_high" },
        { response_time_ms: 350, expectedType: "high" },
        { response_time_ms: 50, expectedType: "low" },
      ];

      for (const testCase of testCases) {
        anomalyRepository.saveAnomaly.mockClear();
        anomalyRepository.saveAnomaly.mockResolvedValue({
          id: 1,
          is_anomaly: true,
        });

        await analyzeResponse({
          id: 1,
          response_time_ms: testCase.response_time_ms,
        });

        expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
          expect.objectContaining({
            anomalyType: testCase.expectedType,
          })
        );
      }
    });
  });
});
