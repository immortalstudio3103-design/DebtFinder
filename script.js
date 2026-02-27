const landingPanel = document.getElementById("landing");
const dashboardPanel = document.getElementById("dashboard");
const signinForm = document.getElementById("signinForm");
const signinMessage = document.getElementById("signinMessage");
const signinButton = signinForm.querySelector("button[type='submit']");
const tabButtons = [...document.querySelectorAll(".tab-btn")];
const tabPanels = [...document.querySelectorAll(".tab-panel")];

const docUpload = document.getElementById("docUpload");
const currentDebtInput = document.getElementById("currentDebt");
const interestRateInput = document.getElementById("interestRate");
const startYearInput = document.getElementById("startYear");
const stateInput = document.getElementById("state");
const streetInput = document.getElementById("street");
const cityInput = document.getElementById("city");
const zipInput = document.getElementById("zip");

const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const statusText = document.getElementById("statusText");
const breakdown = document.getElementById("breakdown");
const predictions = document.getElementById("predictions");
const options = document.getElementById("options");

// Replace with your project's values from Supabase -> Settings -> API
const SUPABASE_URL = "https://pavuonaxerlpukbepcqs.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabaseClient =
  window.supabase && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.tab;
    tabButtons.forEach((btn) => {
      const selected = btn === button;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-selected", String(selected));
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === target);
    });
  });
});

function showDashboard() {
  landingPanel.classList.remove("active");
  dashboardPanel.classList.add("active");
}

async function checkExistingSession() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.getSession();
  if (!error && data.session) {
    showDashboard();
  }
}

checkExistingSession();

signinForm.addEventListener("submit", async (event) => {
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

  if (!supabaseClient) {
    signinMessage.textContent =
      "Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY in script.js.";
    return;
  }

  signinMessage.textContent = "Signing in...";
  signinButton.disabled = true;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  signinButton.disabled = false;

  if (error) {
    signinMessage.textContent = error.message || "Sign-in failed. Check your credentials and try again.";
    return;
  }

  signinMessage.textContent = "";
  showDashboard();
});

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function generateRecommendations(stateCode, debt, hasAddress) {
  const base = [
    "Contact your college bursar or collections office to request a payoff statement and written settlement terms.",
    "Ask for hardship-based payment plans with reduced monthly minimums or paused interest if available.",
    "Request debt validation in writing if your account has moved to collections.",
  ];

  if (debt > 10000) {
    base.push("Consider a nonprofit credit counselor to compare settlement vs. structured repayment options.");
  } else {
    base.push("A short-term repayment sprint may reduce total interest cost if you can pay above minimums.");
  }

  if (hasAddress && stateCode) {
    base.push(
      `Check ${stateCode.toUpperCase()} state aid, legal aid, and borrower-assistance programs for education-related debt support.`
    );
  } else {
    base.push("Add your address to receive better localized options and state-specific support programs.");
  }

  return base;
}

analyzeBtn.addEventListener("click", () => {
  const debt = Number(currentDebtInput.value);
  const rate = Number(interestRateInput.value) / 100;
  const startYear = Number(startYearInput.value);
  const fileCount = docUpload.files.length;
  const currentYear = new Date().getFullYear();
  const yearsElapsed = startYear ? Math.max(0, currentYear - startYear) : null;

  if (!Number.isFinite(debt) || debt <= 0) {
    statusText.textContent = "Add a valid current debt amount to run analysis.";
    return;
  }
  if (!Number.isFinite(rate) || rate < 0) {
    statusText.textContent = "Add a valid annual interest rate.";
    return;
  }

  const interestPerYear = debt * rate;
  const monthlyInterest = interestPerYear / 12;
  const oneYearProjection = debt * (1 + rate);
  const threeYearProjection = debt * Math.pow(1 + rate, 3);
  const fiveYearProjection = debt * Math.pow(1 + rate, 5);

  const riskLevel = rate >= 0.09 ? "High growth risk" : rate >= 0.05 ? "Moderate growth risk" : "Lower growth risk";
  const statusLine =
    fileCount > 0
      ? `Analysis complete from ${fileCount} uploaded file(s). Current status: ${riskLevel}.`
      : `Analysis complete using entered values. Current status: ${riskLevel}.`;
  statusText.textContent = statusLine;

  breakdown.innerHTML = "";
  predictions.innerHTML = "";
  options.innerHTML = "";

  const breakdownLines = [
    `Current debt: ${currency(debt)}`,
    `Estimated yearly interest: ${currency(interestPerYear)}`,
    `Estimated monthly interest: ${currency(monthlyInterest)}`,
    yearsElapsed !== null ? `Approximate debt age: ${yearsElapsed} year(s)` : "Debt age: Not provided",
  ];
  breakdownLines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    breakdown.appendChild(p);
  });

  const predictionLines = [
    `In 1 year: ${currency(oneYearProjection)}`,
    `In 3 years: ${currency(threeYearProjection)}`,
    `In 5 years: ${currency(fiveYearProjection)}`,
  ];
  predictionLines.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    predictions.appendChild(p);
  });

  const hasAddress = [streetInput.value, cityInput.value, stateInput.value, zipInput.value].some(
    (value) => value.trim() !== ""
  );
  const recs = generateRecommendations(stateInput.value.trim(), debt, hasAddress);
  recs.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    options.appendChild(li);
  });
});

clearBtn.addEventListener("click", () => {
  docUpload.value = "";
  currentDebtInput.value = "";
  interestRateInput.value = "";
  startYearInput.value = "";
  streetInput.value = "";
  cityInput.value = "";
  stateInput.value = "";
  zipInput.value = "";

  statusText.textContent = "No analysis yet.";
  breakdown.innerHTML = "";
  predictions.innerHTML = "";
  options.innerHTML = "";
});
