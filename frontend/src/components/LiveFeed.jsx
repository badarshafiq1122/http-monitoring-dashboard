import { useState, useEffect } from "react";
import { Zap, AlertTriangle } from "lucide-react";
import {
  formatRelativeTime,
  formatResponseTime,
  getStatusColor,
} from "../utils/formatters";

export function LiveFeed({ lastEvent, isConnected }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (lastEvent && lastEvent.type !== "connected") {
      setEvents((prev) => {
        const newEvents = [
          {
            id: lastEvent.timestamp,
            type: lastEvent.type,
            data: lastEvent.data,
            timestamp: lastEvent.timestamp,
          },
          ...prev,
        ].slice(0, 10); // Keep last 10 events
        return newEvents;
      });
    }
  }, [lastEvent]);

  const getEventIcon = (type) => {
    if (type === "new-response") {
      return (
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-green-400" />
        </div>
      );
    }
    if (type === "anomaly-detected") {
      return (
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
      );
    }
    return null;
  };

  const getEventContent = (event) => {
    if (event.type === "new-response") {
      const statusColor = getStatusColor(event.data.status_code);
      const statusClass = {
        success: "text-green-400",
        warning: "text-yellow-400",
        error: "text-red-400",
        default: "text-slate-400",
      }[statusColor];

      return (
        <div>
          <p className="text-sm text-white">New response received</p>
          <p className="text-xs text-slate-400 mt-1">
            Status:{" "}
            <span className={statusClass}>{event.data.status_code}</span>
            {" • "}
            Time:{" "}
            <span className="text-slate-300">
              {formatResponseTime(event.data.response_time_ms)}
            </span>
          </p>
        </div>
      );
    }

    if (event.type === "anomaly-detected") {
      return (
        <div>
          <p className="text-sm text-red-400 font-medium">Anomaly Detected!</p>
          <p className="text-xs text-slate-400 mt-1">
            Z-score:{" "}
            <span className="text-red-300">
              {event.data.z_score?.toFixed(2)}
            </span>
            {" • "}
            Type:{" "}
            <span className="text-slate-300">{event.data.anomaly_type}</span>
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Live Feed</h2>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
            isConnected
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
            }`}
          />
          {isConnected ? "Connected" : "Reconnecting..."}
        </div>
      </div>

      <div className="card-body p-0 overflow-y-auto flex-1">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Zap className="w-12 h-12 mb-3 opacity-50" strokeWidth={1} />
            <p className="text-sm">Waiting for events...</p>
            <p className="text-xs mt-1">
              Updates will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-4 ${
                  index === 0 ? "animate-in bg-slate-800/30" : ""
                }`}
              >
                {getEventIcon(event.type)}
                <div className="flex-1 min-w-0">{getEventContent(event)}</div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
