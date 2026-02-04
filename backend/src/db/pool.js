const { Pool } = require("pg");
const config = require("../config");
const logger = require("../utils/logger");

let pool;

function createPool() {
  const poolConfig = config.database.url
    ? {
        connectionString: config.database.url,
        ssl:
          config.nodeEnv === "production"
            ? { rejectUnauthorized: false }
            : false,
      }
    : {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
      };

  // Pool settings optimized for typical workloads
  poolConfig.max = 20;
  poolConfig.idleTimeoutMillis = 30000;
  poolConfig.connectionTimeoutMillis = 2000;

  pool = new Pool(poolConfig);

  pool.on("error", (err) => {
    logger.error("Unexpected database pool error", { error: err.message });
  });

  pool.on("connect", () => {
    logger.debug("New database connection established");
  });

  return pool;
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info("Database pool closed");
  }
}

// Helper for running queries with automatic connection handling
async function query(text, params) {
  const start = Date.now();
  const result = await getPool().query(text, params);
  const duration = Date.now() - start;

  logger.debug("Executed query", {
    query: text.substring(0, 100),
    duration,
    rows: result.rowCount,
  });

  return result;
}

// Helper for transactions
async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getPool,
  closePool,
  query,
  withTransaction,
};
