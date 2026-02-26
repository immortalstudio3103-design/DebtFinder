const landingScreen = document.getElementById("landing-screen");
const workspaceScreen = document.getElementById("workspace-screen");

const startBtn = document.getElementById("start-btn");
const clearBtn = document.getElementById("clear-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const optionsBtn = document.getElementById("options-btn");

const fileInput = document.getElementById("file-input");
const fileFeedback = document.getElementById("file-feedback");

const debtInput = document.getElementById("debt-input");
const interestInput = document.getElementById("interest-input");
const yearsInput = document.getElementById("years-input");
const addressInput = document.getElementById("address-input");

const currentDebtEl = document.getElementById("current-debt");
const debtStatusEl = document.getElementById("debt-status");
const projectedDebtEl = document.getElementById("projected-debt");
const projectedIncreaseEl = document.getElementById("projected-increase");
const analysisSummary = document.getElementById("analysis-summary");
const projectionTable = document.getElementById("projection-table");
const optionsList = document.getElementById("options-list");

let parsedDebt = 0;
let parsedRate = 0;
let parsedStatusLabel = "";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

initializeScreens();

startBtn.addEventListener("click", () => {
  showWorkspace();
});

fileInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);

  if (!files.length) {
    fileFeedback.textContent = "No files selected.";
    return;
  }

  const parseableFiles = files.filter(
    (file) => file.type.startsWith("text/") || file.name.endsWith(".csv") || file.name.endsWith(".txt")
  );

  if (!parseableFiles.length) {
    fileFeedback.textContent = "Files attached. Add at least one TXT/CSV file for automatic extraction.";
    return;
  }

  let combined = "";
  for (const file of parseableFiles) {
    combined += `${await file.text()}\n`;
  }

  const extracted = extractDebtData(combined);

  if (extracted.amount > 0) {
    parsedDebt = extracted.amount;
    debtInput.value = extracted.amount.toFixed(2);
  }

  if (extracted.rate > 0) {
    parsedRate = extracted.rate;
    interestInput.value = extracted.rate.toFixed(2);
  }

  parsedStatusLabel = detectStatusFromText(combined);

  fileFeedback.textContent = `Parsed ${parseableFiles.length} file(s). Detected debt ${usd.format(
    extracted.amount || 0
  )} and rate ${(extracted.rate || 0).toFixed(2)}%.`;
});

analyzeBtn.addEventListener("click", () => {
  const debt = toPositiveNumber(debtInput.value) || parsedDebt;
  const rate = toPositiveNumber(interestInput.value) || parsedRate;
  const years = clampYears(yearsInput.value);

  if (!debt || !rate) {
    analysisSummary.textContent = "Enter debt amount and annual interest rate, or upload parseable TXT/CSV documents.";
    return;
  }

  const projected = compound(debt, rate, years);
  const increase = projected - debt;
  const status = parsedStatusLabel || classifyDebtStatus(debt, rate);

  currentDebtEl.textContent = usd.format(debt);
  debtStatusEl.textContent = status;
  projectedDebtEl.textContent = usd.format(projected);
  projectedIncreaseEl.textContent = usd.format(increase);

  analysisSummary.textContent = `If unpaid, your debt is estimated to reach ${usd.format(projected)} in ${years} year(s) at ${rate.toFixed(
    2
  )}% APR.`;

  renderProjectionRows(debt, rate, years);
});

optionsBtn.addEventListener("click", () => {
  const debt = toPositiveNumber(debtInput.value) || parsedDebt;
  const rate = toPositiveNumber(interestInput.value) || parsedRate;
  const address = addressInput.value.trim();

  if (!address) {
    optionsList.innerHTML = "<li>Enter an address so recommendations can use your state context.</li>";
    return;
  }

  if (!debt || !rate) {
    optionsList.innerHTML = "<li>Run analysis first so recommendations can be tailored to your debt profile.</li>";
    return;
  }

  const state = extractStateCode(address);
  const options = buildResolutionOptions({ debt, rate, state });

  optionsList.innerHTML = "";
  for (const option of options) {
    const li = document.createElement("li");
    li.textContent = option;
    optionsList.appendChild(li);
  }
});

clearBtn.addEventListener("click", clearAll);

function initializeScreens() {
  setScreenVisibility(false);
}

function showWorkspace() {
  setScreenVisibility(true);
}

function setScreenVisibility(workspaceVisible) {
  landingScreen.classList.toggle("active", !workspaceVisible);
  workspaceScreen.classList.toggle("active", workspaceVisible);

  landingScreen.hidden = workspaceVisible;
  workspaceScreen.hidden = !workspaceVisible;

  landingScreen.style.display = workspaceVisible ? "none" : "block";
  workspaceScreen.style.display = workspaceVisible ? "block" : "none";

  landingScreen.setAttribute("aria-hidden", String(workspaceVisible));
  workspaceScreen.setAttribute("aria-hidden", String(!workspaceVisible));
}

function clearAll() {
  parsedDebt = 0;
  parsedRate = 0;
  parsedStatusLabel = "";

  fileInput.value = "";
  fileFeedback.textContent = "No files uploaded yet.";

  debtInput.value = "";
  interestInput.value = "";
  yearsInput.value = "5";
  addressInput.value = "";

  currentDebtEl.textContent = "$0.00";
  debtStatusEl.textContent = "Awaiting data";
  projectedDebtEl.textContent = "$0.00";
  projectedIncreaseEl.textContent = "$0.00";
  analysisSummary.textContent = "Upload a file or enter values, then click Analyze Debt.";

  projectionTable.querySelector("tbody").innerHTML = `
    <tr>
      <td>0</td>
      <td>$0.00</td>
      <td>$0.00</td>
    </tr>
  `;

  optionsList.innerHTML = "<li>Add your address and run analysis to generate options.</li>";
}

function extractDebtData(text) {
  const moneyRegex = /\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\$?\s?\d+(?:\.\d{1,2})?/g;
  const rateRegex = /(\d+(?:\.\d+)?)\s?%/g;

  const amounts = [...text.matchAll(moneyRegex)]
    .map((m) => parseFloat(String(m[0]).replace(/[$,\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => b - a);

  const rates = [...text.matchAll(rateRegex)]
    .map((m) => parseFloat(m[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 50);

  return {
    amount: amounts[0] || 0,
    rate: rates[0] || 0,
  };
}

function toPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clampYears(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 5;
  return Math.min(30, Math.max(1, n));
}

function compound(principal, annualRate, years) {
  return principal * Math.pow(1 + annualRate / 100, years);
}

function classifyDebtStatus(debt, rate) {
  if (debt >= 25000 || rate >= 12) {
    return "High risk: balance likely to escalate quickly";
  }

  if (debt >= 10000 || rate >= 7) {
    return "Moderate risk: growth pressure is meaningful";
  }

  return "Lower risk: growth is slower but still compounding";
}

function detectStatusFromText(text) {
  const normalized = text.toLowerCase();

  if (/\b(default|in default|charge[- ]?off)\b/.test(normalized)) {
    return "Defaulted: urgent action recommended";
  }

  if (/\b(collection|collections|collection agency)\b/.test(normalized)) {
    return "In collections: high urgency";
  }

  if (/\b(past due|delinquent|late payment|overdue)\b/.test(normalized)) {
    return "Past due: immediate follow-up needed";
  }

  if (/\b(current|in good standing|up to date)\b/.test(normalized)) {
    return "Current: not delinquent";
  }

  return "";
}

function renderProjectionRows(debt, rate, years) {
  const body = projectionTable.querySelector("tbody");
  body.innerHTML = "";

  for (let y = 0; y <= years; y += 1) {
    const total = compound(debt, rate, y);
    const growth = total - debt;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${y}</td>
      <td>${usd.format(total)}</td>
      <td>${usd.format(growth)}</td>
    `;

    body.appendChild(row);
  }
}

function extractStateCode(address) {
  const stateMatch = address.toUpperCase().match(/\b([A-Z]{2})\b(?!.*\b[A-Z]{2}\b)/);
  return stateMatch ? stateMatch[1] : "";
}

function buildResolutionOptions({ debt, rate, state }) {
  const options = [
    "Contact your college bursar and request a written breakdown of principal, fees, and collections costs.",
    "Ask for a documented settlement quote and compare lump-sum vs installment terms.",
    "Request interest freeze or fee waiver based on hardship and income constraints.",
    "Build a payment plan target that covers at least monthly interest to stop balance growth.",
  ];

  if (debt > 20000 || rate > 10) {
    options.push("Prioritize legal-aid or debt-counseling review before signing new repayment agreements.");
  }

  if (state) {
    options.push(`Search for state-level tuition debt relief, ombudsman support, or consumer protections in ${state}.`);
  } else {
    options.push("Include state abbreviation in your address for more location-specific options.");
  }

  return options;
}
