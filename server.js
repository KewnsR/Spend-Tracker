const { loadEnv } = require("./load-env");
loadEnv();

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
    await getPool().get("SELECT 1 AS ok");
    res.json({ ok: true });
  } catch (_error) {
    res.status(500).json({ ok: false, message: "Database connection failed." });
  }
});

app.get("/api/wallet", async (_req, res) => {
  try {
    const db = getPool();
    const row = await db.get(
      `SELECT bank, ewallet, cash, updated_at AS updatedAt
       FROM wallet
       WHERE id = 1`,
    );

    if (!row) {
      await db.run(
        `INSERT INTO wallet (id, bank, ewallet, cash)
         VALUES (1, 0, 0, 0)`,
      );
      return res.json({ bank: 0, ewallet: 0, cash: 0, updatedAt: null });
    }

    return res.json({
      bank: Number(row.bank),
      ewallet: Number(row.ewallet),
      cash: Number(row.cash),
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch wallet." });
  }
});

app.put("/api/wallet", async (req, res) => {
  const { bank, ewallet, cash } = req.body;

  if (
    !Number.isFinite(Number(bank)) ||
    !Number.isFinite(Number(ewallet)) ||
    !Number.isFinite(Number(cash)) ||
    Number(bank) < 0 ||
    Number(ewallet) < 0 ||
    Number(cash) < 0
  ) {
    return res.status(400).json({ message: "Invalid request body." });
  }

  try {
    const db = getPool();
    await db.run(
      `INSERT INTO wallet (id, bank, ewallet, cash, updated_at)
       VALUES (1, ?, ?, ?, datetime('now'))
       ON CONFLICT(id)
       DO UPDATE SET
         bank = excluded.bank,
         ewallet = excluded.ewallet,
         cash = excluded.cash,
         updated_at = datetime('now')`,
      [Number(bank), Number(ewallet), Number(cash)],
    );

    const row = await db.get(
      `SELECT bank, ewallet, cash, updated_at AS updatedAt
       FROM wallet
       WHERE id = 1`,
    );

    return res.json({
      bank: Number(row.bank),
      ewallet: Number(row.ewallet),
      cash: Number(row.cash),
      updatedAt: row.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update wallet." });
  }
});

app.get("/api/expenses", async (_req, res) => {
  try {
    const rows = await getPool().all(
      `SELECT id, item, category, amount, quantity, date, created_at AS createdAt
       FROM expenses
       ORDER BY datetime(created_at) DESC, id DESC`,
    );

    res.json(rows);
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
    const db = getPool();
    const result = await db.run(
      `INSERT INTO expenses (item, category, amount, quantity, date)
       VALUES (?, ?, ?, ?, ?)`,
      [item.trim(), category.trim(), Number(amount), Number(quantity), date],
    );
    const row = await db.get(
      `SELECT id, item, category, amount, quantity, date, created_at AS createdAt
       FROM expenses
       WHERE id = ?`,
      [result.lastID],
    );

    return res.status(201).json(row);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to save expense." });
  }
});

app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await getPool().run("DELETE FROM expenses WHERE id = ?", [
      id,
    ]);

    if (result.changes === 0) {
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
    const db = getPool();
    await db.run("DELETE FROM expenses");
    await db.run("DELETE FROM sqlite_sequence WHERE name = ?", ["expenses"]);
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
            console.warn(`Port ${port} is busy. Trying port ${nextPort}...`);
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
