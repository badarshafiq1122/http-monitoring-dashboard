import { useState } from "react";
import React from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  formatTimestamp,
  formatResponseTime,
  getStatusColor,
  truncateJson,
} from "../utils/formatters";

export function ResponseTable({
  responses,
  loading,
  error,
  pagination,
  currentPage,
  onPageChange,
  onNextPage,
  onPrevPage,
}) {
  const [expandedRow, setExpandedRow] = useState(null);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-white">Recent Responses</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <span className="ml-3 text-slate-400">Loading responses...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-white">Recent Responses</h2>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertCircle className="w-6 h-6 mr-2" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  const statusBadgeClass = (statusCode) => {
    const color = getStatusColor(statusCode);
    const classes = {
      success: "status-badge status-success",
      warning: "status-badge status-warning",
      error: "status-badge status-error",
      default:
        "status-badge bg-slate-500/20 text-slate-400 border border-slate-500/30",
    };
    return classes[color];
  };

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Recent Responses</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            {pagination
              ? `${pagination.total} total records`
              : `${responses.length} records`}
          </span>
          {pagination && pagination.totalPages > 1 && (
            <span className="text-xs text-slate-500">
              Page {currentPage} of {pagination.totalPages}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="table-cell table-header">No.</th>
              <th className="table-cell table-header">Status</th>
              <th className="table-cell table-header">Response Time</th>
              <th className="table-cell table-header">Timestamp</th>
              <th className="table-cell table-header">Payload Preview</th>
              <th className="table-cell table-header w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {responses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="table-cell text-center text-slate-500 py-8"
                >
                  No responses yet. Waiting for first poll...
                </td>
              </tr>
            ) : (
              responses.map((response, index) => {
                const rowNumber =
                  (currentPage - 1) * (pagination?.limit || 20) + index + 1;
                return (
                  <React.Fragment key={response.id}>
                    <tr
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        index === 0 ? "animate-in bg-green-500/5" : ""
                      }`}
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === response.id ? null : response.id
                        )
                      }
                    >
                      <td className="table-cell text-slate-400 font-medium">
                        {rowNumber}
                      </td>
                      <td className="table-cell">
                        <span
                          className={statusBadgeClass(response.status_code)}
                        >
                          {response.status_code || "ERR"}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`font-mono ${
                            response.response_time_ms < 300
                              ? "text-green-400"
                              : response.response_time_ms < 1000
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatResponseTime(response.response_time_ms)}
                        </span>
                      </td>
                      <td className="table-cell text-slate-400">
                        {formatTimestamp(response.created_at)}
                      </td>
                      <td className="table-cell font-mono text-xs text-slate-500 max-w-xs truncate">
                        {truncateJson(response.response_payload, 60)}
                      </td>
                      <td className="table-cell">
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform ${
                            expandedRow === response.id ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expandedRow === response.id && (
                      <tr className="bg-slate-800/30">
                        <td colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-300 mb-2">
                                Request Payload
                              </h4>
                              <pre className="bg-slate-900 p-3 rounded-lg text-xs text-slate-400 overflow-auto max-h-40 font-mono">
                                {JSON.stringify(
                                  response.request_payload,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-300 mb-2">
                                Response Payload
                              </h4>
                              <pre className="bg-slate-900 p-3 rounded-lg text-xs text-slate-400 overflow-auto max-h-40 font-mono">
                                {JSON.stringify(
                                  response.response_payload,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            <span className="mr-4">ID: {response.id}</span>
                            <span>Target: {response.target_url}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="card-body border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
              {Math.min(currentPage * pagination.limit, pagination.total)} of{" "}
              {pagination.total} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevPage}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? "bg-green-600 text-white font-semibold"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={onNextPage}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm text-slate-300"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
