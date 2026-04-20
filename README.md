# Spend Tracker

A simple web app to track what you spend and what you bought.

## Stack

- Frontend: HTML, CSS, Vanilla JS
- Backend: Node.js + Express
- Database: SQLite (file-based)

## Features

- Add expenses with item, category, amount, quantity, and date
- View totals for today, this week, this month, this year, and all-time
- View previous period totals (yesterday, last week, last month, last year)
- Filter purchase history by category
- Delete a single expense
- Clear all saved expenses
- View grouped history by day, week, month, and year

## Install and Run

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open:

- http://localhost:3000

## Database Notes

- The SQLite DB file is created automatically at startup: `spend-tracker.sqlite`
- Schema is auto-applied from `schema.sql`
- Optional manual initialization:

```bash
npm run db:init
```

## API Endpoints

- GET /api/health
- GET /api/expenses
- POST /api/expenses
- DELETE /api/expenses/:id
- DELETE /api/expenses
