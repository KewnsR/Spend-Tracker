require("dotenv").config();

const { initializeDatabase, closePool } = require("../db");

async function main() {
  try {
    await initializeDatabase();
    console.log("Database is ready and schema is applied.");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();
