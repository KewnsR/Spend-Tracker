# Spend Tracker

A simple web app to track what you spend and what you bought.

## Stack

- Frontend: HTML, CSS, Vanilla JS
- Styling Utilities: TailwindCSS (CDN)
- Backend: Node.js + Express
- Database: PostgreSQL

## Features

- Add expenses with item, category, amount, quantity, and date
- View totals for today, this week, this month, this year, and all-time
- View previous period totals (yesterday, last week, last month, last year)
- Filter purchase history by category
- Delete a single expense
- Clear all saved expenses
- View grouped history by day, week, month, and year

## PostgreSQL Setup (pgAdmin4)

1. In pgAdmin4, use the saved server entry named PostgreSQL 15.
2. That server entry is localhost on port 5432 with username postgres.
3. Right-click the server node and choose Refresh.
4. Open Query Tool on PostgreSQL 15.
5. Run `CREATE DATABASE spend_tracker;` once.
6. Right-click Databases and choose Refresh.
7. Confirm spend_tracker appears in the list.
8. Open the spend_tracker database, then Schemas > public > Tables.
9. Run schema.sql in that database if the expenses table is missing.

If you prefer a ready-made note, open pgadmin15-bootstrap.sql and run the CREATE DATABASE line from pgAdmin4 Query Tool on the PostgreSQL 15 server.

If you prefer manual creation in pgAdmin4:

1. Right-click Databases, then choose Create > Database.
2. Set Database name to spend_tracker, then click Save.
3. Open Query Tool on spend_tracker.
4. Copy and run SQL from schema.sql:

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  item TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Note: The server also auto-runs schema.sql on startup, so the expenses table is created automatically if it does not exist.

## Environment Configuration

1. Copy .env.example to .env
2. Update values in .env:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password_here
PGDATABASE=spend_tracker
PGMAINTENANCE_DB=postgres
```

PGPASSWORD must be your real PostgreSQL password for the configured PGUSER.
For the pgAdmin4 server entry, the saved connection is PostgreSQL 15 on localhost:5432 as postgres.

## Install and Run

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

Optional one-time setup command (creates database if missing and applies schema, requires valid PostgreSQL credentials):

```bash
npm run db:init
```

3. Open:

- http://localhost:3000

## TailwindCSS

TailwindCSS is loaded via CDN in both pages:

- index.html
- history.html

You can now add Tailwind utility classes directly in your HTML elements.

## API Endpoints

- GET /api/health
- GET /api/expenses
- POST /api/expenses
- DELETE /api/expenses/:id
- DELETE /api/expenses
