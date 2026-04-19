const { Pool } = require("pg");
const fs = require("node:fs/promises");
const path = require("node:path");

const pgPassword =
  typeof process.env.PGPASSWORD === "string"
    ? process.env.PGPASSWORD.trim()
    : String(process.env.PGPASSWORD ?? "").trim();

const targetDatabase = (process.env.PGDATABASE || "spend_tracker").trim();
const maintenanceDatabase = (process.env.PGMAINTENANCE_DB || "postgres").trim();

if (!pgPassword) {
  throw new Error("PGPASSWORD is required. Set it in your .env file.");
}

if (!targetDatabase) {
  throw new Error("PGDATABASE is required. Set it in your .env file.");
}

if (!isSafeIdentifier(targetDatabase)) {
  throw new Error("PGDATABASE contains invalid characters. Use letters, numbers, and underscores only.");
}

if (!isSafeIdentifier(maintenanceDatabase)) {
  throw new Error("PGMAINTENANCE_DB contains invalid characters.");
}

let appPool;

function baseConfig(database) {
  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: pgPassword,
    database,
  };
}

async function initializeDatabase() {
  await ensureDatabaseExists();

  appPool = new Pool(baseConfig(targetDatabase));

  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = await fs.readFile(schemaPath, "utf8");
  await appPool.query(schemaSql);
}

async function ensureDatabaseExists() {
  const adminPool = new Pool(baseConfig(maintenanceDatabase));

  try {
    const existing = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDatabase],
    );

    if (existing.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(targetDatabase)}`);
    }
  } finally {
    await adminPool.end();
  }
}

function getPool() {
  if (!appPool) {
    throw new Error("Database is not initialized yet. Call initializeDatabase first.");
  }

  return appPool;
}

async function closePool() {
  if (appPool) {
    await appPool.end();
    appPool = undefined;
  }
}

function isSafeIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

module.exports = {
  initializeDatabase,
  getPool,
  closePool,
};
