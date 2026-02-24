cd "/Users/maishakhalfani/Documents/New project"

# Optional: create a zip you can upload/share
zip debt-compass-prototype.zip index.html styles.css script.js

# Initialize git and commit
git init
git add index.html styles.css script.js
git commit -m "Add debt compass prototype"

# Set main branch
git branch -M main

# Connect your GitHub repo (replace with your URL)
git remote add origin https://github.com/<your-username>/<your-repo>.git

# Push
git push -u origin main
