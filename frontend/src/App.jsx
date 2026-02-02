import { useState, useEffect } from "react";

import { Header } from "./components/Header";
import { StatsCards } from "./components/StatsCards";

import { ResponseTable } from "./components/ResponseTable";
import { PerformanceChart } from "./components/PerformanceChart";
import { LiveFeed } from "./components/LiveFeed";

import { useSSE } from "./hooks/useSSE";
import { useResponses } from "./hooks/useResponses";

import { getAnomalyStatus } from "./services/api";

function App() {
  const { isConnected, lastEvent, subscribe } = useSSE();
  const {
    responses,
    loading,
    error,
    pagination,
    currentPage,
    addResponse,
    goToPage,
    nextPage,
    prevPage,
  } = useResponses(20);
  const [anomalyStats, setAnomalyStats] = useState(null);
  const [rollingStats, setRollingStats] = useState(null);

  // Subscribe to new responses
  useEffect(() => {
    const unsubscribe = subscribe("new-response", (data) => {
      addResponse(data);
    });
    return unsubscribe;
  }, [subscribe, addResponse]);

  // Fetch anomaly and rolling stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getAnomalyStatus();
        setAnomalyStats(result.data?.stats);
        setRollingStats(result.data?.rollingStats);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      <Header isConnected={isConnected} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <section className="mb-8">
          <StatsCards
            responses={responses}
            anomalyStats={anomalyStats}
            rollingStats={rollingStats}
          />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
          {/* Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <PerformanceChart />
          </div>

          {/* Live Feed - Takes 1 column */}
          <div className="lg:col-span-1 h-full">
            <LiveFeed lastEvent={lastEvent} isConnected={isConnected} />
          </div>
        </div>

        {/* Response Table */}
        <section>
          <ResponseTable
            responses={responses}
            loading={loading}
            error={error}
            pagination={pagination}
            currentPage={currentPage}
            onPageChange={goToPage}
            onNextPage={nextPage}
            onPrevPage={prevPage}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
