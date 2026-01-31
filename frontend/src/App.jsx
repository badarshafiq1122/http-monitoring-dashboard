import { useState, useEffect } from "react";

function App() {
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealthStatus(data.message))
      .catch(() => setHealthStatus("Error fetching health"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            BizScout HTTP Monitoring Dashboard
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">
                Health Status: {healthStatus || "Loading..."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
