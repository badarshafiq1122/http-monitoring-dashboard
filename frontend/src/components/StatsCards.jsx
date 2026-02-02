import { Zap, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { formatResponseTime, formatNumber } from "../utils/formatters";

export function StatsCards({ responses, anomalyStats, rollingStats }) {
  // Use rolling statistics from backend for all metrics (24-hour window)
  const stats = {
    totalRequests: rollingStats?.sampleCount || 0,
    successRate: rollingStats?.successRate
      ? rollingStats.successRate.toFixed(1)
      : responses.length > 0
      ? (
          (responses.filter((r) => r.status_code >= 200 && r.status_code < 300)
            .length /
            responses.length) *
          100
        ).toFixed(1)
      : 0,
    avgResponseTime: rollingStats?.mean
      ? Math.round(rollingStats.mean)
      : responses.length > 0
      ? Math.round(
          responses.reduce((sum, r) => sum + r.response_time_ms, 0) /
            responses.length
        )
      : 0,
    anomalies: anomalyStats?.anomalyCount || 0,
  };

  const cards = [
    {
      title: "Total Requests",
      value: formatNumber(stats.totalRequests),
      subtitle: "24-hour window",
      icon: <Zap className="w-5 h-5" />,
      color: "blue",
    },
    {
      title: "Success Rate",
      value: `${stats.successRate}%`,
      subtitle: "24-hour window",
      icon: <CheckCircle className="w-5 h-5" />,
      color: "green",
    },
    {
      title: "Avg Response",
      value: formatResponseTime(stats.avgResponseTime),
      subtitle: "24-hour mean",
      icon: <Clock className="w-5 h-5" />,
      color: "purple",
    },
    {
      title: "Anomalies",
      value: formatNumber(stats.anomalies),
      subtitle: "detected",
      icon: <AlertTriangle className="w-5 h-5" />,
      color: stats.anomalies > 0 ? "red" : "gray",
    },
  ];

  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400",
    green:
      "from-green-500/20 to-green-600/10 border-green-500/30 text-green-400",
    purple:
      "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400",
    red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
    gray: "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.title}
          className={`card bg-gradient-to-br ${
            colorClasses[card.color]
          } p-5 animate-in`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
            </div>
            <div
              className={`p-2 rounded-lg bg-slate-800/50 ${colorClasses[
                card.color
              ]
                .split(" ")
                .pop()}`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
