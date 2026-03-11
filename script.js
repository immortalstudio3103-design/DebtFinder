document.addEventListener('DOMContentLoaded', () => {
    // Supabase configuration
    const SUPABASE_URL = 'https://pavuonaxerlpukbepcqs.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uaZGfYFOdXp4neAxWAqIig_FDO1oEYF';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const fileUpload = document.getElementById('file-upload');
    const analysisContainer = document.getElementById('analysis-container');
    const principalVal = document.getElementById('principal-val');
    const predictionVal = document.getElementById('prediction-val');
    const addressForm = document.getElementById('address-form');
    const solutionsOutput = document.getElementById('solutions-output');
    const solutionList = document.getElementById('solution-list');
    const clearBtn = document.getElementById('clear-btn');

    // State Variables
    let currentDebt = 0;

    // Handle Login
   loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
       
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            alert(`Login failed: ${error.message}`);
            return;
        }
       
        authSection.classList.remove('active');
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        dashboardSection.classList.add('active');
    });

    // Handle File Upload (Simulated Parsing)
    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            simulateDocumentAnalysis();
        }
    });

    function simulateDocumentAnalysis() {
        // Mock data extraction that would normally happen via backend OCR/Parsing
        currentDebt = 24500.00;
        const interestRate = 0.05; // 5% average rate
        const years = 10;
        
        // Compound interest calculation
        const projectedDebt = currentDebt * Math.pow((1 + interestRate), years);

        // Update UI
        principalVal.innerText = `$${currentDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        predictionVal.innerText = `$${projectedDebt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        analysisContainer.classList.remove('hidden');
    }

    // Handle Address submission for Solutions
    addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const addressInput = document.getElementById('address').value.toLowerCase();
        solutionList.innerHTML = ''; // Reset list
        
        // Simulated algorithmic resolution options based on location/profile
        const mockSolutions = [
            "Income-Driven Repayment (IDR) Plan Transition",
            "New York State Get on Your Feet Loan Forgiveness Program",
            "SUNY Oswego Alumni Relief Grant Network"
        ];

        mockSolutions.forEach(solution => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>Option:</strong> ${solution} <br><a href="#" style="font-size: 0.85rem; color: var(--accent);">Learn how to apply &rarr;</a>`;
            solutionList.appendChild(li);
        });

        solutionsOutput.classList.remove('hidden');
    });

    // Handle Clear Data
    clearBtn.addEventListener('click', () => {
        // Reset state and UI
        currentDebt = 0;
        fileUpload.value = '';
        analysisContainer.classList.add('hidden');
        solutionsOutput.classList.add('hidden');
        document.getElementById('address').value = '';
        principalVal.innerText = '$0.00';
        predictionVal.innerText = '$0.00';
    });
});
