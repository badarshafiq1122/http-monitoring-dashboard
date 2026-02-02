import { useState, useEffect, useCallback, useRef } from "react";

const SSE_URL = import.meta.env.VITE_SSE_URL || "/api/events";

export function useSSE() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const listenersRef = useRef(new Map());

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return;
    }

    const eventSource = new EventSource(SSE_URL);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onerror = (err) => {
      setIsConnected(false);
      setError("Connection lost. Reconnecting...");

      // EventSource will automatically reconnect
    };

    // Handle connected event
    eventSource.addEventListener("connected", (event) => {
      const data = JSON.parse(event.data);
      setLastEvent({ type: "connected", data, timestamp: Date.now() });
    });

    // Handle new-response event
    eventSource.addEventListener("new-response", (event) => {
      const data = JSON.parse(event.data);
      setLastEvent({ type: "new-response", data, timestamp: Date.now() });

      // Notify listeners
      const listeners = listenersRef.current.get("new-response") || [];
      listeners.forEach((callback) => callback(data));
    });

    // Handle anomaly-detected event
    eventSource.addEventListener("anomaly-detected", (event) => {
      const data = JSON.parse(event.data);
      setLastEvent({ type: "anomaly-detected", data, timestamp: Date.now() });

      // Notify listeners
      const listeners = listenersRef.current.get("anomaly-detected") || [];
      listeners.forEach((callback) => callback(data));
    });
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, []);
    }
    listenersRef.current.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    error,
    connect,
    disconnect,
    subscribe,
  };
}
