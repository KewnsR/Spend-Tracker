const fs = require("node:fs/promises");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

let appDb;

async function initializeDatabase() {
  const dbFilePath = path.join(__dirname, "spend-tracker.sqlite");
  appDb = await open({
    filename: dbFilePath,
    driver: sqlite3.Database,
  });

  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await appDb.exec(schemaSql);
}

function getPool() {
  if (!appDb) {
    throw new Error(
      "Database is not initialized yet. Call initializeDatabase first.",
    );
  }

  return appDb;
}

async function closePool() {
  if (appDb) {
    await appDb.close();
    appDb = undefined;
  }
}

module.exports = {
  initializeDatabase,
  getPool,
  closePool,
};
