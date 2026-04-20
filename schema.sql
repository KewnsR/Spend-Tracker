CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallet (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bank REAL NOT NULL DEFAULT 0 CHECK (bank >= 0),
  ewallet REAL NOT NULL DEFAULT 0 CHECK (ewallet >= 0),
  cash REAL NOT NULL DEFAULT 0 CHECK (cash >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO wallet (id, bank, ewallet, cash)
VALUES (1, 0, 0, 0);
