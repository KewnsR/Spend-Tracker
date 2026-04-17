const STORAGE_KEY = "spend-tracker-expenses-v1";

const form = document.getElementById("expense-form");
const itemInput = document.getElementById("item");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const quantityInput = document.getElementById("quantity");
const dateInput = document.getElementById("date");
const filterCategory = document.getElementById("filter-category");
const clearAllButton = document.getElementById("clear-all");
const expenseList = document.getElementById("expense-list");
const expenseTemplate = document.getElementById("expense-item-template");
const summaryTiles = Array.from(document.querySelectorAll(".summary-tile"));
const dailyTotalList = document.getElementById("daily-total-list");
const historyContext = document.getElementById("history-context");
const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmOk = document.getElementById("confirm-ok");
const modalBackdrop = document.querySelector("[data-close-modal='true']");

const totalDay = document.getElementById("total-day");
const totalWeek = document.getElementById("total-week");
const totalMonth = document.getElementById("total-month");
const totalYear = document.getElementById("total-year");
const totalYesterday = document.getElementById("total-yesterday");
const totalLastWeek = document.getElementById("total-last-week");
const totalLastMonth = document.getElementById("total-last-month");
const totalLastYear = document.getElementById("total-last-year");
const totalAll = document.getElementById("total-all");

const periodLabelMap = {
  today: "Today",
  "this-week": "This Week",
  "this-month": "This Month",
  "this-year": "This Year",
  yesterday: "Yesterday",
  "last-week": "Last Week",
  "last-month": "Last Month",
  "last-year": "Last Year",
  "all-time": "All Time",
};

let expenses = loadExpenses();
let selectedPeriod = "today";

setDefaultDate();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const item = itemInput.value.trim();
  const category = categoryInput.value;
  const amount = Number.parseFloat(amountInput.value);
  const quantity = Number.parseInt(quantityInput.value, 10);
  const date = dateInput.value;

  if (
    !item ||
    !date ||
    Number.isNaN(amount) ||
    amount < 0 ||
    Number.isNaN(quantity) ||
    quantity < 1
  ) {
    return;
  }

  expenses.unshift({
    id: crypto.randomUUID(),
    item,
    category,
    amount,
    quantity,
    date,
    createdAt: Date.now(),
  });

  saveExpenses();
  form.reset();
  setDefaultDate();
  render();
});

filterCategory.addEventListener("change", () => {
  renderList();
});

clearAllButton.addEventListener("click", () => {
  showConfirmModal("Delete all saved expenses?").then((confirmed) => {
    if (!confirmed) {
      return;
    }

    expenses = [];
    saveExpenses();
    render();
  });
});

for (const tile of summaryTiles) {
  tile.addEventListener("click", () => {
    selectedPeriod = tile.dataset.period || "all-time";
    updateActiveSummaryTile();
    renderList();
  });
}

function loadExpenses() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => {
        return (
          entry &&
          typeof entry.id === "string" &&
          typeof entry.item === "string" &&
          typeof entry.category === "string" &&
          typeof entry.date === "string" &&
          Number.isFinite(Number(entry.amount))
        );
      })
      .map((entry) => ({
        ...entry,
        amount: Number(entry.amount),
        quantity:
          Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) >= 1
            ? Number(entry.quantity)
            : 1,
      }));
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function setDefaultDate() {
  dateInput.value = todayISO();
}

function render() {
  renderSummary();
  renderDailyTotals();
  updateActiveSummaryTile();
  renderList();
}

function renderSummary() {
  const now = new Date();

  const day = expenses.filter((expense) => isSameDay(expense.date, now));
  const week = expenses.filter((expense) => isSameWeek(expense.date, now));
  const month = expenses.filter((expense) => isSameMonth(expense.date, now));
  const year = expenses.filter((expense) => isSameYear(expense.date, now));
  const yesterday = expenses.filter((expense) =>
    isYesterday(expense.date, now),
  );
  const lastWeek = expenses.filter((expense) => isLastWeek(expense.date, now));
  const lastMonth = expenses.filter((expense) =>
    isLastMonth(expense.date, now),
  );
  const lastYear = expenses.filter((expense) => isLastYear(expense.date, now));

  totalDay.textContent = money(sumAmount(day));
  totalWeek.textContent = money(sumAmount(week));
  totalMonth.textContent = money(sumAmount(month));
  totalYear.textContent = money(sumAmount(year));
  totalYesterday.textContent = money(sumAmount(yesterday));
  totalLastWeek.textContent = money(sumAmount(lastWeek));
  totalLastMonth.textContent = money(sumAmount(lastMonth));
  totalLastYear.textContent = money(sumAmount(lastYear));
  totalAll.textContent = money(sumAmount(expenses));
}

function renderList() {
  const now = new Date();
  const filter = filterCategory.value;
  const filtered = expenses
    .filter((expense) => filter === "All" || expense.category === filter)
    .filter((expense) => isInPeriod(expense.date, selectedPeriod, now))
    .sort((a, b) => {
      if (a.date === b.date) {
        return b.createdAt - a.createdAt;
      }

      return a.date > b.date ? -1 : 1;
    });

  historyContext.textContent = `Showing: ${periodLabelMap[selectedPeriod] || "All Time"}`;

  expenseList.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No expenses yet for this filter.";
    expenseList.append(empty);
    return;
  }

  for (const expense of filtered) {
    const node = expenseTemplate.content.cloneNode(true);

    const title = node.querySelector(".expense-title");
    const meta = node.querySelector(".expense-meta");
    const amount = node.querySelector(".expense-amount");
    const deleteBtn = node.querySelector(".delete-btn");

    title.textContent = expense.item;
    meta.textContent = `${expense.category} | Qty ${expense.quantity} | ${formatDate(expense.date)}`;
    amount.textContent = money(expense.amount * expense.quantity);

    deleteBtn.addEventListener("click", () => {
      deleteExpense(expense.id);
    });

    expenseList.append(node);
  }
}

function renderDailyTotals() {
  if (!dailyTotalList) {
    return;
  }

  dailyTotalList.innerHTML = "";

  if (expenses.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No daily totals yet.";
    dailyTotalList.append(empty);
    return;
  }

  const totalsByDay = new Map();

  for (const expense of expenses) {
    const lineTotal = expense.amount * expense.quantity;
    const current = totalsByDay.get(expense.date) || 0;
    totalsByDay.set(expense.date, current + lineTotal);
  }

  const sortedDays = Array.from(totalsByDay.entries()).sort((a, b) =>
    a[0] > b[0] ? -1 : 1,
  );

  for (const [date, total] of sortedDays) {
    const row = document.createElement("li");
    row.className = "daily-total-item";
    row.innerHTML = `<p class="daily-total-date">${formatDate(date)}</p><p class="daily-total-amount">${money(total)}</p>`;
    dailyTotalList.append(row);
  }
}

function updateActiveSummaryTile() {
  for (const tile of summaryTiles) {
    const isActive = tile.dataset.period === selectedPeriod;
    tile.classList.toggle("is-active", isActive);
    tile.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function isInPeriod(dateString, period, compareDate) {
  switch (period) {
    case "today":
      return isSameDay(dateString, compareDate);
    case "this-week":
      return isSameWeek(dateString, compareDate);
    case "this-month":
      return isSameMonth(dateString, compareDate);
    case "this-year":
      return isSameYear(dateString, compareDate);
    case "yesterday":
      return isYesterday(dateString, compareDate);
    case "last-week":
      return isLastWeek(dateString, compareDate);
    case "last-month":
      return isLastMonth(dateString, compareDate);
    case "last-year":
      return isLastYear(dateString, compareDate);
    case "all-time":
      return true;
    default:
      return true;
  }
}

function deleteExpense(id) {
  showConfirmModal("Delete this expense?").then((confirmed) => {
    if (!confirmed) {
      return;
    }

    expenses = expenses.filter((expense) => expense.id !== id);
    saveExpenses();
    render();
  });
}

function showConfirmModal(message) {
  return new Promise((resolve) => {
    confirmMessage.textContent = message;
    confirmModal.hidden = false;
    confirmOk.focus();

    const closeWith = (result) => {
      cleanup();
      confirmModal.hidden = true;
      resolve(result);
    };

    const onOk = () => closeWith(true);
    const onCancel = () => closeWith(false);
    const onBackdrop = () => closeWith(false);
    const onKeydown = (event) => {
      if (event.key === "Escape") {
        closeWith(false);
      }
    };

    function cleanup() {
      confirmOk.removeEventListener("click", onOk);
      confirmCancel.removeEventListener("click", onCancel);
      modalBackdrop.removeEventListener("click", onBackdrop);
      window.removeEventListener("keydown", onKeydown);
    }

    confirmOk.addEventListener("click", onOk);
    confirmCancel.addEventListener("click", onCancel);
    modalBackdrop.addEventListener("click", onBackdrop);
    window.addEventListener("keydown", onKeydown);
  });
}

function sumAmount(entries) {
  return entries.reduce(
    (total, current) => total + current.amount * current.quantity,
    0,
  );
}

function money(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function todayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);

  return (
    d.getFullYear() === compareDate.getFullYear() &&
    d.getMonth() === compareDate.getMonth() &&
    d.getDate() === compareDate.getDate()
  );
}

function isSameMonth(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);

  return (
    d.getFullYear() === compareDate.getFullYear() &&
    d.getMonth() === compareDate.getMonth()
  );
}

function isSameYear(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);

  return d.getFullYear() === compareDate.getFullYear();
}

function isSameWeek(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);

  const startOfWeek = getStartOfWeek(compareDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return d >= startOfWeek && d < endOfWeek;
}

function isYesterday(dateString, compareDate) {
  const yesterday = new Date(
    compareDate.getFullYear(),
    compareDate.getMonth(),
    compareDate.getDate() - 1,
  );

  return isSameDay(dateString, yesterday);
}

function isLastWeek(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);
  const currentWeekStart = getStartOfWeek(compareDate);
  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(currentWeekStart);

  return d >= lastWeekStart && d < lastWeekEnd;
}

function isLastMonth(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);
  const currentMonth = compareDate.getMonth();
  const currentYear = compareDate.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
}

function isLastYear(dateString, compareDate) {
  const d = new Date(`${dateString}T00:00:00`);

  return d.getFullYear() === compareDate.getFullYear() - 1;
}

function getStartOfWeek(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}
