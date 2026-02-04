import { useState, useEffect } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Scatter,
  Brush,
} from "recharts";
import { AlertTriangle, AlertCircle, BarChart3 } from "lucide-react";
import { getAnomalyVisualization, getAnomalyStatus } from "../services/api";
import { formatTimestamp } from "../utils/formatters";

export function PerformanceChart() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Don't show loading spinner on refresh, only on initial load
        if (data.length === 0) {
          setLoading(true);
        }

        const [vizData, statusData] = await Promise.all([
          getAnomalyVisualization(24),
          getAnomalyStatus(),
        ]);

        // Process data for chart - ensure all numeric values are properly parsed
        const chartData = (vizData.data || []).map((item) => ({
          timestamp: new Date(item.created_at).getTime(),
          responseTime: item.response_time_ms,
          rollingMean:
            item.rolling_mean !== null && item.rolling_mean !== undefined
              ? parseFloat(item.rolling_mean)
              : null,
          predicted:
            item.predicted_value !== null && item.predicted_value !== undefined
              ? parseFloat(item.predicted_value)
              : null,
          isAnomaly: item.is_anomaly === true,
          zScore:
            item.z_score !== null && item.z_score !== undefined
              ? parseFloat(item.z_score)
              : null,
          stddev:
            item.rolling_stddev !== null && item.rolling_stddev !== undefined
              ? parseFloat(item.rolling_stddev)
              : null,
        }));

        console.log(
          `[Chart] Fetched ${chartData.length} data points, ${
            chartData.filter((d) => d.isAnomaly).length
          } anomalies`
        );

        if (chartData.length > 0) {
          setData(chartData);
          setStats(statusData.data);
          setError(null);
        } else {
          console.warn("[Chart] No data received from API");
        }
      } catch (err) {
        console.error("[Chart] Error fetching data:", err);
        if (data.length === 0) {
          setError(err.message || "Failed to load chart data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[200px]">
        <p className="text-xs text-slate-400 mb-2 border-b border-slate-700 pb-2">
          {formatTimestamp(label)}
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400 text-sm">Response:</span>
            <span
              className={`font-mono text-sm ${
                point.isAnomaly ? "text-red-400 font-bold" : "text-green-400"
              }`}
            >
              {point.responseTime}ms
            </span>
          </div>
          {point.rollingMean !== null && (
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Rolling Avg:</span>
              <span className="font-mono text-sm text-blue-400">
                {Math.round(point.rollingMean)}ms
              </span>
            </div>
          )}
          {point.predicted !== null && (
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Predicted:</span>
              <span className="font-mono text-sm text-purple-400">
                {Math.round(point.predicted)}ms
              </span>
            </div>
          )}
          {point.stddev !== null && point.stddev > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Std Dev:</span>
              <span className="font-mono text-sm text-slate-300">
                ±{Math.round(point.stddev)}ms
              </span>
            </div>
          )}
          {point.zScore !== null && point.zScore !== 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Z-Score:</span>
              <span
                className={`font-mono text-sm ${
                  Math.abs(point.zScore) > 2.5
                    ? "text-red-400"
                    : "text-slate-300"
                }`}
              >
                {point.zScore.toFixed(2)}
              </span>
            </div>
          )}
          {point.isAnomaly && (
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-red-400 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                ANOMALY DETECTED
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-white">
            Response Time Analysis
          </h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-3 text-slate-400">Loading chart data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-white">
            Response Time Analysis
          </h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-center h-64 text-red-400">
            <AlertCircle className="w-6 h-6 mr-2" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Performance Monitor
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              24-hour window • Z-score threshold:{" "}
              {stats?.zScoreThreshold || 2.5} • {data.length} data points
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-green-500 rounded"></div>
              <span className="text-slate-400">Response Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
              <span className="text-slate-400">Rolling Avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 bg-purple-500 rounded"
                style={{ opacity: 0.6 }}
              ></div>
              <span className="text-slate-400">Predicted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-slate-400">Anomaly</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <BarChart3 className="w-12 h-12 mb-3 opacity-50" strokeWidth={1} />
            <p>No data available yet</p>
            <p className="text-xs mt-1">Waiting for HTTP poll responses...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Gradient for chart styling */}
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(ts) =>
                  new Date(ts).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                stroke="#64748b"
                fontSize={11}
                tickMargin={8}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => `${Math.round(v)}ms`}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Predicted value line */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#a855f7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                opacity={0.6}
                connectNulls={true}
              />

              {/* Rolling average line */}
              <Line
                type="monotone"
                dataKey="rollingMean"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                connectNulls={true}
              />

              {/* Actual response time line */}
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#22c55e",
                  stroke: "#fff",
                  strokeWidth: 1,
                }}
                connectNulls={true}
              />

              {/* Anomaly points as scatter - overlay on main data */}
              <Scatter
                dataKey="responseTime"
                fill="#ef4444"
                isAnimationActive={false}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  // Only render if this point is an anomaly
                  if (
                    !payload?.isAnomaly ||
                    cx === undefined ||
                    cy === undefined
                  )
                    return null;
                  return (
                    <g>
                      {/* Outer glow */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        fill="#ef4444"
                        opacity={0.2}
                      />

                      {/* Inner dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
              />

              {/* Zoom/Pan */}
              {data.length > 10 && (
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke="#22c55e"
                  fill="#1e293b"
                  tickFormatter={(ts) =>
                    new Date(ts).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  travellerWidth={10}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Stats summary */}
        {stats?.rollingStats && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Sample Count
                </p>
                <p className="text-lg font-semibold text-white mt-1">
                  {stats.rollingStats.sampleCount}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Mean Response
                </p>
                <p className="text-lg font-semibold text-blue-400 mt-1">
                  {Math.round(stats.rollingStats.mean)}ms
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Std Deviation
                </p>
                <p className="text-lg font-semibold text-slate-300 mt-1">
                  ±{Math.round(stats.rollingStats.stddev)}ms
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Min / Max
                </p>
                <p className="text-lg font-semibold text-slate-300 mt-1">
                  {stats.rollingStats.min || 0} / {stats.rollingStats.max || 0}
                  ms
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Anomalies (24h)
                </p>
                <p
                  className={`text-lg font-semibold mt-1 ${
                    stats.stats.anomalyCount > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {stats.stats.anomalyCount}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
