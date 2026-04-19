require("dotenv").config();

const express = require("express");
const path = require("path");
const { initializeDatabase, getPool, closePool } = require("./db");

const app = express();
const START_PORT = Number(process.env.PORT || 3000);
const MAX_PORT_TRIES = 10;

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/health", async (_req, res) => {
  try {
    await getPool().query("SELECT 1");
    res.json({ ok: true });
  } catch (_error) {
    res.status(500).json({ ok: false, message: "Database connection failed." });
  }
});

app.get("/api/expenses", async (_req, res) => {
  try {
    const result = await getPool().query(
      `SELECT id, item, category, amount, quantity, date::text AS date, created_at AS "createdAt"
       FROM expenses
       ORDER BY created_at DESC`,
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch expenses." });
  }
});

app.post("/api/expenses", async (req, res) => {
  const { item, category, amount, quantity, date } = req.body;

  if (
    typeof item !== "string" ||
    !item.trim() ||
    typeof category !== "string" ||
    !category.trim() ||
    !Number.isFinite(Number(amount)) ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 1 ||
    typeof date !== "string" ||
    !date
  ) {
    return res.status(400).json({ message: "Invalid request body." });
  }

  try {
    const result = await getPool().query(
      `INSERT INTO expenses (item, category, amount, quantity, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, item, category, amount, quantity, date::text AS date, created_at AS "createdAt"`,
      [item.trim(), category.trim(), Number(amount), Number(quantity), date],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save expense." });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await getPool().query("DELETE FROM expenses WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete expense." });
  }
});

app.delete("/api/expenses", async (_req, res) => {
  try {
    await getPool().query("TRUNCATE TABLE expenses RESTART IDENTITY");
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to clear expenses." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

async function startServer() {
  try {
    await initializeDatabase();
    await listenWithFallback(START_PORT);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

function listenWithFallback(initialPort) {
  return new Promise((resolve, reject) => {
    const tryListen = (port, attempt) => {
      const server = app
        .listen(port, () => {
          console.log(`Spend Tracker running at http://localhost:${port}`);
          resolve(server);
        })
        .on("error", async (error) => {
          if (error.code === "EADDRINUSE" && attempt < MAX_PORT_TRIES) {
            const nextPort = port + 1;
            console.warn(
              `Port ${port} is busy. Trying port ${nextPort}...`,
            );
            tryListen(nextPort, attempt + 1);
            return;
          }

          await closePool();
          reject(error);
        });
    };

    tryListen(initialPort, 1);
  });
}

process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closePool();
  process.exit(0);
});

startServer();
