const SUPABASE_URL = "https://pavuonaxerlpukbepcqs.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_uaZGfYFOdXp4neAxWAqIig_FDO1oEYF";
const SUPABASE_TABLE = "debt_analysis_records";

const landingScreen = document.getElementById("landingScreen");
const workspaceScreen = document.getElementById("workspaceScreen");

const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
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

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

initAuth();

signInButton.addEventListener("click", async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!validCredentials(email, password)) return;
  if (!supabaseClient) {
    setAuthMessage("Supabase client failed to load.", true);
    return;
  }

  setAuthMessage("Signing in...");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  if (!isEmailVerified(data.user)) {
    await supabaseClient.auth.signOut();
    setAuthMessage("Email not verified. Open your verification email, then sign in again.", true);
    return;
  }

  handleAuthSuccess(data.user);
  setAuthMessage("Sign-in successful.");
});

signUpButton.addEventListener("click", async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!validCredentials(email, password)) return;
  if (!supabaseClient) {
    setAuthMessage("Supabase client failed to load.", true);
    return;
  }

  setAuthMessage("Creating account...");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  await supabaseClient.auth.signOut();
  if (data.user && isEmailVerified(data.user)) {
    setAuthMessage("Account created. Sign in to continue.");
    return;
  }

  setAuthMessage("Account created. Verify your email before signing in.");
});

signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  appState.currentUser = null;
  updateUserBadge();
  workspaceScreen.classList.remove("is-active");
  landingScreen.classList.add("is-active");
  setAuthMessage("Signed out.");
});

documentInput.addEventListener("change", async (event) => {
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
  appState.foundTerms = unique(terms).slice(0, 6);
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
});

analyzeButton.addEventListener("click", async () => {
  if (!appState.currentUser) {
    uploadMessage.textContent = "Please sign in before analyzing debt.";
    workspaceScreen.classList.remove("is-active");
    landingScreen.classList.add("is-active");
    return;
  }

  const principal = toNumber(debtAmountInput.value) || appState.extractedDebt;
  const annualRate = toNumber(interestRateInput.value) || appState.extractedRate || 6.0;
  const address = addressInput.value.trim();

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
});

clearButton.addEventListener("click", () => {
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
});

async function initAuth() {
  if (!supabaseClient) {
    setAuthMessage("Supabase script unavailable. Auth is disabled.", true);
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session?.user) {
    if (isEmailVerified(session.user)) {
      handleAuthSuccess(session.user);
    } else {
      await supabaseClient.auth.signOut();
      appState.currentUser = null;
      updateUserBadge();
      landingScreen.classList.add("is-active");
      workspaceScreen.classList.remove("is-active");
      setAuthMessage("Please verify your email to continue.", true);
    }
  }

  supabaseClient.auth.onAuthStateChange((_event, sessionData) => {
    const candidateUser = sessionData?.user || null;
    if (candidateUser && !isEmailVerified(candidateUser)) {
      supabaseClient.auth.signOut();
      setAuthMessage("Please verify your email to continue.", true);
    }
    const verifiedUser = candidateUser && isEmailVerified(candidateUser) ? candidateUser : null;
    appState.currentUser = verifiedUser;
    updateUserBadge();

    if (appState.currentUser) {
      landingScreen.classList.remove("is-active");
      workspaceScreen.classList.add("is-active");
    } else {
      workspaceScreen.classList.remove("is-active");
      landingScreen.classList.add("is-active");
    }
  });
}

function handleAuthSuccess(user) {
  appState.currentUser = user;
  updateUserBadge();
  landingScreen.classList.remove("is-active");
  workspaceScreen.classList.add("is-active");
}

function updateUserBadge() {
  activeUser.textContent = appState.currentUser
    ? `Signed in as: ${appState.currentUser.email || appState.currentUser.id}`
    : "Signed in as: none";
}

async function saveAnalysisToSupabase(payload) {
  if (!supabaseClient || !appState.currentUser) return;

  const row = {
    user_id: appState.currentUser.id,
    user_email: appState.currentUser.email || "",
    ...payload,
  };

  const { error } = await supabaseClient.from(SUPABASE_TABLE).insert([row]);

  if (error) {
    uploadMessage.textContent = `Analysis ran, but save failed: ${error.message}`;
    return;
  }

  uploadMessage.textContent = `Analysis complete and saved to Supabase table \"${SUPABASE_TABLE}\".`;
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
  authMessage.style.color = isError ? "#b54837" : "#385062";
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
    <table class="table" aria-label="Debt forecast table">
      <thead>
        <tr><th>Time horizon</th><th>Projected balance</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderForecastBars(projections) {
  const max = Math.max(...projections.map((p) => p.amount));
  forecastBars.innerHTML = projections
    .map((item) => {
      const width = Math.max(8, Math.round((item.amount / max) * 100));
      return `
        <div class="bar-row">
          <span>${item.year}Y</span>
          <div class="bar" style="width:${width}%"></div>
          <strong>${money(item.amount)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderResolutionOptions({ principal, annualRate, address, status }) {
  const stateCode = parseState(address);
  const hasLocation = Boolean(stateCode);
  const isHighDebt = principal >= 20000;
  const isHighRate = annualRate >= 7.5;

  const options = [
    `Request a written debt validation statement and complete transaction history from your institution${hasLocation ? ` in ${stateCode}` : ""}.`,
    isHighRate
      ? "Prioritize refinance or consolidation comparisons to reduce interest acceleration before negotiating payment terms."
      : "Request an interest freeze or reduced-rate hardship plan before setting repayment terms.",
    isHighDebt
      ? "Prepare for settlement negotiation with documentation of hardship, income limits, and a target lump-sum range."
      : "Set a fixed payoff date and request fee waivers in exchange for automatic monthly payments.",
    status.includes("Collections")
      ? "Ask for proof of assignment/ownership of debt before agreeing to any collector payment arrangement."
      : "Check whether your account can be restored to good standing through rehabilitation or administrative review.",
    hasLocation
      ? `Search ${stateCode} consumer protection resources and legal aid for education debt disputes and billing complaints.`
      : "Add a full address so recommendations can include state-specific programs and legal aid resources.",
  ];

  resolutionList.innerHTML = options.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function extractFileInsights(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result || "");
      resolve({
        amountCandidates: extractAmounts(text),
        rateCandidates: extractRates(text),
        statusTerms: extractStatusTerms(text),
      });
    };

    reader.onerror = () => {
      resolve({ amountCandidates: [], rateCandidates: [], statusTerms: [] });
    };

    reader.readAsText(file);
  });
}

function extractAmounts(text) {
  const values = [];
  const pattern = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value >= 100 && value <= 400000) {
      values.push(value);
    }
  }

  return values;
}

function extractRates(text) {
  const values = [];
  const pattern = /(\d{1,2}(?:\.\d{1,2})?)\s?%/g;

  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value <= 35) {
      values.push(value);
    }
  }

  return values;
}

function extractStatusTerms(text) {
  const lower = text.toLowerCase();
  const dictionary = [
    "past due",
    "delinquent",
    "in collections",
    "collection agency",
    "charged off",
    "default",
    "current",
    "active",
    "payment plan",
    "hold",
  ];

  return dictionary.filter((term) => lower.includes(term));
}

function detectStatusFromTerms(terms) {
  const joined = terms.join(" ").toLowerCase();
  if (joined.includes("in collections") || joined.includes("collection")) return "collections";
  if (joined.includes("charged off") || joined.includes("default")) return "default";
  if (joined.includes("past due") || joined.includes("delinquent")) return "past_due";
  if (joined.includes("current") || joined.includes("active")) return "current";
  return "";
}

function deriveStatus(principal, detectedStatus) {
  if (detectedStatus === "collections") {
    return { label: "Collections Risk", className: "status-risk" };
  }

  if (detectedStatus === "default") {
    return { label: "Default / Charge-Off Risk", className: "status-risk" };
  }

  if (detectedStatus === "past_due") {
    return { label: "Past Due", className: "status-warning" };
  }

  if (detectedStatus === "current") {
    return { label: "Current but Unpaid", className: "status-good" };
  }

  if (principal >= 30000) {
    return { label: "High Balance Risk", className: "status-risk" };
  }

  if (principal >= 12000) {
    return { label: "Moderate Balance Risk", className: "status-warning" };
  }

  return { label: "Early-Stage Balance", className: "status-good" };
}

function pickLikelyDebt(values) {
  if (!values.length) return 0;
  const sorted = unique(values).sort((a, b) => b - a);
  return sorted[0];
}

function parseState(address) {
  if (!address) return "";

  const twoLetter = address.match(/\b([A-Z]{2})\b/);
  if (twoLetter) return twoLetter[1];

  const stateMap = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO",
    connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
    illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
    maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
    missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
    oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA",
    washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  };

  const lower = address.toLowerCase();
  for (const [name, code] of Object.entries(stateMap)) {
    if (lower.includes(name)) return code;
  }

  return "";
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values) {
  return [...new Set(values)];
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
