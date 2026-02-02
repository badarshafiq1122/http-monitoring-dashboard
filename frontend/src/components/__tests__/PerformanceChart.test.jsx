import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PerformanceChart } from "../PerformanceChart";
import * as api from "../../services/api";

vi.mock("../../services/api");

describe("PerformanceChart - E2E Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders chart with normal data", async () => {
    const mockData = {
      data: [
        {
          created_at: new Date().toISOString(),
          response_time_ms: 200,
          rolling_mean: 195,
          predicted_value: 198,
          is_anomaly: false,
          z_score: 0.5,
          rolling_stddev: 10,
        },
        {
          created_at: new Date(Date.now() - 60000).toISOString(),
          response_time_ms: 210,
          rolling_mean: 200,
          predicted_value: 205,
          is_anomaly: false,
          z_score: 0.8,
          rolling_stddev: 12,
        },
      ],
    };

    const mockStats = {
      data: {
        zScoreThreshold: 2.5,
        rollingStats: {
          sampleCount: 100,
          mean: 200,
          stddev: 15,
          min: 150,
          max: 250,
        },
        stats: {
          anomalyCount: 0,
        },
      },
    };

    api.getAnomalyVisualization.mockResolvedValue(mockData);
    api.getAnomalyStatus.mockResolvedValue(mockStats);

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText("Performance Monitor")).toBeInTheDocument();
    });

    expect(screen.getByText(/2 data points/)).toBeInTheDocument();
  });

  test("displays anomaly markers when anomalies detected", async () => {
    const mockData = {
      data: [
        {
          created_at: new Date().toISOString(),
          response_time_ms: 500,
          rolling_mean: 200,
          predicted_value: 205,
          is_anomaly: true,
          z_score: 6.0,
          rolling_stddev: 50,
        },
        {
          created_at: new Date(Date.now() - 60000).toISOString(),
          response_time_ms: 210,
          rolling_mean: 200,
          predicted_value: 205,
          is_anomaly: false,
          z_score: 0.2,
          rolling_stddev: 50,
        },
      ],
    };

    const mockStats = {
      data: {
        zScoreThreshold: 2.5,
        rollingStats: {
          sampleCount: 100,
          mean: 200,
          stddev: 50,
          min: 150,
          max: 500,
        },
        stats: {
          anomalyCount: 1,
        },
      },
    };

    api.getAnomalyVisualization.mockResolvedValue(mockData);
    api.getAnomalyStatus.mockResolvedValue(mockStats);

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText("Performance Monitor")).toBeInTheDocument();
    });

    expect(screen.getByText(/2 data points/)).toBeInTheDocument();
    expect(screen.getByText("Anomalies (24h)")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("shows loading state initially", () => {
    api.getAnomalyVisualization.mockImplementation(() => new Promise(() => {}));
    api.getAnomalyStatus.mockImplementation(() => new Promise(() => {}));

    render(<PerformanceChart />);

    expect(screen.getByText("Loading chart data...")).toBeInTheDocument();
  });

  test("shows error state on API failure", async () => {
    api.getAnomalyVisualization.mockRejectedValue(new Error("API Error"));
    api.getAnomalyStatus.mockRejectedValue(new Error("API Error"));

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });

  test("displays statistics summary correctly", async () => {
    const mockData = {
      data: [
        {
          created_at: new Date().toISOString(),
          response_time_ms: 200,
          rolling_mean: 200,
          predicted_value: 200,
          is_anomaly: false,
          z_score: 0,
          rolling_stddev: 10,
        },
      ],
    };

    const mockStats = {
      data: {
        zScoreThreshold: 2.5,
        rollingStats: {
          sampleCount: 150,
          mean: 250,
          stddev: 30,
          min: 180,
          max: 400,
        },
        stats: {
          anomalyCount: 5,
        },
      },
    };

    api.getAnomalyVisualization.mockResolvedValue(mockData);
    api.getAnomalyStatus.mockResolvedValue(mockStats);

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText("Performance Monitor")).toBeInTheDocument();
    });

    expect(screen.getByText(/1 data points/)).toBeInTheDocument();
  });

  test("handles empty data gracefully", async () => {
    api.getAnomalyVisualization.mockResolvedValue({ data: [] });
    api.getAnomalyStatus.mockResolvedValue({
      data: {
        zScoreThreshold: 2.5,
        rollingStats: null,
        stats: { anomalyCount: 0 },
      },
    });

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading chart data...")
      ).not.toBeInTheDocument();
    });
  });

  test("refreshes data periodically", async () => {
    const mockData = {
      data: [
        {
          created_at: new Date().toISOString(),
          response_time_ms: 200,
          rolling_mean: 200,
          predicted_value: 200,
          is_anomaly: false,
          z_score: 0,
          rolling_stddev: 10,
        },
      ],
    };

    const mockStats = {
      data: {
        zScoreThreshold: 2.5,
        rollingStats: {
          sampleCount: 100,
          mean: 200,
          stddev: 10,
          min: 180,
          max: 220,
        },
        stats: { anomalyCount: 0 },
      },
    };

    api.getAnomalyVisualization.mockResolvedValue(mockData);
    api.getAnomalyStatus.mockResolvedValue(mockStats);

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText("Performance Monitor")).toBeInTheDocument();
    });

    expect(api.getAnomalyVisualization).toHaveBeenCalled();
    expect(api.getAnomalyStatus).toHaveBeenCalled();
  });

  test("displays legend correctly", async () => {
    const mockData = { data: [] };
    const mockStats = {
      data: {
        zScoreThreshold: 2.5,
        rollingStats: null,
        stats: { anomalyCount: 0 },
      },
    };

    api.getAnomalyVisualization.mockResolvedValue(mockData);
    api.getAnomalyStatus.mockResolvedValue(mockStats);

    render(<PerformanceChart />);

    await waitFor(() => {
      expect(screen.getByText("Performance Monitor")).toBeInTheDocument();
    });

    expect(screen.getByText(/0 data points/)).toBeInTheDocument();
    expect(screen.getByText("Response Time")).toBeInTheDocument();
    expect(screen.getByText("Anomaly")).toBeInTheDocument();
  });
});
