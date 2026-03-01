const landing = document.getElementById("landing");
const workspace = document.getElementById("workspace");
const signInForm = document.getElementById("signInForm");
const signInEmail = document.getElementById("signInEmail");
const signInPassword = document.getElementById("signInPassword");
const authMessage = document.getElementById("authMessage");
const clearBtn = document.getElementById("clearBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const docInput = document.getElementById("docInput");
const uploadStatus = document.getElementById("uploadStatus");
const debtAmountInput = document.getElementById("debtAmount");
const interestRateInput = document.getElementById("interestRate");
const addressInput = document.getElementById("addressInput");
const entryLockMsg = document.getElementById("entryLockMsg");
const metricsGrid = document.getElementById("metricsGrid");
const forecastOutput = document.getElementById("forecastOutput");
const optionsOutput = document.getElementById("optionsOutput");

const state = {
  extractedDebt: 0,
  extractedRate: 0,
  filesProcessed: 0,
};

setManualEntryEnabled(false);

signInForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = signInEmail.value.trim();
  const password = signInPassword.value;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    authMessage.textContent = "Enter a valid email address.";
    return;
  }

  if (password.length < 8) {
    authMessage.textContent = "Password must be at least 8 characters.";
    return;
  }

  authMessage.textContent = "";
  landing.classList.remove("is-visible");
  workspace.classList.add("is-visible");
});

docInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) {
    state.extractedDebt = 0;
    state.extractedRate = 0;
    state.filesProcessed = 0;
    setManualEntryEnabled(false);
    uploadStatus.textContent = "No files uploaded yet.";
    return;
  }

  const extractionResults = await Promise.all(files.map(readFileAndExtract));
  state.filesProcessed = files.length;

  const debtCandidates = extractionResults.flatMap((item) => item.debtCandidates);
  const rateCandidates = extractionResults.flatMap((item) => item.rateCandidates);

  state.extractedDebt = debtCandidates.reduce((sum, n) => sum + n, 0);
  state.extractedRate = rateCandidates.length
    ? rateCandidates.reduce((sum, n) => sum + n, 0) / rateCandidates.length
    : 0;

  if (!debtAmountInput.value && state.extractedDebt > 0) {
    debtAmountInput.value = state.extractedDebt.toFixed(2);
  }
  if (!interestRateInput.value && state.extractedRate > 0) {
    interestRateInput.value = state.extractedRate.toFixed(2);
  }

  setManualEntryEnabled(true);
  uploadStatus.textContent = `Processed ${files.length} file(s). Estimated debt extracted: ${formatMoney(state.extractedDebt)}.`;
});

analyzeBtn.addEventListener("click", () => {
  if (state.filesProcessed < 1) {
    renderError("Upload required debt documents before entering or analyzing debt information.");
    return;
  }

  const principal = toNumber(debtAmountInput.value) || state.extractedDebt;
  const annualRate = toNumber(interestRateInput.value) || state.extractedRate || 5.5;
  const address = addressInput.value.trim();

  if (principal <= 0) {
    renderError("Please add a debt amount or upload documents with debt values.");
    return;
  }

  const monthlyRate = annualRate / 100 / 12;
  const monthlyGrowth = principal * monthlyRate;
  const oneYearProjection = principal * Math.pow(1 + monthlyRate, 12);
  const status = getDebtStatus(principal);
  const forecasts = [1, 3, 5].map((years) => ({
    years,
    balance: principal * Math.pow(1 + monthlyRate, years * 12),
  }));

  renderMetrics({
    principal,
    annualRate,
    monthlyGrowth,
    oneYearProjection,
    status,
  });

  renderForecast(forecasts, annualRate);
  renderOptions(principal, annualRate, address);
});

clearBtn.addEventListener("click", () => {
  state.extractedDebt = 0;
  state.extractedRate = 0;
  state.filesProcessed = 0;
  docInput.value = "";
  debtAmountInput.value = "";
  interestRateInput.value = "";
  addressInput.value = "";
  setManualEntryEnabled(false);
  uploadStatus.textContent = "Information cleared.";
  metricsGrid.innerHTML = "";
  forecastOutput.textContent = "Run analysis to see year-by-year debt projections.";
  optionsOutput.textContent = "Add your address and run analysis to generate location-aware options.";
});

function setManualEntryEnabled(isEnabled) {
  debtAmountInput.disabled = !isEnabled;
  interestRateInput.disabled = !isEnabled;
  addressInput.disabled = !isEnabled;
  analyzeBtn.disabled = !isEnabled;
  entryLockMsg.textContent = isEnabled
    ? "Manual entry unlocked. You can now type debt details."
    : "Upload required debt documents to enable manual entry.";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getDebtStatus(principal) {
  if (principal < 5000) {
    return { label: "Low impact", tone: "ok" };
  }
  if (principal < 20000) {
    return { label: "Moderate pressure", tone: "warn" };
  }
  return { label: "High risk", tone: "risk" };
}

function renderError(message) {
  metricsGrid.innerHTML = `<article class="metric risk"><h4>Issue</h4><p>${message}</p></article>`;
}

function renderMetrics({ principal, annualRate, monthlyGrowth, oneYearProjection, status }) {
  metricsGrid.innerHTML = `
    <article class="metric ${status.tone}">
      <h4>Current Debt</h4>
      <p>${formatMoney(principal)}</p>
    </article>
    <article class="metric ${status.tone}">
      <h4>Debt Status</h4>
      <p>${status.label}</p>
    </article>
    <article class="metric ${status.tone}">
      <h4>Annual Interest Rate</h4>
      <p>${annualRate.toFixed(2)}%</p>
    </article>
    <article class="metric ${status.tone}">
      <h4>Estimated Monthly Growth</h4>
      <p>${formatMoney(monthlyGrowth)}</p>
    </article>
    <article class="metric ${status.tone}">
      <h4>Projected Balance (12 mo)</h4>
      <p>${formatMoney(oneYearProjection)}</p>
    </article>
    <article class="metric ${status.tone}">
      <h4>Files Analyzed</h4>
      <p>${state.filesProcessed}</p>
    </article>
  `;
}

function renderForecast(forecasts, annualRate) {
  const rows = forecasts
    .map((item) => `<tr><td>${item.years} year${item.years > 1 ? "s" : ""}</td><td>${formatMoney(item.balance)}</td></tr>`)
    .join("");

  forecastOutput.innerHTML = `
    <p>Forecast assumes no payments and ${annualRate.toFixed(2)}% annual interest, compounded monthly.</p>
    <table>
      <thead><tr><th>Time Horizon</th><th>Projected Balance</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderOptions(principal, annualRate, address) {
  const region = extractState(address);
  const highRate = annualRate >= 7;
  const highDebt = principal >= 20000;
  const stateHint = region ? `for ${region}` : "based on your profile";

  const options = [
    `Request a full debt validation and account history from your institution ${stateHint}.`,
    "Ask for a settlement quote and compare lump-sum versus payment-plan offers.",
    highRate
      ? "Prioritize refinancing or consolidation to reduce interest drag before balance growth accelerates."
      : "Use an auto-pay plan to prevent delinquency and protect credit impact.",
    highDebt
      ? "Contact a nonprofit credit counselor to negotiate hardship terms and review legal protections."
      : "Set a 12-24 month payoff plan with a fixed monthly contribution goal.",
    region
      ? `Search state-specific consumer protection and tuition recovery programs in ${region}.`
      : "Add a state in your address to get more localized assistance pathways.",
  ];

  optionsOutput.innerHTML = `<ul>${options.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function extractState(address) {
  if (!address) return "";
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  if (stateMatch) return stateMatch[1];

  const spelledStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
  ];

  const found = spelledStates.find((stateName) =>
    address.toLowerCase().includes(stateName.toLowerCase())
  );

  return found || "";
}

function readFileAndExtract(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      const rawText = String(reader.result || "");
      const debtCandidates = extractDebtValues(rawText);
      const rateCandidates = extractInterestRates(rawText);
      resolve({ debtCandidates, rateCandidates });
    };

    reader.onerror = () => resolve({ debtCandidates: [], rateCandidates: [] });
    reader.readAsText(file);
  });
}

function extractDebtValues(text) {
  const values = [];
  const currencyPattern = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2}))/g;
  for (const match of text.matchAll(currencyPattern)) {
    const num = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num >= 100 && num <= 300000) {
      values.push(num);
    }
  }

  const topCandidates = [...new Set(values)].sort((a, b) => b - a).slice(0, 4);
  return topCandidates;
}

function extractInterestRates(text) {
  const values = [];
  const ratePattern = /(\d{1,2}(?:\.\d{1,2})?)\s?%/g;
  for (const match of text.matchAll(ratePattern)) {
    const rate = Number(match[1]);
    if (Number.isFinite(rate) && rate > 0 && rate < 35) {
      values.push(rate);
    }
  }
  return values;
}
