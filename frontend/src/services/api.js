const API_BASE = import.meta.env.VITE_API_URL || "/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || "Request failed",
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || "Network error", 0, null);
  }
}

// Response endpoints
export async function getResponses(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/responses?${searchParams}`);
}

export async function getRecentResponses(count = 10) {
  return request(`/responses/recent?count=${count}`);
}

export async function getResponseById(id) {
  return request(`/responses/${id}`);
}


// Anomaly endpoints
export async function getAnomalyStatus() {
  return request("/anomalies/status");
}

export async function getRecentAnomalies(count = 20) {
  return request(`/anomalies/recent?count=${count}`);
}

export async function getAnomalyVisualization(hours = 24) {
  return request(`/anomalies/visualization?hours=${hours}`);
}

// Health check
export async function getHealth() {
  return request("/health");
}

export async function getDetailedHealth() {
  return request("/health/detailed");
}

export { ApiError };
