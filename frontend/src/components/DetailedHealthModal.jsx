import { X, Loader2, Activity } from "lucide-react";
import { formatUptime } from "../utils/formatters";

export function DetailedHealthModal({
  isOpen,
  onClose,
  detailedHealth,
  loading,
}) {
  if (!isOpen) return null;

  const getStatusColor = (status) => {
    return status === "healthy" ? "text-green-400" : "text-red-400";
  };

  const getStatusBadge = (status) => {
    return status === "healthy"
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Detailed Health Status
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <span className="ml-3 text-slate-400">
                Loading health details...
              </span>
            </div>
          ) : detailedHealth?.error ? (
            <div className="flex items-center justify-center py-12 text-red-400">
              <p>{detailedHealth.error}</p>
            </div>
          ) : detailedHealth ? (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">
                      Overall Status
                    </p>
                    <p
                      className={`text-2xl font-bold ${getStatusColor(
                        detailedHealth.status
                      )}`}
                    >
                      {detailedHealth.status.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400 mb-1">Uptime</p>
                    <p className="text-lg font-semibold text-white">
                      {formatUptime(detailedHealth.uptime)}
                    </p>
                  </div>
                </div>
                {detailedHealth.timestamp && (
                  <p className="text-xs text-slate-500 mt-3">
                    Last checked:{" "}
                    {new Date(detailedHealth.timestamp).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Health Checks */}
              {detailedHealth.checks && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">
                    Component Checks
                  </h3>

                  {/* Database */}
                  {detailedHealth.checks.database && (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">Database</h4>
                        <span
                          className={`px-2 py-1 rounded text-xs border ${getStatusBadge(
                            detailedHealth.checks.database.status
                          )}`}
                        >
                          {detailedHealth.checks.database.status}
                        </span>
                      </div>
                      {detailedHealth.checks.database.error && (
                        <p className="text-sm text-red-400 mt-2">
                          {detailedHealth.checks.database.error}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Poller */}
                  {detailedHealth.checks.poller && (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white">
                          HTTP Poller
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs border ${getStatusBadge(
                            detailedHealth.checks.poller.status
                          )}`}
                        >
                          {detailedHealth.checks.poller.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400">Running</p>
                          <p className="text-white font-medium">
                            {detailedHealth.checks.poller.isRunning
                              ? "Yes"
                              : "No"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Currently Polling</p>
                          <p className="text-white font-medium">
                            {detailedHealth.checks.poller.isPolling
                              ? "Yes"
                              : "No"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Interval</p>
                          <p className="text-white font-medium">
                            {detailedHealth.checks.poller.intervalMinutes} min
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Target URL</p>
                          <p
                            className="text-white font-medium text-xs truncate"
                            title={detailedHealth.checks.poller.targetUrl}
                          >
                            {detailedHealth.checks.poller.targetUrl}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SSE */}
                  {detailedHealth.checks.sse && (
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-white">
                          Server-Sent Events
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs border ${getStatusBadge(
                            detailedHealth.checks.sse.status
                          )}`}
                        >
                          {detailedHealth.checks.sse.status}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-slate-400">
                          Connected Clients
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {detailedHealth.checks.sse.connectedClients || 0}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
