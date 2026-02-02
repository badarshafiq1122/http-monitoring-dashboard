const {
  calculateZScore,
  predictNextValue,
  analyzeResponse,
} = require("../anomalyDetector");
const responseRepository = require("../responseRepository");
const anomalyRepository = require("../anomalyRepository");
const config = require("../../config");

jest.mock("../responseRepository");
jest.mock("../anomalyRepository");

describe("Anomaly Detector - Unit Tests", () => {
  describe("calculateZScore", () => {
    test("calculates correct z-score for normal case", () => {
      const zScore = calculateZScore(300, 200, 50);
      expect(zScore).toBe(2.0);
    });

    test("calculates negative z-score for below-mean values", () => {
      const zScore = calculateZScore(150, 200, 50);
      expect(zScore).toBe(-1.0);
    });

    test("returns 0 when stddev is 0", () => {
      const zScore = calculateZScore(200, 200, 0);
      expect(zScore).toBe(0);
    });

    test("returns 0 when stddev is NaN", () => {
      const zScore = calculateZScore(200, 200, NaN);
      expect(zScore).toBe(0);
    });

    test("handles extreme values correctly", () => {
      const zScore = calculateZScore(500, 200, 50);
      expect(zScore).toBe(6.0);
    });
  });

  describe("predictNextValue", () => {
    test("calculates EMA with default alpha", () => {
      const values = [100, 110, 120, 130, 140];
      const predicted = predictNextValue(values);
      expect(predicted).toBeGreaterThan(100);
      expect(predicted).toBeLessThan(140);
    });

    test("handles single value", () => {
      const predicted = predictNextValue([100]);
      expect(predicted).toBe(100);
    });

    test("returns null for empty array", () => {
      const predicted = predictNextValue([]);
      expect(predicted).toBeNull();
    });

    test("returns null for null input", () => {
      const predicted = predictNextValue(null);
      expect(predicted).toBeNull();
    });

    test("uses custom alpha parameter", () => {
      const values = [100, 200];
      const predicted1 = predictNextValue(values, 0.1);
      const predicted2 = predictNextValue(values, 0.9);
      expect(predicted1).not.toBe(predicted2);
    });
  });

  describe("analyzeResponse", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("detects anomaly when z-score exceeds threshold", async () => {
      const response = { id: 1, response_time_ms: 500 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 10,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 190 },
        { response_time_ms: 200 },
        { response_time_ms: 210 },
      ]);

      anomalyRepository.saveAnomaly.mockResolvedValue({
        id: 1,
        is_anomaly: true,
      });

      const result = await analyzeResponse(response);

      expect(result.is_anomaly).toBe(true);
      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          responseId: 1,
          isAnomaly: true,
          anomalyType: "severe_high",
        })
      );
    });

    test("does not detect anomaly when z-score is within threshold", async () => {
      const response = { id: 2, response_time_ms: 220 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 10,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 190 },
        { response_time_ms: 200 },
        { response_time_ms: 210 },
      ]);

      anomalyRepository.saveAnomaly.mockResolvedValue({
        id: 2,
        is_anomaly: false,
      });

      const result = await analyzeResponse(response);

      expect(result.is_anomaly).toBe(false);
      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          responseId: 2,
          isAnomaly: false,
          anomalyType: null,
        })
      );
    });

    test("handles insufficient samples gracefully", async () => {
      const response = { id: 3, response_time_ms: 300 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 3,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 200 },
        { response_time_ms: 210 },
      ]);

      anomalyRepository.saveAnomaly.mockResolvedValue({
        id: 3,
        is_anomaly: false,
      });

      const result = await analyzeResponse(response);

      expect(result.is_anomaly).toBe(false);
      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          zScore: 0,
          isAnomaly: false,
        })
      );
    });

    test("classifies severe_high anomalies correctly", async () => {
      const response = { id: 4, response_time_ms: 600 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 10,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 200 },
      ]);

      anomalyRepository.saveAnomaly.mockResolvedValue({
        id: 4,
        is_anomaly: true,
      });

      await analyzeResponse(response);

      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          anomalyType: "severe_high",
        })
      );
    });

    test("classifies high anomalies correctly", async () => {
      const response = { id: 5, response_time_ms: 350 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 10,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 200 },
      ]);

      anomalyRepository.saveAnomaly.mockResolvedValue({
        id: 5,
        is_anomaly: true,
      });

      await analyzeResponse(response);

      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          anomalyType: "high",
        })
      );
    });

    test("classifies low anomalies correctly", async () => {
      const response = { id: 6, response_time_ms: 50 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 10,
        mean: 200,
        stddev: 50,
      });

      responseRepository.getResponsesInWindow.mockResolvedValue([
        { response_time_ms: 200 },
      ]);

      anomalyRepository.saveAnomaly.mockResolvedValue({
        id: 6,
        is_anomaly: true,
      });

      await analyzeResponse(response);

      expect(anomalyRepository.saveAnomaly).toHaveBeenCalledWith(
        expect.objectContaining({
          anomalyType: "low",
        })
      );
    });

    test("handles repository errors gracefully", async () => {
      const response = { id: 7, response_time_ms: 200 };

      responseRepository.getRollingStats.mockRejectedValue(
        new Error("DB error")
      );

      const result = await analyzeResponse(response);

      expect(result).toBeNull();
      expect(anomalyRepository.saveAnomaly).not.toHaveBeenCalled();
    });

    test("calculates predicted value using recent history", async () => {
      const response = { id: 8, response_time_ms: 250 };

      responseRepository.getRollingStats.mockResolvedValue({
        sampleCount: 10,
        mean: 200,
        stddev: 20,
      });

      const recentValues = [180, 190, 200, 210, 220];
      responseRepository.getResponsesInWindow.mockResolvedValue(
        recentValues.map((v) => ({ response_time_ms: v }))
      );

      anomalyRepository.saveAnomaly.mockResolvedValue({ id: 8 });

      await analyzeResponse(response);

      const savedData = anomalyRepository.saveAnomaly.mock.calls[0][0];
      expect(savedData.predictedValue).toBeGreaterThan(180);
      expect(savedData.predictedValue).toBeLessThan(220);
    });
  });
});
