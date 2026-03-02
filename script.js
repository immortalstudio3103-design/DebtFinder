const landingScreen = document.getElementById("landingScreen");
const workspaceScreen = document.getElementById("workspaceScreen");
const signInForm = document.getElementById("signInForm");
const authMessage = document.getElementById("authMessage");
const debtForm = document.getElementById("debtForm");
const clearButton = document.getElementById("clearButton");

const statusText = document.getElementById("statusText");
const breakdownText = document.getElementById("breakdownText");
const projectionText = document.getElementById("projectionText");
const optionsList = document.getElementById("optionsList");

setupTabs();

signInForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!isValidEmail(email) || password.length < 8) {
    authMessage.classList.add("error");
    authMessage.textContent = "Enter a valid email and a password with at least 8 characters.";
    return;
  }

  authMessage.classList.remove("error");
  authMessage.textContent = "";
  landingScreen.classList.remove("panel--active");
  workspaceScreen.classList.add("panel--active");
});

debtForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const files = Array.from(document.getElementById("records").files || []);
  const documentText = await readSupportedFiles(files);
  const extracted = extractDebtSignals(documentText);

  const currentDebtInput = Number(document.getElementById("currentDebt").value);
  const interestRateInput = Number(document.getElementById("interestRate").value);
  const monthsPastDueInput = Number(document.getElementById("monthsPastDue").value);

  const debt = normalizeNumber(currentDebtInput, extracted.principal);
  const annualRate = normalizeNumber(interestRateInput, extracted.rate);
  const monthsPastDue = Number.isFinite(monthsPastDueInput) ? monthsPastDueInput : 0;

  if (!Number.isFinite(debt) || debt <= 0) {
    statusText.textContent = "Add a debt amount manually or upload a text-based document with amount details.";
    breakdownText.textContent = "No valid debt amount available.";
    projectionText.textContent = "No projection generated.";
    optionsList.innerHTML = "<li>Provide a debt amount to generate recommendations.</li>";
    return;
  }

  const status = classifyDebtStatus(debt, monthsPastDue);
  const oneYear = futureDebt(debt, annualRate, 12);
  const threeYear = futureDebt(debt, annualRate, 36);
  const fiveYear = futureDebt(debt, annualRate, 60);

  statusText.textContent = `${status.label}: ${status.summary}`;
  breakdownText.textContent = `Current debt: ${formatCurrency(debt)}. Annual interest: ${annualRate.toFixed(
    2
  )}%. Months past due: ${monthsPastDue}.`;
  projectionText.textContent = `If unpaid and interest continues, estimated debt may reach ${formatCurrency(
    oneYear
  )} in 1 year, ${formatCurrency(threeYear)} in 3 years, and ${formatCurrency(fiveYear)} in 5 years.`;

  const state = document.getElementById("state").value.trim().toUpperCase();
  const city = document.getElementById("city").value.trim();
  const options = buildResolutionOptions({ debt, status: status.label, state, city, annualRate });
  optionsList.innerHTML = options.map((item) => `<li>${item}</li>`).join("");
});

clearButton.addEventListener("click", () => {
  debtForm.reset();
  statusText.textContent = "Run analysis to view debt status.";
  breakdownText.textContent = "No analysis yet.";
  projectionText.textContent = "No projection yet.";
  optionsList.innerHTML = "<li>Add your data and run analysis to generate options.</li>";
});

function setupTabs() {
  const tabButtons = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tabTarget;
      tabButtons.forEach((tab) => {
        tab.classList.remove("is-active");
        tab.setAttribute("aria-selected", "false");
      });
      panels.forEach((panel) => {
        panel.classList.remove("is-active");
        panel.setAttribute("aria-hidden", "true");
      });

      button.classList.add("is-active");
      button.setAttribute("aria-selected", "true");
      const activePanel = document.getElementById(target);
      activePanel.classList.add("is-active");
      activePanel.setAttribute("aria-hidden", "false");
    });
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readSupportedFiles(files) {
  const textFiles = files.filter((file) => /\.(txt|csv)$/i.test(file.name));
  const reads = textFiles.map((file) => file.text().catch(() => ""));
  const chunks = await Promise.all(reads);
  return chunks.join("\n");
}

function extractDebtSignals(text) {
  if (!text) return { principal: NaN, rate: NaN };

  const numberMatches = [...text.matchAll(/(?:\$|USD\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((num) => Number.isFinite(num) && num >= 100);

  const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const rate = rateMatch ? Number(rateMatch[1]) : NaN;

  return {
    principal: numberMatches.length ? Math.max(...numberMatches) : NaN,
    rate,
  };
}

function normalizeNumber(primary, fallback) {
  if (Number.isFinite(primary) && primary > 0) return primary;
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return NaN;
}

function classifyDebtStatus(debt, monthsPastDue) {
  if (monthsPastDue >= 6 || debt >= 25000) {
    return {
      label: "High Risk",
      summary: "Debt burden is elevated and likely to escalate without intervention.",
    };
  }
  if (monthsPastDue >= 3 || debt >= 10000) {
    return {
      label: "Moderate Risk",
      summary: "Debt is manageable but should be addressed soon to limit growth.",
    };
  }
  return {
    label: "Early Stage",
    summary: "Debt is still in an early state and can be stabilized with a short plan.",
  };
}

function futureDebt(principal, annualRate, months) {
  const rate = Math.max(annualRate, 0) / 100 / 12;
  return principal * (1 + rate) ** months;
}

function buildResolutionOptions({ debt, status, state, city, annualRate }) {
  const options = [];

  if (status === "High Risk") {
    options.push("Contact your school bursar and request a written settlement or hardship review plan.");
    options.push("Ask for a paused collections window while you submit income or hardship documents.");
  } else {
    options.push("Request a structured monthly repayment plan directly from your institution.");
  }

  if (annualRate >= 8) {
    options.push("Prioritize refinancing checks to reduce interest and slow long-term growth.");
  }

  if (debt >= 20000) {
    options.push("Consider nonprofit credit counseling for debt restructuring support.");
  }

  if (state) {
    options.push(`Search for state-level education debt relief programs in ${state} and verify eligibility.`);
  } else {
    options.push("Add your state to get location-specific debt relief program prompts.");
  }

  if (city) {
    options.push(`Check legal-aid or financial empowerment offices near ${city} for debt negotiation resources.`);
  }

  options.push("Keep all communication in writing and store payment/settlement confirmations.");
  return options;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
