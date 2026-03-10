const landingScreen = document.getElementById("landingScreen");
const dashboardScreen = document.getElementById("dashboardScreen");

const signupTab = document.getElementById("signupTab");
const loginTab = document.getElementById("loginTab");
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");

const authMessage = document.getElementById("authMessage");
const signupError = document.getElementById("signupError");
const loginError = document.getElementById("loginError");

const docUpload = document.getElementById("docUpload");
const manualDebt = document.getElementById("manualDebt");
const manualInterest = document.getElementById("manualInterest");
const manualLockHint = document.getElementById("manualLockHint");
const analyzeBtn = document.getElementById("analyzeBtn");
const uploadFeedback = document.getElementById("uploadFeedback");
const fileQueue = document.getElementById("fileQueue");
const analysisMeta = document.getElementById("analysisMeta");
const dbStatus = document.getElementById("dbStatus");

const totalDebtEl = document.getElementById("totalDebt");
const interestRateEl = document.getElementById("interestRate");
const debtStatusEl = document.getElementById("debtStatus");
const debtBreakdownEl = document.getElementById("debtBreakdown");
const predictionTableBody = document.getElementById("predictionTableBody");

const collegeInput = document.getElementById("collegeInput");
const addressInput = document.getElementById("addressInput");
const resolveBtn = document.getElementById("resolveBtn");
const resolutionList = document.getElementById("resolutionList");
const clearBtn = document.getElementById("clearBtn");
const logoutBtn = document.getElementById("logoutBtn");

let parsedDebt = 0;
let parsedInterest = 0;
let analyzedDebt = 0;
let analyzedInterest = 0;

const SUPPORTED_EXTENSIONS = [".txt", ".csv", ".json", ".md"];

const SUPABASE_URL = "https://pavuonaxerlpukbepcqs.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_uaZGfYFOdXp4neAxWAqIig_FDO1oEYF";

const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") &&
  !SUPABASE_URL.includes("REPLACE_WITH") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes("REPLACE_WITH");

const supabaseClient = isSupabaseConfigured
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

function monthlyCompound(principal, annualRate, months) {
  const monthlyRate = annualRate / 100 / 12;
  return principal * Math.pow(1 + monthlyRate, months);
}

function getDebtStatus(debt, rate) {
  if (debt <= 0) return "No Active Balance";
  if (debt < 2000 && rate <= 5) return "Low Risk";
  if (debt < 7000 || rate <= 9) return "Moderate";
  return "High Urgency";
}

function setDbStatus(text) {
  dbStatus.textContent = text;
}

function updatePredictionTable(debt, rate) {
  const months = [12, 24, 36];
  predictionTableBody.innerHTML = "";

  months.forEach((m) => {
    const projected = debt > 0 ? monthlyCompound(debt, rate, m) : 0;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${m} months</td><td>${formatCurrency(projected)}</td>`;
    predictionTableBody.appendChild(row);
  });
}

function getPredictionRows(debt, rate) {
  const months = [12, 24, 36];
  return months.map((m) => ({
    months_ahead: m,
    projected_amount: Number(monthlyCompound(debt, rate, m).toFixed(2)),
  }));
}

function extractNumbersFromText(text) {
  const dollarMatches = [...text.matchAll(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g)];
  const percentMatches = [...text.matchAll(/([0-9]+(?:\.[0-9]+)?)\s*%/g)];

  const dollarValues = dollarMatches
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  let inferredDebt = 0;
  if (dollarValues.length > 0) {
    inferredDebt = Math.max(...dollarValues);
  }

  let inferredInterest = 0;
  if (percentMatches.length > 0) {
    inferredInterest = Math.max(...percentMatches.map((m) => Number(m[1])));
  }

  return { inferredDebt, inferredInterest };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsText(file);
  });
}

function showSignupForm() {
  signupTab.classList.add("active");
  signupTab.setAttribute("aria-selected", "true");
  loginTab.classList.remove("active");
  loginTab.setAttribute("aria-selected", "false");

  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
}

function showLoginForm() {
  signupTab.classList.remove("active");
  signupTab.setAttribute("aria-selected", "false");
  loginTab.classList.add("active");
  loginTab.setAttribute("aria-selected", "true");

  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
}

function setAuthState(isAuthed) {
  if (isAuthed) {
    landingScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");
  } else {
    dashboardScreen.classList.add("hidden");
    landingScreen.classList.remove("hidden");
  }
}

function setManualInputsEnabled(enabled) {
  manualDebt.disabled = !enabled;
  manualInterest.disabled = !enabled;
  analyzeBtn.disabled = !enabled;

  if (!enabled) {
    manualDebt.value = "";
    manualInterest.value = "";
    manualLockHint.textContent = "Upload at least one document to unlock manual debt and interest entry.";
  } else {
    manualLockHint.textContent = "Manual fields unlocked. You can now refine detected debt and interest values.";
  }
}

function resetAnalysisUI() {
  parsedDebt = 0;
  parsedInterest = 0;
  analyzedDebt = 0;
  analyzedInterest = 0;

  totalDebtEl.textContent = "$0.00";
  interestRateEl.textContent = "0.00%";
  debtStatusEl.textContent = "No Data";
  debtBreakdownEl.textContent = "Upload files or enter values manually, then click Analyze Debt.";
  uploadFeedback.textContent = "";
  fileQueue.textContent = "No files selected.";
  analysisMeta.textContent = "No analysis run yet.";
  setManualInputsEnabled(false);
  updatePredictionTable(0, 0);

  resolutionList.innerHTML = "<li>Add your address and run analysis to see options.</li>";
}

function updateFileQueueLabel() {
  const files = Array.from(docUpload.files || []);
  if (files.length === 0) {
    fileQueue.textContent = "No files selected.";
    setManualInputsEnabled(false);
    return;
  }

  setManualInputsEnabled(true);
  const names = files.slice(0, 2).map((f) => f.name);
  const remainder = files.length > 2 ? ` +${files.length - 2} more` : "";
  fileQueue.textContent = `Selected: ${names.join(", ")}${remainder}`;
}

function buildResolutionOptions(address, debt, rate, collegeName) {
  const options = [];
  const normalizedAddress = address.toLowerCase();
  const normalizedCollege = collegeName.toLowerCase();

  if (normalizedCollege.includes("community")) {
    options.push(`For ${collegeName}, ask about community-college installment contracts and hardship review processes.`);
  } else if (normalizedCollege.includes("state") || normalizedCollege.includes("university")) {
    options.push(`For ${collegeName}, request a bursar escalation review and ask for institution-level fee and hold exceptions.`);
  } else if (
    normalizedCollege.includes("phoenix") ||
    normalizedCollege.includes("devry") ||
    normalizedCollege.includes("kaplan") ||
    normalizedCollege.includes("strayer")
  ) {
    options.push(`For ${collegeName}, review borrower-defense and private-institution dispute pathways before repayment negotiation.`);
  } else {
    options.push(`Contact the bursar at ${collegeName} and request an itemized ledger plus available repayment and settlement programs.`);
  }

  options.push("Request a full account statement from your college bursar to confirm principal, fees, and interest start date.");
  options.push("Ask the school about hardship plans or settlement discounts for alumni with unpaid balances.");

  if (debt > 7000 || rate > 9) {
    options.push("Prioritize negotiating interest reduction first, then set a structured monthly repayment plan in writing.");
  } else {
    options.push("Test a short-term payoff offer and request fee waivers in exchange for consistent payments.");
  }

  if (normalizedAddress.includes("ca") || normalizedAddress.includes("california")) {
    options.push("Check California student borrower and consumer legal aid resources for debt dispute support.");
  } else if (normalizedAddress.includes("ny") || normalizedAddress.includes("new york")) {
    options.push("Review New York state consumer protection channels for school debt collection issues.");
  } else if (normalizedAddress.includes("tx") || normalizedAddress.includes("texas")) {
    options.push("Contact Texas legal aid for debt validation and repayment-negotiation guidance.");
  } else {
    options.push("Contact your state consumer protection office for debt validation and collection-rights guidance.");
  }

  options.push("If this debt blocks transcript access, request a transcript hold release policy review with your institution.");
  return options;
}

async function ensureProfile(user) {
  if (!supabaseClient || !user) return;
  await supabaseClient.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
    },
    {
      onConflict: "id",
    }
  );
}

async function saveAnalysisToSupabase() {
  if (!supabaseClient) {
    setDbStatus("Supabase not configured. Update URL and anon key in script.js.");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    setDbStatus("Could not save: no active authenticated user session.");
    return;
  }

  const { data: debtRow, error: debtInsertError } = await supabaseClient
    .from("debt_records")
    .insert({
      user_id: user.id,
      college_name: collegeInput.value.trim() || null,
      address: addressInput.value.trim() || null,
      debt_amount: Number(analyzedDebt.toFixed(2)),
      interest_rate: Number(analyzedInterest.toFixed(2)),
      debt_status: debtStatusEl.textContent,
    })
    .select("id")
    .single();

  if (debtInsertError) {
    setDbStatus(`Debt save failed: ${debtInsertError.message}`);
    return;
  }

  const predictionRows = getPredictionRows(analyzedDebt, analyzedInterest).map((row) => ({
    debt_record_id: debtRow.id,
    months_ahead: row.months_ahead,
    projected_amount: row.projected_amount,
  }));

  const { error: predictionError } = await supabaseClient.from("debt_predictions").insert(predictionRows);

  if (predictionError) {
    setDbStatus(`Debt saved, prediction save failed: ${predictionError.message}`);
    return;
  }

  setDbStatus(`Saved to Supabase at ${new Date().toLocaleString()}.`);
}

signupTab.addEventListener("click", () => {
  signupError.textContent = "";
  loginError.textContent = "";
  authMessage.textContent = "";
  showSignupForm();
});

loginTab.addEventListener("click", () => {
  signupError.textContent = "";
  loginError.textContent = "";
  authMessage.textContent = "";
  showLoginForm();
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  signupError.textContent = "";
  authMessage.textContent = "";

  if (!supabaseClient) {
    signupError.textContent = "Supabase is not configured yet. Update URL and anon key in script.js.";
    return;
  }

  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailValid) {
    signupError.textContent = "Enter a valid email address.";
    return;
  }

  if (password.length < 6) {
    signupError.textContent = "Password must be at least 6 characters.";
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });

  if (error) {
    signupError.textContent = error.message;
    return;
  }

  authMessage.textContent = "Sign-up successful. Check your email and click the verification link, then use Log In.";
  showLoginForm();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  if (!supabaseClient) {
    loginError.textContent = "Supabase is not configured yet. Update URL and anon key in script.js.";
    return;
  }

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  await ensureProfile(data.user);
  setAuthState(true);
});

analyzeBtn.addEventListener("click", async () => {
  const files = Array.from(docUpload.files || []);

  if (files.length === 0) {
    uploadFeedback.textContent = "Upload at least one supported document first.";
    return;
  }

  const manualDebtValue = Number(manualDebt.value) || 0;
  const manualInterestValue = Number(manualInterest.value) || 0;

  parsedDebt = 0;
  parsedInterest = 0;
  uploadFeedback.textContent = "";

  let unsupportedCount = 0;

  for (const file of files) {
    const lower = file.name.toLowerCase();
    const supported = SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!supported) {
      unsupportedCount += 1;
      continue;
    }

    try {
      const text = await readFileAsText(file);
      const found = extractNumbersFromText(text);
      parsedDebt = Math.max(parsedDebt, found.inferredDebt);
      parsedInterest = Math.max(parsedInterest, found.inferredInterest);
    } catch (error) {
      uploadFeedback.textContent = error.message;
    }
  }

  if (unsupportedCount > 0) {
    uploadFeedback.textContent = `${unsupportedCount} file(s) skipped. For best results, upload .txt, .csv, .json, or .md files.`;
  } else if (!uploadFeedback.textContent) {
    uploadFeedback.textContent = "Documents processed.";
  }

  const usingManualDebt = manualDebtValue > 0;
  const usingManualInterest = manualInterestValue > 0;

  analyzedDebt = usingManualDebt ? manualDebtValue : parsedDebt;
  analyzedInterest = usingManualInterest ? manualInterestValue : parsedInterest;

  if (analyzedDebt <= 0) {
    debtBreakdownEl.textContent = "No debt amount detected in the uploaded files. Enter values in manual fields to proceed.";
    totalDebtEl.textContent = "$0.00";
    interestRateEl.textContent = formatPercent(0);
    debtStatusEl.textContent = "No Data";
    updatePredictionTable(0, 0);
    return;
  }

  if (analyzedInterest <= 0) {
    analyzedInterest = 5;
  }

  const oneYear = monthlyCompound(analyzedDebt, analyzedInterest, 12);
  const projectedIncrease = oneYear - analyzedDebt;

  totalDebtEl.textContent = formatCurrency(analyzedDebt);
  interestRateEl.textContent = formatPercent(analyzedInterest);
  debtStatusEl.textContent = getDebtStatus(analyzedDebt, analyzedInterest);
  debtBreakdownEl.textContent = `Current balance is ${formatCurrency(analyzedDebt)} at ${formatPercent(analyzedInterest)} APR. If unpaid, it could grow by about ${formatCurrency(projectedIncrease)} in 12 months.`;

  const sourceSummary = usingManualDebt || usingManualInterest ? "manual input (with uploaded docs as backup)" : "uploaded document parsing";
  analysisMeta.textContent = `Last analysis: ${new Date().toLocaleString()} | Source: ${sourceSummary}`;

  updatePredictionTable(analyzedDebt, analyzedInterest);
  await saveAnalysisToSupabase();
});

resolveBtn.addEventListener("click", () => {
  const college = collegeInput.value.trim();
  const address = addressInput.value.trim();

  if (!college) {
    resolutionList.innerHTML = "<li>Enter your college name to generate school-specific options.</li>";
    return;
  }

  if (!address) {
    resolutionList.innerHTML = "<li>Enter an address to generate location-aware resolution options.</li>";
    return;
  }

  if (analyzedDebt <= 0) {
    resolutionList.innerHTML = "<li>Analyze debt first, then generate resolution options.</li>";
    return;
  }

  const options = buildResolutionOptions(address, analyzedDebt, analyzedInterest, college);
  resolutionList.innerHTML = options.map((item) => `<li>${item}</li>`).join("");
});

clearBtn.addEventListener("click", () => {
  docUpload.value = "";
  manualDebt.value = "";
  manualInterest.value = "";
  collegeInput.value = "";
  addressInput.value = "";
  resetAnalysisUI();
});

logoutBtn.addEventListener("click", async () => {
  if (!supabaseClient) {
    setAuthState(false);
    return;
  }
  await supabaseClient.auth.signOut();
  setAuthState(false);
  showLoginForm();
});

docUpload.addEventListener("change", () => {
  updateFileQueueLabel();
  uploadFeedback.textContent = "";
});

async function initializeAuth() {
  if (!supabaseClient) {
    setDbStatus("Supabase not configured. Add URL and anon key in script.js.");
    setAuthState(false);
    showSignupForm();
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session?.user) {
    await ensureProfile(session.user);
    setAuthState(true);
    setDbStatus(`Connected to Supabase as ${session.user.email}.`);
  } else {
    setAuthState(false);
    showSignupForm();
    setDbStatus("Connected to Supabase. Sign up or log in to continue.");
  }

  supabaseClient.auth.onAuthStateChange(async (_event, sessionData) => {
    if (sessionData?.user) {
      await ensureProfile(sessionData.user);
      setAuthState(true);
      setDbStatus(`Connected to Supabase as ${sessionData.user.email}.`);
    } else {
      setAuthState(false);
      showLoginForm();
      setDbStatus("Signed out.");
    }
  });
}

updatePredictionTable(0, 0);
updateFileQueueLabel();
initializeAuth();
