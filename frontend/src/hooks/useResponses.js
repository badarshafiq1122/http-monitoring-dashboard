import { useState, useEffect, useCallback } from "react";
import { getRecentResponses } from "../services/api";

export function useResponses(initialCount = 20) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResponses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getRecentResponses(initialCount);
      setResponses(result.data || []);
    } catch (err) {
      setError(err.message || "Failed to fetch responses");
    } finally {
      setLoading(false);
    }
  }, [initialCount]);

  // Add new response to the top of the list
  const addResponse = useCallback(
    (newResponse) => {
      setResponses((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.id === newResponse.id)) {
          return prev;
        }
        // Add to top, keep max count
        return [newResponse, ...prev].slice(0, initialCount);
      });
    },
    [initialCount]
  );

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  return {
    responses,
    loading,
    error,
    refetch: fetchResponses,
    addResponse,
  };
}
