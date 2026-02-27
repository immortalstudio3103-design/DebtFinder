const landingPanel = document.getElementById("landing");
const appPanel = document.getElementById("app");

const signinForm = document.getElementById("signinForm");
const signinMessage = document.getElementById("signinMessage");

const tabs = [...document.querySelectorAll(".tab")];
const tabContents = [...document.querySelectorAll(".tab-content")];

const documentsInput = document.getElementById("documents");
const debtAmountInput = document.getElementById("debtAmount");
const interestRateInput = document.getElementById("interestRate");
const startYearInput = document.getElementById("startYear");

const streetInput = document.getElementById("street");
const cityInput = document.getElementById("city");
const stateInput = document.getElementById("state");
const zipInput = document.getElementById("zip");

const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");

const statusEl = document.getElementById("status");
const breakdownEl = document.getElementById("breakdown");
const predictionsEl = document.getElementById("predictions");
const optionsEl = document.getElementById("options");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    tabs.forEach((btn) => {
      const selected = btn === tab;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-selected", String(selected));
    });

    tabContents.forEach((panel) => {
      panel.classList.toggle("active", panel.id === target);
    });
  });
});

signinForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    signinMessage.textContent = "Email and password are required.";
    return;
  }

  if (password.length < 8) {
    signinMessage.textContent = "Password must be at least 8 characters.";
    return;
  }

  signinMessage.textContent = "";
  landingPanel.classList.remove("active");
  appPanel.classList.add("active");
});

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildOptions(stateCode, debt, hasAddress) {
  const options = [
    "Request a written payoff statement from the college bursar or collections office.",
    "Ask about hardship-based repayment plans with reduced monthly minimums.",
    "Request debt validation details if the account has been transferred to collections.",
  ];

  if (debt >= 10000) {
    options.push("Review nonprofit credit counseling for settlement and repayment comparisons.");
  } else {
    options.push("Consider accelerated monthly payments to reduce long-term interest growth.");
  }

  if (hasAddress && stateCode) {
    options.push(`Search ${stateCode.toUpperCase()} state aid and legal aid programs for education debt support.`);
  } else {
    options.push("Add your address details to generate stronger location-based support options.");
  }

  return options;
}

analyzeBtn.addEventListener("click", () => {
  const debt = Number(debtAmountInput.value);
  const ratePercent = Number(interestRateInput.value);
  const rate = ratePercent / 100;
  const startYear = Number(startYearInput.value);
  const uploadedFileCount = documentsInput.files.length;

  if (!Number.isFinite(debt) || debt <= 0) {
    statusEl.textContent = "Enter a valid current debt amount to run analysis.";
    return;
  }

  if (!Number.isFinite(ratePercent) || ratePercent < 0) {
    statusEl.textContent = "Enter a valid annual interest rate.";
    return;
  }

  const yearlyInterest = debt * rate;
  const monthlyInterest = yearlyInterest / 12;
  const oneYear = debt * Math.pow(1 + rate, 1);
  const threeYears = debt * Math.pow(1 + rate, 3);
  const fiveYears = debt * Math.pow(1 + rate, 5);

  const currentYear = new Date().getFullYear();
  const debtAge = startYear ? Math.max(0, currentYear - startYear) : null;

  const debtStatus = ratePercent >= 9 ? "High growth risk" : ratePercent >= 5 ? "Moderate growth risk" : "Lower growth risk";
  statusEl.textContent =
    uploadedFileCount > 0
      ? `Analysis complete from ${uploadedFileCount} uploaded file(s). Status: ${debtStatus}.`
      : `Analysis complete from entered values. Status: ${debtStatus}.`;

  breakdownEl.innerHTML = "";
  predictionsEl.innerHTML = "";
  optionsEl.innerHTML = "";

  const breakdownLines = [
    `Current debt: ${formatCurrency(debt)}`,
    `Estimated yearly interest: ${formatCurrency(yearlyInterest)}`,
    `Estimated monthly interest: ${formatCurrency(monthlyInterest)}`,
    debtAge !== null ? `Approximate debt age: ${debtAge} year(s)` : "Debt age: Not provided",
  ];

  breakdownLines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    breakdownEl.appendChild(p);
  });

  const predictionLines = [
    `Projected after 1 year: ${formatCurrency(oneYear)}`,
    `Projected after 3 years: ${formatCurrency(threeYears)}`,
    `Projected after 5 years: ${formatCurrency(fiveYears)}`,
  ];

  predictionLines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    predictionsEl.appendChild(p);
  });

  const hasAddress = [streetInput.value, cityInput.value, stateInput.value, zipInput.value].some(
    (value) => value.trim() !== ""
  );

  buildOptions(stateInput.value.trim(), debt, hasAddress).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    optionsEl.appendChild(li);
  });
});

clearBtn.addEventListener("click", () => {
  documentsInput.value = "";
  debtAmountInput.value = "";
  interestRateInput.value = "";
  startYearInput.value = "";

  streetInput.value = "";
  cityInput.value = "";
  stateInput.value = "";
  zipInput.value = "";

  statusEl.textContent = "No analysis yet.";
  breakdownEl.innerHTML = "";
  predictionsEl.innerHTML = "";
  optionsEl.innerHTML = "";
});
