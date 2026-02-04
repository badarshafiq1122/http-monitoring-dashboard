const logger = require("../utils/logger");

class SSEManager {
  constructor() {
    this.clients = new Map();
    this.clientIdCounter = 0;
  }

  // Add a new SSE client connection
  addClient(res) {
    const clientId = ++this.clientIdCounter;

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Send initial connection message
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    // Store client
    this.clients.set(clientId, res);

    logger.info("SSE client connected", {
      clientId,
      totalClients: this.clients.size,
    });

    // Handle client disconnect
    res.on("close", () => {
      this.clients.delete(clientId);
      logger.info("SSE client disconnected", {
        clientId,
        totalClients: this.clients.size,
      });
    });

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      if (this.clients.has(clientId)) {
        res.write(": heartbeat\n\n");
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    return clientId;
  }

  // Broadcast event to all connected clients
  broadcast(eventType, data) {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    let sentCount = 0;
    for (const [clientId, res] of this.clients) {
      try {
        res.write(message);
        sentCount++;
      } catch (error) {
        logger.error("Failed to send SSE message", {
          clientId,
          error: error.message,
        });
        this.clients.delete(clientId);
      }
    }

    logger.debug("SSE broadcast sent", {
      eventType,
      sentCount,
      totalClients: this.clients.size,
    });
  }

  // Send event to specific client
  sendToClient(clientId, eventType, data) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
        return true;
      } catch (error) {
        logger.error("Failed to send SSE message to client", {
          clientId,
          error: error.message,
        });
        this.clients.delete(clientId);
      }
    }
    return false;
  }

  // Get count of connected clients
  getClientCount() {
    return this.clients.size;
  }

  // Close all connections (for graceful shutdown)
  closeAll() {
    for (const [clientId, res] of this.clients) {
      try {
        res.end();
      } catch (error) {
        logger.error("Error closing SSE connection", {
          clientId,
          error: error.message,
        });
      }
    }
    this.clients.clear();
    logger.info("All SSE connections closed");
  }
}

// Singleton instance
const sseManager = new SSEManager();

module.exports = sseManager;
