const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const landingView = document.getElementById("landingView");
const dashboardView = document.getElementById("dashboardView");
const syncMessage = document.getElementById("syncMessage");

const debtForm = document.getElementById("debtForm");
const clearBtn = document.getElementById("clearBtn");
const loadRecordsBtn = document.getElementById("loadRecordsBtn");
const results = document.getElementById("results");

const fileUpload = document.getElementById("fileUpload");
const addressInput = document.getElementById("address");
const principalInput = document.getElementById("principal");
const interestRateInput = document.getElementById("interestRate");
const monthsLateInput = document.getElementById("monthsLate");

const fileNameResult = document.getElementById("fileNameResult");
const principalResult = document.getElementById("principalResult");
const interestResult = document.getElementById("interestResult");
const totalResult = document.getElementById("totalResult");
const statusResult = document.getElementById("statusResult");
const sixMonthResult = document.getElementById("sixMonthResult");
const twelveMonthResult = document.getElementById("twelveMonthResult");
const twentyFourMonthResult = document.getElementById("twentyFourMonthResult");
const locationSummary = document.getElementById("locationSummary");
const optionsList = document.getElementById("optionsList");
const recordsSummary = document.getElementById("recordsSummary");
const savedRecordsList = document.getElementById("savedRecordsList");

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

function setStatusTone(tone) {
  const tones = {
    success: { bg: "#e9f8ee", border: "#b6dec4", color: "#226248" },
    warning: { bg: "#fff5e8", border: "#eecf9f", color: "#b0660f" },
    danger: { bg: "#fdeeee", border: "#e7b4b4", color: "#9b2f2f" },
  };

  const selectedTone = tones[tone] || tones.warning;
  statusResult.style.background = selectedTone.bg;
  statusResult.style.borderColor = selectedTone.border;
  statusResult.style.color = selectedTone.color;
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
    syncMessage.textContent = "Not saved: no authenticated user.";
    syncMessage.style.color = "#9b2f2f";
    return;
  }

  syncMessage.textContent = "Saving analysis to database...";
  syncMessage.style.color = "#5f6a6d";

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
    syncMessage.textContent =
      "Database connection works, but save failed. Create table 'user_debt_records' or update column names.";
    syncMessage.style.color = "#9b2f2f";
    return;
  }

  syncMessage.textContent = "Analysis saved to Supabase.";
  syncMessage.style.color = "#226248";
}

async function loadDebtRecords() {
  if (!currentUser) {
    syncMessage.textContent = "Sign in first to load saved records.";
    syncMessage.style.color = "#9b2f2f";
    return;
  }

  syncMessage.textContent = "Loading saved records...";
  syncMessage.style.color = "#5f6a6d";

  const { data, error } = await supabaseClient
    .from("user_debt_records")
    .select("id, address, total_estimated_debt, debt_status, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    syncMessage.textContent = `Load failed: ${error.message}`;
    syncMessage.style.color = "#9b2f2f";
    return;
  }

  savedRecordsList.innerHTML = "";
  if (!data || data.length === 0) {
    recordsSummary.textContent = "No saved records found for this account.";
    syncMessage.textContent = "Connected, but no records were returned.";
    syncMessage.style.color = "#b0660f";
    return;
  }

  recordsSummary.textContent = `Showing ${data.length} most recent saved record(s).`;
  data.forEach((record) => {
    const li = document.createElement("li");
    const dateLabel = record.created_at ? new Date(record.created_at).toLocaleString() : "No date";
    li.textContent = `${dateLabel} | ${record.address} | ${formatCurrency(Number(record.total_estimated_debt || 0))} | ${record.debt_status}`;
    savedRecordsList.appendChild(li);
  });

  syncMessage.textContent = "Saved records loaded from Supabase.";
  syncMessage.style.color = "#226248";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    loginMessage.textContent = "Enter both email and password to continue.";
    return;
  }

  if (password.length < 6) {
    loginMessage.textContent = "Password must contain at least 6 characters.";
    return;
  }

  loginMessage.textContent = "Signing in...";
  loginMessage.style.color = "#5f6a6d";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginMessage.textContent = `Sign-in failed: ${error.message}`;
    loginMessage.style.color = "#9b2f2f";
    return;
  }

  currentUser = data.user;
  loginMessage.textContent = "Sign-in successful. Loading dashboard...";
  loginMessage.style.color = "#226248";

  setTimeout(() => {
    landingView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
  }, 450);
});

debtForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const principal = Number(principalInput.value);
  const annualRate = Number(interestRateInput.value);
  const monthsLate = Number(monthsLateInput.value);
  const address = addressInput.value.trim();
  const selectedFile = fileUpload.files[0];

  if (!address || Number.isNaN(principal) || Number.isNaN(annualRate) || Number.isNaN(monthsLate)) {
    return;
  }

  const accruedInterest = estimateFutureBalance(principal, annualRate, monthsLate) - principal;
  const totalDebt = principal + accruedInterest;

  const status = deriveDebtStatus(monthsLate, totalDebt);
  setStatusTone(status.tone);
  const sixMonthProjection = estimateFutureBalance(totalDebt, annualRate, 6);
  const twelveMonthProjection = estimateFutureBalance(totalDebt, annualRate, 12);
  const twentyFourMonthProjection = estimateFutureBalance(totalDebt, annualRate, 24);

  fileNameResult.textContent = selectedFile ? selectedFile.name : "No file uploaded";
  principalResult.textContent = formatCurrency(principal);
  interestResult.textContent = formatCurrency(accruedInterest);
  totalResult.textContent = formatCurrency(totalDebt);
  statusResult.textContent = status.text;

  sixMonthResult.textContent = formatCurrency(sixMonthProjection);
  twelveMonthResult.textContent = formatCurrency(twelveMonthProjection);
  twentyFourMonthResult.textContent = formatCurrency(twentyFourMonthProjection);

  locationSummary.textContent = `Based on your address (${address}), these options may help eliminate, mitigate, or resolve this debt.`;
  optionsList.innerHTML = "";
  buildResolutionOptions(address, totalDebt, monthsLate).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    optionsList.appendChild(li);
  });

  results.classList.remove("hidden");

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

loadRecordsBtn.addEventListener("click", async () => {
  await loadDebtRecords();
});

clearBtn.addEventListener("click", () => {
  debtForm.reset();
  optionsList.innerHTML = "";
  savedRecordsList.innerHTML = "";
  results.classList.add("hidden");

  fileNameResult.textContent = "None";
  principalResult.textContent = "$0.00";
  interestResult.textContent = "$0.00";
  totalResult.textContent = "$0.00";
  statusResult.textContent = "No analysis yet.";
  sixMonthResult.textContent = "$0.00";
  twelveMonthResult.textContent = "$0.00";
  twentyFourMonthResult.textContent = "$0.00";
  locationSummary.textContent = "";
  recordsSummary.textContent = 'Click "Load Saved Records" to read entries from Supabase.';
  syncMessage.textContent = "";

  setStatusTone("warning");
});
