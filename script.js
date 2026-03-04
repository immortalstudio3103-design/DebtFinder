const SUPABASE_URL = "https://pavuonaxerlpukbepcqs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uaZGfYFOdXp4neAxWAqIig_FDO1oEYF";
const SUPABASE_TABLE = "debt_analysis_records";

const landingScreen = document.getElementById("landingScreen");
const workspaceScreen = document.getElementById("workspaceScreen");

const authTabSignIn = document.getElementById("authTabSignIn");
const authTabSignUp = document.getElementById("authTabSignUp");
const signInPane = document.getElementById("signInPane");
const signUpPane = document.getElementById("signUpPane");

const signInEmailInput = document.getElementById("signInEmail");
const signInPasswordInput = document.getElementById("signInPassword");
const signUpEmailInput = document.getElementById("signUpEmail");
const signUpPasswordInput = document.getElementById("signUpPassword");
const signUpConfirmPasswordInput = document.getElementById("signUpConfirmPassword");

const signInButton = document.getElementById("signInButton");
const signUpButton = document.getElementById("signUpButton");
const signOutButton = document.getElementById("signOutButton");
const authMessage = document.getElementById("authMessage");
const activeUser = document.getElementById("activeUser");

const clearButton = document.getElementById("clearButton");
const documentInput = document.getElementById("documentInput");
const uploadMessage = document.getElementById("uploadMessage");
const detectedTerms = document.getElementById("detectedTerms");
const debtAmountInput = document.getElementById("debtAmount");
const interestRateInput = document.getElementById("interestRate");
const addressInput = document.getElementById("addressInput");
const analyzeButton = document.getElementById("analyzeButton");

const metricDebt = document.getElementById("metricDebt");
const metricStatus = document.getElementById("metricStatus");
const metricGrowth = document.getElementById("metricGrowth");
const metricFiles = document.getElementById("metricFiles");

const forecastAssumption = document.getElementById("forecastAssumption");
const forecastTableWrap = document.getElementById("forecastTableWrap");
const forecastBars = document.getElementById("forecastBars");
const resolutionList = document.getElementById("resolutionList");

const appState = {
  filesParsed: 0,
  extractedDebt: 0,
  extractedRate: 0,
  detectedStatus: "",
  foundTerms: [],
  currentUser: null,
};

const supabaseClient = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;

init();

function init() {
  setAuthTab("signin");
  syncScreenState();
  bindEvents();
  initAuth();
}

function bindEvents() {
  authTabSignIn?.addEventListener("click", () => setAuthTab("signin"));
  authTabSignUp?.addEventListener("click", () => setAuthTab("signup"));

  signInButton?.addEventListener("click", onSignIn);
  signUpButton?.addEventListener("click", onSignUp);
  signOutButton?.addEventListener("click", onSignOut);

  signInEmailInput?.addEventListener("keydown", onSignInEnter);
  signInPasswordInput?.addEventListener("keydown", onSignInEnter);
  signUpEmailInput?.addEventListener("keydown", onSignUpEnter);
  signUpPasswordInput?.addEventListener("keydown", onSignUpEnter);
  signUpConfirmPasswordInput?.addEventListener("keydown", onSignUpEnter);

  documentInput?.addEventListener("change", onDocumentsSelected);
  analyzeButton?.addEventListener("click", onAnalyze);
  clearButton?.addEventListener("click", onClear);
}

function onSignInEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onSignIn();
  }
}

function onSignUpEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    onSignUp();
  }
}

function setAuthTab(tab) {
  const isSignIn = tab === "signin";

  authTabSignIn?.classList.toggle("is-active", isSignIn);
  authTabSignUp?.classList.toggle("is-active", !isSignIn);
  authTabSignIn?.setAttribute("aria-selected", isSignIn ? "true" : "false");
  authTabSignUp?.setAttribute("aria-selected", isSignIn ? "false" : "true");

  signInPane?.classList.toggle("is-active", isSignIn);
  signUpPane?.classList.toggle("is-active", !isSignIn);
}

function setCurrentUser(user) {
  appState.currentUser = user;
  syncScreenState();
}

function syncScreenState() {
  if (!landingScreen || !workspaceScreen) return;

  if (appState.currentUser) {
    landingScreen.classList.remove("is-active");
    workspaceScreen.classList.add("is-active");
  } else {
    workspaceScreen.classList.remove("is-active");
    landingScreen.classList.add("is-active");
  }

  updateUserBadge();
}

async function initAuth() {
  if (!supabaseClient) {
    setAuthMessage("Authentication is unavailable right now. Please reload and try again.", true);
    return;
  }

  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    const user = session?.user || null;
    if (user) {
      if (isEmailVerified(user)) {
        setCurrentUser({ id: user.id, email: user.email || "" });
      } else {
        await supabaseClient.auth.signOut();
        setCurrentUser(null);
        setAuthMessage("Verify your email first, then sign in.", true);
      }
    }
  } catch {
    setAuthMessage("Could not restore session. Please sign in.", true);
  }

  supabaseClient.auth.onAuthStateChange(async (_event, sessionData) => {
    const user = sessionData?.user || null;

    if (!user) {
      setCurrentUser(null);
      return;
    }

    if (!isEmailVerified(user)) {
      await supabaseClient.auth.signOut();
      setCurrentUser(null);
      setAuthMessage("Email verification required. Check your inbox and then sign in.", true);
      return;
    }

    setCurrentUser({ id: user.id, email: user.email || "" });
  });
}

async function onSignIn() {
  const email = signInEmailInput?.value.trim() || "";
  const password = signInPasswordInput?.value || "";

  if (!validCredentials(email, password)) return;
  if (!supabaseClient) {
    setAuthMessage("Authentication service unavailable. Try again in a moment.", true);
    return;
  }

  setAuthMessage("Signing in...");

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  if (!isEmailVerified(data?.user)) {
    await supabaseClient.auth.signOut();
    setAuthMessage("Email not verified. Open your verification email, then sign in again.", true);
    return;
  }

  setCurrentUser({ id: data.user.id, email: data.user.email || email });
  setAuthMessage("Sign-in successful.");
}

async function onSignUp() {
  const email = signUpEmailInput?.value.trim() || "";
  const password = signUpPasswordInput?.value || "";
  const confirm = signUpConfirmPasswordInput?.value || "";

  if (!validCredentials(email, password)) return;
  if (password !== confirm) {
    setAuthMessage("Passwords do not match.", true);
    return;
  }
  if (!supabaseClient) {
    setAuthMessage("Authentication service unavailable. Try again in a moment.", true);
    return;
  }

  setAuthMessage("Creating account...");

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  setAuthMessage("Account created. Check your email for verification, then use Sign In.");
  setAuthTab("signin");
  if (signInEmailInput) signInEmailInput.value = email;
  if (signInPasswordInput) signInPasswordInput.value = "";
}

async function onSignOut() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }

  setCurrentUser(null);
  setAuthMessage("Signed out.");
}

async function onDocumentsSelected(event) {
  const files = Array.from(event.target.files || []);

  if (!files.length) {
    clearDetectedData();
    uploadMessage.textContent = "No documents uploaded yet.";
    return;
  }

  const analysis = await Promise.all(files.map(extractFileInsights));
  const amounts = analysis.flatMap((item) => item.amountCandidates);
  const rates = analysis.flatMap((item) => item.rateCandidates);
  const terms = analysis.flatMap((item) => item.statusTerms);

  appState.filesParsed = files.length;
  appState.extractedDebt = pickLikelyDebt(amounts);
  appState.extractedRate = average(rates);
  appState.foundTerms = unique(terms).slice(0, 8);
  appState.detectedStatus = detectStatusFromTerms(appState.foundTerms);

  if (!debtAmountInput.value && appState.extractedDebt > 0) {
    debtAmountInput.value = appState.extractedDebt.toFixed(2);
  }

  if (!interestRateInput.value && appState.extractedRate > 0) {
    interestRateInput.value = appState.extractedRate.toFixed(2);
  }

  metricFiles.textContent = String(appState.filesParsed);
  uploadMessage.textContent = `Parsed ${files.length} file(s). Review extracted values before analyzing.`;
  renderDetectedTerms(appState.foundTerms);
}

async function onAnalyze() {
  if (!appState.currentUser) {
    setAuthMessage("Please sign in before running analysis.", true);
    landingScreen.classList.add("is-active");
    workspaceScreen.classList.remove("is-active");
    return;
  }

  const principal = toNumber(debtAmountInput.value) || appState.extractedDebt;
  const annualRate = toNumber(interestRateInput.value) || appState.extractedRate || 6.0;
  const address = (addressInput?.value || "").trim();

  if (principal <= 0) {
    uploadMessage.textContent = "Add a valid debt amount or upload records with a debt value.";
    return;
  }

  const monthlyRate = annualRate / 100 / 12;
  const monthlyGrowth = principal * monthlyRate;
  const status = deriveStatus(principal, appState.detectedStatus);
  const projections = [1, 3, 5].map((year) => ({
    year,
    amount: principal * Math.pow(1 + monthlyRate, year * 12),
  }));

  metricDebt.textContent = money(principal);
  metricGrowth.textContent = money(monthlyGrowth);
  metricStatus.textContent = status.label;
  metricStatus.className = `metric-value ${status.className}`;
  metricFiles.textContent = String(appState.filesParsed);

  forecastAssumption.textContent = `Assumes no payments are made and debt compounds monthly at ${annualRate.toFixed(2)}% APR.`;
  renderForecastTable(projections);
  renderForecastBars(projections);
  renderResolutionOptions({ principal, annualRate, address, status: status.label });

  await saveAnalysisToSupabase({
    debt_amount: principal,
    interest_rate: annualRate,
    address,
    debt_status: status.label,
    estimated_monthly_interest: monthlyGrowth,
    projected_1y: projections[0].amount,
    projected_3y: projections[1].amount,
    projected_5y: projections[2].amount,
    files_parsed: appState.filesParsed,
    detected_terms: appState.foundTerms.join(", "),
  });
}

function onClear() {
  documentInput.value = "";
  debtAmountInput.value = "";
  interestRateInput.value = "";
  addressInput.value = "";

  clearDetectedData();
  metricDebt.textContent = "$0.00";
  metricStatus.textContent = "Not analyzed";
  metricStatus.className = "metric-value";
  metricGrowth.textContent = "$0.00";
  metricFiles.textContent = "0";

  forecastAssumption.textContent = "Run analysis to generate future debt projections.";
  forecastTableWrap.innerHTML = "";
  forecastBars.innerHTML = "";
  resolutionList.innerHTML = "<li>Upload records and run analysis to get personalized options.</li>";
  uploadMessage.textContent = "Information cleared.";
}

function updateUserBadge() {
  activeUser.textContent = appState.currentUser
    ? `Signed in as: ${appState.currentUser.email || appState.currentUser.id}`
    : "Signed in as: none";
}

async function saveAnalysisToSupabase(payload) {
  if (!supabaseClient || !appState.currentUser) {
    uploadMessage.textContent = "Analysis complete, but cloud save is unavailable.";
    return;
  }

  const row = {
    user_id: appState.currentUser.id,
    user_email: appState.currentUser.email || "",
    ...payload,
  };

  const { error } = await supabaseClient.from(SUPABASE_TABLE).insert([row]);

  if (error) {
    uploadMessage.textContent = `Analysis complete, but cloud save failed: ${error.message}`;
    return;
  }

  uploadMessage.textContent = `Analysis complete and saved to Supabase table "${SUPABASE_TABLE}".`;
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function validCredentials(email, password) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    setAuthMessage("Enter a valid email address.", true);
    return false;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.", true);
    return false;
  }

  return true;
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#b54837" : "";
}

function clearDetectedData() {
  appState.filesParsed = 0;
  appState.extractedDebt = 0;
  appState.extractedRate = 0;
  appState.detectedStatus = "";
  appState.foundTerms = [];
  detectedTerms.innerHTML = "";
}

function renderDetectedTerms(terms) {
  if (!terms.length) {
    detectedTerms.innerHTML = "";
    return;
  }

  detectedTerms.innerHTML = terms
    .map((term) => `<span class="chip">${escapeHtml(term)}</span>`)
    .join("");
}

function renderForecastTable(projections) {
  const rows = projections
    .map((item) => `<tr><td>${item.year} year${item.year > 1 ? "s" : ""}</td><td>${money(item.amount)}</td></tr>`)
    .join("");

  forecastTableWrap.innerHTML = `
    <table class="table">
      <thead>
        <tr><th>Time Horizon</th><th>Projected Balance</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderForecastBars(projections) {
  const max = Math.max(...projections.map((item) => item.amount), 1);

  forecastBars.innerHTML = projections
    .map((item) => {
      const width = Math.max(8, Math.round((item.amount / max) * 100));
      return `
        <div class="bar-row">
          <span>${item.year}y</span>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
          <strong>${money(item.amount)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderResolutionOptions({ principal, annualRate, address, status }) {
  const region = extractState(address);
  const highRate = annualRate >= 8;
  const highDebt = principal >= 20000;

  const items = [
    `Request a full debt validation letter and account statement${region ? ` in ${region}` : ""}.`,
    "Ask your institution for hardship options, fee waivers, and temporary payment relief.",
    highRate
      ? "Compare refinance and consolidation offers to reduce your effective APR."
      : "Set up automatic monthly payments to avoid delinquency and additional penalties.",
    highDebt
      ? "Consult a nonprofit credit counselor to negotiate structured repayment terms."
      : "Set a 12-24 month payoff plan with a fixed monthly budget.",
    status.toLowerCase().includes("high")
      ? "Prioritize this debt in your budget before discretionary spending."
      : "Track this debt monthly and re-run projections after each payment.",
  ];

  resolutionList.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

async function extractFileInsights(file) {
  const text = await readFileAsText(file);
  return {
    amountCandidates: extractAmountCandidates(text),
    rateCandidates: extractRateCandidates(text),
    statusTerms: extractStatusTerms(text),
  };
}

function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

function extractAmountCandidates(text) {
  const candidates = [];
  const rx = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2}))/g;

  for (const match of text.matchAll(rx)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 100 && value <= 500000) {
      candidates.push(value);
    }
  }

  return candidates;
}

function extractRateCandidates(text) {
  const rates = [];
  const rx = /(\d{1,2}(?:\.\d{1,2})?)\s?%/g;

  for (const match of text.matchAll(rx)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value <= 40) {
      rates.push(value);
    }
  }

  return rates;
}

function extractStatusTerms(text) {
  const lower = text.toLowerCase();
  const keywords = [
    "past due",
    "delinquent",
    "default",
    "collections",
    "charge off",
    "current",
    "deferment",
    "forbearance",
    "payment plan",
    "late fee",
    "interest",
  ];

  return keywords.filter((key) => lower.includes(key));
}

function detectStatusFromTerms(terms) {
  const joined = terms.join(" ").toLowerCase();

  if (/default|collections|charge off/.test(joined)) {
    return "High risk";
  }

  if (/past due|delinquent|late fee/.test(joined)) {
    return "Moderate pressure";
  }

  if (/current|payment plan|deferment|forbearance/.test(joined)) {
    return "Managed";
  }

  return "";
}

function deriveStatus(principal, detectedStatus) {
  if (detectedStatus === "High risk") {
    return { label: "High risk", className: "status-risk" };
  }

  if (detectedStatus === "Moderate pressure") {
    return { label: "Moderate pressure", className: "status-warning" };
  }

  if (principal >= 30000) {
    return { label: "High risk", className: "status-risk" };
  }

  if (principal >= 10000) {
    return { label: "Moderate pressure", className: "status-warning" };
  }

  return { label: detectedStatus || "Low impact", className: "status-good" };
}

function pickLikelyDebt(amounts) {
  if (!amounts.length) return 0;
  const sorted = [...amounts].sort((a, b) => b - a);
  return sorted[0];
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function extractState(address) {
  if (!address) return "";

  const twoLetter = address.match(/\b([A-Z]{2})\b/);
  if (twoLetter) return twoLetter[1];

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
    "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
  ];

  return states.find((state) => address.toLowerCase().includes(state.toLowerCase())) || "";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
