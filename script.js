// Initialize Supabase
const supabaseUrl = 'https://pavuonaxerlpukbepcqs.supabase.co';
const supabaseKey = 'sb_publishable_uaZGfYFOdXp4neAxWAqIig_FDO1oEYF';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-container');
    const loginForm = document.getElementById('login-form');
    const mainContent = document.getElementById('main-content');
    const returnBtn = document.getElementById('return-home');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-data');

    // Authentication Logic
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // In a real scenario, use: await supabase.auth.signInWithPassword({ email, password })
        authOverlay.classList.add('hidden');
        mainContent.classList.remove('hidden');
    });

    // Return to Landing Page Logic
    returnBtn.addEventListener('click', () => {
        mainContent.classList.add('hidden');
        authOverlay.classList.remove('hidden');
        // Reset form if needed
        loginForm.reset();
    });

    // Debt Analysis Simulation
    analyzeBtn.addEventListener('click', () => {
        const principal = 25000; 
        const annualRate = 0.05;
        
        document.getElementById('principal-val').innerText = `$${principal.toLocaleString()}`;
        document.getElementById('status-tag').innerText = 'Active / Unpaid';
        
        const prediction = principal * Math.pow((1 + annualRate / 12), 12);
        document.getElementById('projection-val').innerText = `$${prediction.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
        
        displayResolutions(document.getElementById('address').value);
    });

    function displayResolutions(address) {
        const container = document.getElementById('resolution-options');
        container.innerHTML = `
            <div class="card" style="border-left: 4px solid var(--success)">
                <h4>Income-Driven Repayment</h4>
                <p>Adjust monthly payments based on current earnings.</p>
            </div>
            <div class="card" style="border-left: 4px solid var(--primary)">
                <h4>Local Refinancing</h4>
                <p>Check options available near ${address || 'your location'}.</p>
            </div>
        `;
    }

    clearBtn.addEventListener('click', () => {
        if(confirm("Clear all data?")) location.reload();
    });
});
