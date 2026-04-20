const calendarGrid = document.getElementById("calendar-grid");
const monthLabel = document.getElementById("calendar-month-label");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const selectedDateLabel = document.getElementById("selected-date-label");
const selectedDateList = document.getElementById("selected-date-list");

const summaryDay = document.getElementById("summary-day");
const summaryWeek = document.getElementById("summary-week");
const summaryMonth = document.getElementById("summary-month");
const summaryYear = document.getElementById("summary-year");
const summaryAll = document.getElementById("summary-all");

const STORAGE_KEY = "spend-tracker-expenses";
const useApi = window.location.port === "3000";

let expenses = [];
let currentMonthDate = new Date();
let selectedDateISO = toISODate(new Date());

prevMonthBtn.addEventListener("click", () => {
  currentMonthDate = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() - 1,
    1,
  );
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonthDate = new Date(
    currentMonthDate.getFullYear(),
    currentMonthDate.getMonth() + 1,
    1,
  );
  renderCalendar();
});

initializeCalendarPage();

async function initializeCalendarPage() {
  try {
    expenses = await getExpenses();
  } catch {
    expenses = [];
  }

  render();
}

function render() {
  renderCalendar();
  renderSelectedDateSummary();
}

function renderCalendar() {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  monthLabel.textContent = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  }).format(firstDay);

  calendarGrid.innerHTML = "";

  const mondayStartOffset = getMondayStartOffset(firstDay);
  for (let i = 0; i < mondayStartOffset; i += 1) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "day-cell is-empty";
    empty.disabled = true;
    empty.setAttribute("aria-hidden", "true");
    calendarGrid.append(empty);
  }

  const totalsByDate = getTotalsByDate(expenses);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const iso = toISODate(date);
    const total = totalsByDate.get(iso) || 0;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell";
    if (iso === selectedDateISO) {
      cell.classList.add("is-selected");
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);

    const dayTotal = document.createElement("p");
    dayTotal.className = "day-total";
    dayTotal.textContent = total > 0 ? money(total) : "No spend";

    cell.append(dayNumber, dayTotal);

    cell.addEventListener("click", () => {
      selectedDateISO = iso;
      render();
    });

    calendarGrid.append(cell);
  }
}

function renderSelectedDateSummary() {
  const selectedDate = parseDate(selectedDateISO);

  if (!selectedDate) {
    selectedDateLabel.textContent = "No date selected";
    renderEmpty(selectedDateList, "No entries for this date.");
    renderSummaryNumbers({ day: 0, week: 0, month: 0, year: 0, all: 0 });
    return;
  }

  const dayEntries = expenses.filter((entry) => entry.date === selectedDateISO);

  selectedDateLabel.textContent = `Selected: ${formatDate(selectedDateISO)}`;

  if (dayEntries.length === 0) {
    renderEmpty(selectedDateList, "No entries for this date.");
  } else {
    selectedDateList.innerHTML = "";

    const sorted = [...dayEntries].sort((a, b) => {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    for (const entry of sorted) {
      const row = document.createElement("li");
      row.className = "history-item";
      row.innerHTML = `<p class="history-label">${entry.item} (${entry.category}) x${entry.quantity}</p><p class="history-amount">${money(lineTotal(entry))}</p>`;
      selectedDateList.append(row);
    }
  }

  const summary = calculateSummaryForSelectedDate(selectedDate);
  renderSummaryNumbers(summary);
}

function calculateSummaryForSelectedDate(selectedDate) {
  const dayISO = toISODate(selectedDate);
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  const weekStart = getStartOfWeek(selectedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let day = 0;
  let week = 0;
  let month = 0;
  let year = 0;
  let all = 0;

  for (const entry of expenses) {
    const total = lineTotal(entry);
    all += total;

    if (entry.date === dayISO) {
      day += total;
    }

    const entryDate = parseDate(entry.date);
    if (!entryDate) {
      continue;
    }

    if (entryDate >= weekStart && entryDate < weekEnd) {
      week += total;
    }

    if (
      entryDate.getFullYear() === selectedYear &&
      entryDate.getMonth() === selectedMonth
    ) {
      month += total;
    }

    if (entryDate.getFullYear() === selectedYear) {
      year += total;
    }
  }

  return { day, week, month, year, all };
}

function renderSummaryNumbers(summary) {
  summaryDay.textContent = money(summary.day);
  summaryWeek.textContent = money(summary.week);
  summaryMonth.textContent = money(summary.month);
  summaryYear.textContent = money(summary.year);
  summaryAll.textContent = money(summary.all);
}

async function getExpenses() {
  if (!useApi) {
    return readExpensesFromStorage();
  }

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
      item: typeof entry.item === "string" ? entry.item : "Item",
      category: typeof entry.category === "string" ? entry.category : "Other",
      date: entry.date,
      amount: Number(entry.amount),
      quantity:
        Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) >= 1
          ? Number(entry.quantity)
          : 1,
      createdAt: Number.isFinite(Number(entry.createdAt))
        ? Number(entry.createdAt)
        : 0,
    }));
}

function readExpensesFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => {
        return (
          entry &&
          typeof entry.date === "string" &&
          Number.isFinite(Number(entry.amount))
        );
      })
      .map((entry) => ({
        item: typeof entry.item === "string" ? entry.item : "Item",
        category: typeof entry.category === "string" ? entry.category : "Other",
        date: entry.date,
        amount: Number(entry.amount),
        quantity:
          Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) >= 1
            ? Number(entry.quantity)
            : 1,
        createdAt: Number.isFinite(Number(entry.createdAt))
          ? Number(entry.createdAt)
          : 0,
      }));
  } catch {
    return [];
  }
}

function lineTotal(entry) {
  return entry.amount * entry.quantity;
}

function getTotalsByDate(items) {
  const map = new Map();

  for (const entry of items) {
    const current = map.get(entry.date) || 0;
    map.set(entry.date, current + lineTotal(entry));
  }

  return map;
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

function getMondayStartOffset(firstDay) {
  const jsDay = firstDay.getDay();

  return jsDay === 0 ? 6 : jsDay - 1;
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

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function renderEmpty(listElement, message) {
  listElement.innerHTML = "";
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = message;
  listElement.append(item);
}
