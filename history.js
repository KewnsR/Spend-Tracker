const dailyList = document.getElementById("daily-total-list");
const weeklyList = document.getElementById("weekly-total-list");
const monthlyList = document.getElementById("monthly-total-list");
const yearlyList = document.getElementById("yearly-total-list");

initializeHistory();

async function initializeHistory() {
  try {
    const expenses = await getExpenses();
    renderAllHistory(expenses);
  } catch {
    renderEmpty(dailyList, "Unable to load daily totals.");
    renderEmpty(weeklyList, "Unable to load weekly totals.");
    renderEmpty(monthlyList, "Unable to load monthly totals.");
    renderEmpty(yearlyList, "Unable to load yearly totals.");
  }
}

async function getExpenses() {
  const response = await fetch("/api/expenses");

  if (!response.ok) {
    throw new Error("Failed to load expenses.");
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((entry) => {
      return (
        entry &&
        typeof entry.date === "string" &&
        Number.isFinite(Number(entry.amount))
      );
    })
    .map((entry) => ({
      date: entry.date,
      amount: Number(entry.amount),
      quantity:
        Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) >= 1
          ? Number(entry.quantity)
          : 1,
    }));
}

function renderAllHistory(expenses) {
  if (expenses.length === 0) {
    renderEmpty(dailyList, "No daily totals yet.");
    renderEmpty(weeklyList, "No weekly totals yet.");
    renderEmpty(monthlyList, "No monthly totals yet.");
    renderEmpty(yearlyList, "No yearly totals yet.");
    return;
  }

  renderGroupedList({
    listElement: dailyList,
    data: groupByDate(expenses),
  });

  renderGroupedList({
    listElement: weeklyList,
    data: groupByWeek(expenses),
  });

  renderGroupedList({
    listElement: monthlyList,
    data: groupByMonth(expenses),
  });

  renderGroupedList({
    listElement: yearlyList,
    data: groupByYear(expenses),
  });
}

function renderGroupedList({ listElement, data }) {
  listElement.innerHTML = "";

  for (const entry of data) {
    const row = document.createElement("li");
    row.className = "history-item";
    row.innerHTML = `<p class="history-label">${entry.label}</p><p class="history-amount">${money(entry.total)}</p>`;
    listElement.append(row);
  }
}

function renderEmpty(listElement, message) {
  listElement.innerHTML = "";
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = message;
  listElement.append(item);
}

function lineTotal(expense) {
  return expense.amount * expense.quantity;
}

function groupByDate(items) {
  const totals = new Map();

  for (const item of items) {
    const current = totals.get(item.date) || 0;
    totals.set(item.date, current + lineTotal(item));
  }

  return Array.from(totals.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([date, total]) => ({
      label: formatDate(date),
      total,
    }));
}

function groupByWeek(items) {
  const totals = new Map();

  for (const item of items) {
    const date = parseDate(item.date);

    if (!date) {
      continue;
    }

    const start = getStartOfWeek(date);
    const key = toISODate(start);
    const current = totals.get(key) || 0;
    totals.set(key, current + lineTotal(item));
  }

  return Array.from(totals.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([startOfWeek, total]) => ({
      label: `Week of ${formatDate(startOfWeek)}`,
      total,
    }));
}

function groupByMonth(items) {
  const totals = new Map();

  for (const item of items) {
    const date = parseDate(item.date);

    if (!date) {
      continue;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;
    const current = totals.get(key) || 0;
    totals.set(key, current + lineTotal(item));
  }

  return Array.from(totals.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([yearMonth, total]) => ({
      label: formatYearMonth(yearMonth),
      total,
    }));
}

function groupByYear(items) {
  const totals = new Map();

  for (const item of items) {
    const date = parseDate(item.date);

    if (!date) {
      continue;
    }

    const key = String(date.getFullYear());
    const current = totals.get(key) || 0;
    totals.set(key, current + lineTotal(item));
  }

  return Array.from(totals.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([year, total]) => ({
      label: year,
      total,
    }));
}

function parseDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getStartOfWeek(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  const date = parseDate(dateString);

  if (!date) {
    return dateString;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatYearMonth(value) {
  const [year, month] = value.split("-");
  const date = new Date(`${year}-${month}-01T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  }).format(date);
}

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
  }).format(value);
}
