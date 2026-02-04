const fs = require("fs");
const path = require("path");
const { getPool, closePool } = require("./pool");
const logger = require("../utils/logger");

async function migrate() {
  logger.info("Starting database migration...");

  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    const pool = getPool();
    await pool.query(schema);

    logger.info("Database migration completed successfully");
  } catch (error) {
    logger.error("Migration failed", { error: error.message });
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };
