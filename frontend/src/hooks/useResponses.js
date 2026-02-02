import { useState, useEffect, useCallback } from "react";
import { getResponses } from "../services/api";

export function useResponses(pageSize = 20) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  });

  const fetchResponses = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const result = await getResponses({ page, limit: pageSize });
        setResponses(result.data || []);
        setPagination(
          result.pagination || {
            page,
            limit: pageSize,
            total: 0,
            totalPages: 0,
          }
        );
        setCurrentPage(page);
      } catch (err) {
        setError(err.message || "Failed to fetch responses");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Add new response to the top of the list (only if on page 1)
  const addResponse = useCallback(
    (newResponse) => {
      if (currentPage === 1) {
        setResponses((prev) => {
          // Avoid duplicates
          if (prev.some((r) => r.id === newResponse.id)) {
            return prev;
          }
          // Add to top
          const updated = [newResponse, ...prev].slice(0, pageSize);
          // Update total count
          setPagination((p) => ({
            ...p,
            total: p.total + 1,
            totalPages: Math.ceil((p.total + 1) / pageSize),
          }));
          return updated;
        });
      }
    },
    [currentPage, pageSize]
  );

  const goToPage = useCallback(
    (page) => {
      fetchResponses(page);
    },
    [fetchResponses]
  );

  const nextPage = useCallback(() => {
    if (currentPage < pagination.totalPages) {
      fetchResponses(currentPage + 1);
    }
  }, [currentPage, pagination.totalPages, fetchResponses]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      fetchResponses(currentPage - 1);
    }
  }, [currentPage, fetchResponses]);

  useEffect(() => {
    fetchResponses(1);
  }, [fetchResponses]);

  return {
    responses,
    loading,
    error,
    pagination,
    currentPage,
    refetch: () => fetchResponses(currentPage),
    addResponse,
    goToPage,
    nextPage,
    prevPage,
  };
}
