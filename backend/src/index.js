require("dotenv").config();
const express = require("express");
const cors = require("cors");

const config = require("./config");
const logger = require("./utils/logger");

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ message: "Good health" });
});

app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

module.exports = app;
