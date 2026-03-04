const signInForm = document.getElementById("signInForm");
const authMessage = document.getElementById("authMessage");
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tab-panel");
const landingScreen = document.getElementById("landingScreen");
const workspaceScreen = document.getElementById("workspaceScreen");

const debtForm = document.getElementById("debtForm");
const clearButton = document.getElementById("clearButton");
const results = document.getElementById("results");

const records = document.getElementById("records");
const currentDebt = document.getElementById("currentDebt");
const interestRate = document.getElementById("interestRate");
const monthsPastDue = document.getElementById("monthsPastDue");
const street = document.getElementById("street");
const city = document.getElementById("city");
const state = document.getElementById("state");
const zip = document.getElementById("zip");

const statusText = document.getElementById("statusText");
const breakdownText = document.getElementById("breakdownText");
const projectionText = document.getElementById("projectionText");
const optionsList = document.getElementById("optionsList");
const historyList = document.getElementById("historyList");
const dbStatus = document.getElementById("dbStatus");

const SUPABASE_URL = "https://pavuonaxerlpukbepcqs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uaZGfYFOdXp4neAxWAqIig_FDO1oEYF";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentUser = null;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function estimateFutureBalance(balance, annualRate, months) {
  const monthlyRate = annualRate / 100 / 12;
  return balance * Math.pow(1 + monthlyRate, months);
}

function deriveDebtStatus(monthsLate, totalDebt) {
  if (monthsLate < 1) {
    return { text: "Current or recently updated debt. Immediate planning recommended.", tone: "success" };
  }

  if (monthsLate <= 6) {
    return { text: "Past due. Account may be in internal collections; contact bursar office soon.", tone: "warning" };
  }

  if (monthsLate <= 12) {
    return { text: "Delinquent risk. Collection activity likely increasing; resolve quickly.", tone: "danger" };
  }

  if (totalDebt > 30000) {
    return { text: "Severe debt pressure with long delinquency. Prioritize formal settlement and legal aid.", tone: "danger" };
  }

  return { text: "Long-term delinquency. Escalation to external collections is likely.", tone: "danger" };
}

function setStatusTone(statusElement, tone) {
  const tones = {
    success: { bg: "#e9f8ee", border: "#b6dec4", color: "#226248" },
    warning: { bg: "#fff5e8", border: "#eecf9f", color: "#b0660f" },
    danger: { bg: "#fdeeee", border: "#e7b4b4", color: "#9b2f2f" },
  };

  const selectedTone = tones[tone] || tones.warning;
  statusElement.style.background = selectedTone.bg;
  statusElement.style.borderColor = selectedTone.border;
  statusElement.style.color = selectedTone.color;
}

function buildResolutionOptions(address, totalDebt, monthsLate) {
  const options = [
    "Request a college bursar repayment plan with reduced monthly installments.",
    "Ask for administrative holds review to release transcript access after first payment.",
    "Apply for hardship-based temporary payment pause with interest review.",
  ];

  if (monthsLate >= 12) {
    options.push("Request debt validation and negotiate a one-time settlement with collections.");
  }

  if (totalDebt >= 20000) {
    options.push("Schedule a nonprofit credit counseling session to compare refinance or consolidation paths.");
  }

  const stateMatch = address.match(/\b([A-Za-z]{2})\s*\d{5}?$/);
  if (stateMatch) {
    options.push(`Search ${stateMatch[1].toUpperCase()} state higher-education ombuds services for institutional debt dispute support.`);
  } else {
    options.push("Check your state attorney general consumer division for education debt dispute guidance.");
  }

  return options;
}

async function storeDebtRecord(payload) {
  if (!currentUser) {
    dbStatus.textContent = "Database status: Not saved - no authenticated user.";
    dbStatus.style.color = "#9b2f2f";
    return;
  }

  dbStatus.textContent = "Database status: Saving analysis...";
  dbStatus.style.color = "#5f6a6d";

  const { error } = await supabaseClient.from("user_debt_records").insert({
    user_id: currentUser.id,
    email: currentUser.email,
    address: payload.address,
    uploaded_file_name: payload.fileName,
    principal: payload.principal,
    annual_interest_rate: payload.annualRate,
    months_unpaid: payload.monthsLate,
    accrued_interest: payload.accruedInterest,
    total_estimated_debt: payload.totalDebt,
    projected_six_month: payload.sixMonthProjection,
    projected_twelve_month: payload.twelveMonthProjection,
    projected_twenty_four_month: payload.twentyFourMonthProjection,
    debt_status: payload.statusText,
  });

  if (error) {
    dbStatus.textContent =
      "Database status: Connection works, but save failed. Create table 'user_debt_records' or update column names.";
    dbStatus.style.color = "#9b2f2f";
    return;
  }

  dbStatus.textContent = "Database status: Analysis saved to Supabase.";
  dbStatus.style.color = "#226248";
}

async function loadDebtRecords() {
  if (!currentUser) {
    dbStatus.textContent = "Database status: Sign in first to load saved records.";
    dbStatus.style.color = "#9b2f2f";
    return;
  }

  dbStatus.textContent = "Database status: Loading saved records...";
  dbStatus.style.color = "#5f6a6d";

  const { data, error } = await supabaseClient
    .from("user_debt_records")
    .select("id, address, total_estimated_debt, debt_status, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    dbStatus.textContent = `Database status: Load failed: ${error.message}`;
    dbStatus.style.color = "#9b2f2f";
    return;
  }

  historyList.innerHTML = "";
  if (!data || data.length === 0) {
    historyList.innerHTML = "<li>No saved records found for this account.</li>";
    dbStatus.textContent = "Database status: Connected, but no records were returned.";
    dbStatus.style.color = "#b0660f";
    return;
  }

  data.forEach((record) => {
    const li = document.createElement("li");
    const dateLabel = record.created_at ? new Date(record.created_at).toLocaleString() : "No date";
    li.textContent = `${dateLabel} | ${record.address} | ${formatCurrency(Number(record.total_estimated_debt || 0))} | ${record.debt_status}`;
    historyList.appendChild(li);
  });

  dbStatus.textContent = `Database status: Loaded ${data.length} record(s) from Supabase.`;
  dbStatus.style.color = "#226248";
}

// Tab switching functionality
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.getAttribute("data-tab-target");
    
    // Remove active state from all tabs and panels
    tabs.forEach((t) => t.classList.remove("is-active"));
    tabPanels.forEach((panel) => {
      panel.classList.remove("is-active");
      panel.setAttribute("aria-hidden", "true");
    });
    
    // Add active state to clicked tab and its panel
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    const activePanel = document.getElementById(targetTab);
    if (activePanel) {
      activePanel.classList.add("is-active");
      activePanel.removeAttribute("aria-hidden");
    }
  });
});

// Sign-in form submission
signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const supabaseAnonKey = document.getElementById("supabaseAnonKey").value.trim();

  if (!email || !password || !supabaseAnonKey) {
    authMessage.textContent = "Enter email, password, and Supabase anon key to continue.";
    authMessage.style.color = "#9b2f2f";
    return;
  }

  if (password.length < 8) {
    authMessage.textContent = "Password must contain at least 8 characters.";
    authMessage.style.color = "#9b2f2f";
    return;
  }

  authMessage.textContent = "Signing in...";
  authMessage.style.color = "#5f6a6d";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    authMessage.textContent = `Sign-in failed: ${error.message}`;
    authMessage.style.color = "#9b2f2f";
    return;
  }

  currentUser = data.user;
  authMessage.textContent = "Sign-in successful. Loading workspace...";
  authMessage.style.color = "#226248";

  setTimeout(() => {
    landingScreen.classList.remove("panel--active");
    workspaceScreen.classList.add("panel--active");
    dbStatus.textContent = "Database status: connected.";
    dbStatus.style.color = "#226248";
    loadDebtRecords();
  }, 450);
});

// Debt form submission
debtForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const principal = Number(currentDebt.value);
  const annualRate = Number(interestRate.value);
  const monthsLate = Number(monthsPastDue.value);
  const address = `${street.value}, ${city.value}, ${state.value} ${zip.value}`.trim();
  const selectedFile = records.files[0];

  if (!address || Number.isNaN(principal) || Number.isNaN(annualRate) || Number.isNaN(monthsLate)) {
    authMessage.textContent = "Please fill in all required fields.";
    authMessage.style.color = "#9b2f2f";
    return;
  }

  const accruedInterest = estimateFutureBalance(principal, annualRate, monthsLate) - principal;
  const totalDebt = principal + accruedInterest;

  const status = deriveDebtStatus(monthsLate, totalDebt);
  
  const statusCard = results.querySelector(".result-card");
  setStatusTone(statusCard, status.tone);
  
  const sixMonthProjection = estimateFutureBalance(totalDebt, annualRate, 6);
  const twelveMonthProjection = estimateFutureBalance(totalDebt, annualRate, 12);
  const twentyFourMonthProjection = estimateFutureBalance(totalDebt, annualRate, 24);

  statusText.textContent = status.text;
  breakdownText.innerHTML = `
    <strong>Principal:</strong> ${formatCurrency(principal)}<br>
    <strong>Accrued Interest:</strong> ${formatCurrency(accruedInterest)}<br>
    <strong>Total Debt:</strong> ${formatCurrency(totalDebt)}<br>
    <strong>File:</strong> ${selectedFile ? selectedFile.name : "No file uploaded"}
  `;
  
  projectionText.innerHTML = `
    <strong>6 months:</strong> ${formatCurrency(sixMonthProjection)}<br>
    <strong>12 months:</strong> ${formatCurrency(twelveMonthProjection)}<br>
    <strong>24 months:</strong> ${formatCurrency(twentyFourMonthProjection)}
  `;

  optionsList.innerHTML = "";
  buildResolutionOptions(address, totalDebt, monthsLate).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    optionsList.appendChild(li);
  });

  results.style.display = "grid";

  await storeDebtRecord({
    address,
    fileName: selectedFile ? selectedFile.name : "No file uploaded",
    principal,
    annualRate,
    monthsLate,
    accruedInterest,
    totalDebt,
    sixMonthProjection,
    twelveMonthProjection,
    twentyFourMonthProjection,
    statusText: status.text,
  });
});

// Clear button functionality
clearButton.addEventListener("click", () => {
  debtForm.reset();
  optionsList.innerHTML = "";
  results.style.display = "none";
  statusText.textContent = "Run analysis to view debt status.";
  breakdownText.textContent = "No analysis yet.";
  projectionText.textContent = "No projection yet.";
  authMessage.textContent = "";
});
