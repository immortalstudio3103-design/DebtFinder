// Initialize Supabase Client
const supabaseUrl = 'https://pavuonaxerlpukbepcqs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdnVvbmF4ZXJscHVrYmVwY3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjk0MjcsImV4cCI6MjA4NzcwNTQyN30.w1jyeDDQddkW6dDDcLaOBhmCO1qh_3qh1J4a02bJNDg';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
const landingPage = document.getElementById('landing-page');
const dashboardPage = document.getElementById('dashboard-page');
const authForm = document.getElementById('auth-form');
const debtForm = document.getElementById('debt-form');
const clearBtn = document.getElementById('clear-btn');
const logoutBtn = document.getElementById('logout-btn');
const authMessage = document.getElementById('auth-message');

const emptyState = document.getElementById('empty-state');
const analysisContent = document.getElementById('analysis-content');
const displayPrincipal = document.getElementById('display-principal');
const displayInterest = document.getElementById('display-interest');
const resolutionList = document.getElementById('resolution-list');

let currentUser = null;

// Handle Authentication (Sign In / Register)
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMessage.textContent = "Authenticating...";

    // Attempt login, if no user exists, Supabase can handle signup (depending on your settings)
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        // If login fails, attempt signup as fallback for this demo
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: password
        });
        
        if (signUpError) {
            authMessage.textContent = signUpError.message;
            return;
        }
        currentUser = signUpData.user;
    } else {
        currentUser = data.user;
    }

    // Switch Views
    landingPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    authForm.reset();
    authMessage.textContent = "";
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    dashboardPage.classList.add('hidden');
    landingPage.classList.remove('hidden');
    clearDashboard();
});

// Handle Form Submission & Analysis
debtForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('document-upload').files[0];
    const address = document.getElementById('address').value;

    if (!fileInput) return;

    // In a production environment, you would upload the file to Supabase Storage 
    // and send it to an edge function/backend for PDF parsing.
    // Here we simulate the analysis for the front-end demonstration.
    
    const mockPrincipal = Math.floor(Math.random() * 30000) + 5000; 
    const mockInterestRate = 5.5; 

    // 1. Save inputted data to Supabase Database (Requires a 'user_records' table)
    const { error: dbError } = await supabase
        .from('user_records')
        .insert([
            { 
              user_id: currentUser?.id, 
              address: address, 
              filename: fileInput.name,
              status: 'pending_review'
            }
        ]);

    if (dbError) {
        console.warn("Ensure you have created a 'user_records' table in Supabase:", dbError.message);
    }

    // 2. Update UI with Analysis
    emptyState.classList.add('hidden');
    analysisContent.classList.remove('hidden');

    displayPrincipal.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mockPrincipal);
    displayInterest.textContent = `${mockInterestRate}%`;

    // 3. Generate Resolution Options based on location/status
    resolutionList.innerHTML = `
        <li><strong>Mitigate:</strong> Enroll in Income-Driven Repayment (IDR) plans based on your ${address.split(',')[1] || 'state'} residence.</li>
        <li><strong>Resolve:</strong> Apply for the Public Service Loan Forgiveness (PSLF) program if applicable to your current field.</li>
        <li><strong>Eliminate:</strong> Standard 10-year aggressive principal-first payment strategy.</li>
    `;
});

// Handle Clear Button
clearBtn.addEventListener('click', () => {
    clearDashboard();
});

function clearDashboard() {
    debtForm.reset();
    emptyState.classList.remove('hidden');
    analysisContent.classList.add('hidden');
}
