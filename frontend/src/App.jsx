import { useState, useEffect } from "react";

import { Header } from "./components/Header";
import { StatsCards } from "./components/StatsCards";

import { useSSE } from "./hooks/useSSE";
import { useResponses } from "./hooks/useResponses";

import { getAnomalyStatus } from "./services/api";

function App() {
  const { isConnected, subscribe } = useSSE();
  const { responses, addResponse } = useResponses(20);
  const [anomalyStats, setAnomalyStats] = useState(null);

  // Subscribe to new responses
  useEffect(() => {
    const unsubscribe = subscribe("new-response", (data) => {
      addResponse(data);
    });
    return unsubscribe;
  }, [subscribe, addResponse]);

  // Fetch anomaly stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getAnomalyStatus();
        setAnomalyStats(result.data?.stats);
      } catch (err) {
        console.error("Failed to fetch anomaly stats:", err);
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
          <StatsCards responses={responses} anomalyStats={anomalyStats} />
        </section>
      </main>
    </div>
  );
}

export default App;
