# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Environment File

```bash
cp .env.example .env
```

## Step 3: Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings (gear icon) → General tab
4. Scroll to "Your apps" section
5. Copy the config values to your `.env` file

**Required Firebase values:**
- `VITE_FIREBASE_API_KEY` - API Key
- `VITE_FIREBASE_AUTH_DOMAIN` - Auth Domain
- `VITE_FIREBASE_PROJECT_ID` - Project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Storage Bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Messaging Sender ID
- `VITE_FIREBASE_APP_ID` - App ID
- `VITE_FIREBASE_MEASUREMENT_ID` - Measurement ID (for Analytics)

**Note**: All values should be prefixed with `VITE_` for the build script to recognize them.

## Step 4: Set Admin Email

Add your admin email to `.env`:

```env
VITE_ADMIN_EMAIL=your-admin-email@example.com
```

**Important**: 
- This email must be registered in Firebase Auth
- You can also manage admins via Firestore `admins` collection (email as document ID, `isAdmin: true`)
- The system checks Firestore first, then falls back to environment variable

## Step 5: Get GitHub Token (Optional but Recommended)

1. Go to [GitHub Settings → Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Name: "Vedam Admin Dashboard"
4. Select scope: `public_repo`
5. Generate and copy to `.env`

**Generate a new token:**
- Go to GitHub Settings → Developer settings → Personal access tokens
- Generate new token (classic)
- Select scope: `public_repo`
- Copy the token to your `.env` file

⚠️ **IMPORTANT**: Never commit your token to git!

## Step 6: Build and Test

```bash
# Build (injects environment variables)
npm run build

# Test locally
npm run dev
```

Open `http://localhost:8000` in your browser.

## Step 7: Push to GitHub

```bash
# Initialize git (if not done)
git init

# Add files
git add .

# Commit
git commit -m "Initial commit"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/your-repo.git

# Push
git branch -M main
git push -u origin main
```

## Step 8: Deploy to Netlify

### Via Netlify UI:

1. Go to [Netlify](https://app.netlify.com/)
2. "Add new site" → "Import an existing project"
3. Connect GitHub → Select your repo
4. Build settings:
   - Build command: `npm install && npm run build`
   - Publish directory: `.`
5. Add environment variables (Site settings → Environment variables):
   - Add all `VITE_*` variables from your `.env` file:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_FIREBASE_MEASUREMENT_ID`
     - `VITE_ADMIN_EMAIL` (required)
     - `VITE_GITHUB_TOKEN` (optional but recommended)
6. Deploy!

### Via CLI:

```bash
npm install -g netlify-cli
netlify login
netlify init
# Follow prompts, then:
netlify env:set VITE_FIREBASE_API_KEY "your-key"
# ... (add all other variables)
netlify deploy --prod
```

## Security Checklist

Before pushing to GitHub:

- [ ] `.env` file is NOT committed (check `.gitignore`)
- [ ] All secrets are in `.env` (not hardcoded)
- [ ] `.env.example` exists (without real values)
- [ ] Old tokens/keys are revoked if exposed

## Troubleshooting

**Build fails?**
- Check all environment variables are set
- Verify `.env` file exists
- Run `npm install` first

**Environment variables not working?**
- Make sure they're prefixed with `VITE_`
- Run `npm run build` after changing `.env`
- Check Netlify environment variables are set

**Firebase errors?**
- Verify project is active in Firebase Console
- Check Firestore security rules
- Ensure API keys are correct

