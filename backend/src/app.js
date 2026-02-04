const express = require("express");
const cors = require("cors");
const config = require("./config");
const logger = require("./utils/logger");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Routes
const healthRoutes = require("./routes/health");
const responsesRoutes = require("./routes/responses");
const anomaliesRoutes = require("./routes/anomalies");
const eventsRoutes = require("./routes/events");

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("HTTP Request", {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });
  next();
});

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/responses", responsesRoutes);
app.use("/api/anomalies", anomaliesRoutes);
app.use("/api/events", eventsRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "BizScout HTTP Monitor API",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      responses: "/api/responses",
      anomalies: "/api/anomalies",
      events: "/api/events",
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
