import { useState, useEffect } from "react";
import { BarChart3, Loader2, Activity } from "lucide-react";
import { getHealth, getDetailedHealth } from "../services/api";
import { DetailedHealthModal } from "./DetailedHealthModal";

export function Header({ isConnected }) {
  const [health, setHealth] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailedHealth, setDetailedHealth] = useState(null);
  const [loadingDetailed, setLoadingDetailed] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const result = await getHealth();
        setHealth(result);
      } catch (err) {
        setHealth(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); //polling every 30 seconds to check health of server
    return () => clearInterval(interval);
  }, []);

  const handleDetailedHealth = async () => {
    setLoadingDetailed(true);
    setIsModalOpen(true);
    try {
      const result = await getDetailedHealth();
      setDetailedHealth(result);
    } catch (err) {
      setDetailedHealth({
        error: err.message || "Failed to fetch detailed health",
      });
    } finally {
      setLoadingDetailed(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDetailedHealth(null);
  };

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">BizScout</h1>
                <p className="text-xs text-slate-400">HTTP Monitor</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              {/* API Health */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    health ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-slate-400">
                  {health ? "API Online" : "API Offline"}
                </span>
                <button
                  onClick={handleDetailedHealth}
                  disabled={loadingDetailed}
                  className="ml-2 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {loadingDetailed ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3 h-3" />
                      <span>Details</span>
                    </>
                  )}
                </button>
              </div>

              {/* SSE Connection */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm text-slate-400">
                  {isConnected ? "Live" : "Connecting..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Detailed Health Modal */}
      <DetailedHealthModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        detailedHealth={detailedHealth}
        loading={loadingDetailed}
      />
    </>
  );
}
