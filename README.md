# Vedam Open Source Admin Dashboard

A comprehensive admin dashboard for managing members, forms, analytics, and GitHub integration for the Vedam Open Source organization.

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_SITE_ID/deploy-status)](https://app.netlify.com/sites/YOUR_SITE_NAME/deploys)

## Features

- 🔐 **Secure Authentication**: Firebase Auth with Firestore-based admin management
- 👥 **Member Management**: Track and manage organization members with advanced filtering and pagination
- 📝 **Form Builder**: Create and manage dynamic forms with advanced field types
- 📊 **Analytics**: View detailed analytics and insights with charts and statistics
- 🔗 **GitHub Integration**: Fetch and display GitHub user data with intelligent caching and rate limiting
- 📈 **Dashboard**: Overview of organization statistics and trends
- ⚡ **Performance Optimized**: Debounced search, virtual scrolling, request deduplication, exponential backoff
- ♿ **Accessible**: ARIA labels, keyboard navigation, screen reader support, high contrast mode
- 🛡️ **Secure**: Environment-based configuration, no hardcoded credentials, automated security scanning
- 📱 **Responsive**: Mobile-first design with comprehensive breakpoints and touch optimizations
- 🔄 **CI/CD**: Automated testing, security scanning, accessibility checks, and performance monitoring

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Backend**: Firebase (Firestore, Auth, Analytics)
- **Styling**: Custom CSS
- **Deployment**: Netlify
- **Architecture**: Modular design with service layer, centralized error handling, and type definitions

## Project Structure

```
├── js/
│   ├── app.js                 # Main application entry point
│   ├── auth.js                # Authentication module
│   ├── data-store.js          # Firebase data management with caching
│   ├── github-api.js          # GitHub API integration
│   ├── github-refresh.js      # Background GitHub data refresh
│   ├── navigation.js          # Navigation and routing
│   ├── dashboard.js           # Dashboard page
│   ├── members.js             # Members management page
│   ├── analytics.js           # Analytics page
│   ├── forms.js               # Forms management
│   ├── services/
│   │   ├── stats-service.js   # Centralized statistics calculations
│   │   └── loading-service.js # Loading state management
│   ├── utils/
│   │   ├── calculations.js    # Calculation utilities
│   │   └── virtual-scroll.js  # Virtual scrolling utility
│   └── types.js               # Type definitions (JSDoc)
├── firebase-config.js         # Firebase configuration
├── build.js                   # Build script for environment injection
├── .env.example              # Environment variables template
└── index.html                # Main HTML file
```

## Prerequisites

- Node.js 18+ (for local development)
- Firebase project
- GitHub Personal Access Token (optional, but recommended for enhanced API limits - 5,000 req/hour vs 60 req/hour)
- Admin email registered in Firebase Auth

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd "Vedam Open Admin copy"
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Admin Email (must be registered in Firebase Auth)
VITE_ADMIN_EMAIL=admin@example.com

# GitHub API Token (optional but recommended)
VITE_GITHUB_TOKEN=your_github_personal_access_token
```

### 3. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings → General
4. Scroll down to "Your apps" section
5. Copy the configuration values to your `.env` file

### 4. Get GitHub Token (Optional)

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Vedam Admin Dashboard")
4. Select scope: `public_repo` (for public repository access)
5. Generate and copy the token to your `.env` file

**Note**: Without a token, GitHub API rate limits are 60 requests/hour. With a token, you get 5,000 requests/hour.

### 5. Local Development

Since this is a static site, you can serve it locally using:

**Option 1: Using Python**
```bash
python -m http.server 8000
```

**Option 2: Using Node.js (http-server)**
```bash
npm install -g http-server
http-server -p 8000
```

**Option 3: Using VS Code Live Server**
- Install "Live Server" extension
- Right-click on `index.html` → "Open with Live Server"

Then open `http://localhost:8000` in your browser.

**Note**: For environment variables to work locally, run `npm run build` after setting up your `.env` file. The build script will inject environment variables into the source files.

**Note**: For environment variables to work locally, you'll need a build tool or use a simple script to inject them. See "Environment Variables in Static Site" section below.

## Deployment to Netlify

### Method 1: Deploy via Netlify UI

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub and select your repository
   - Configure build settings:
     - **Build command**: Leave empty (static site)
     - **Publish directory**: `.` (root)
   - Click "Deploy site"

3. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add all variables from your `.env` file (without `VITE_` prefix for Netlify)
   - Or use `VITE_` prefix if you're using a build tool

### Method 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

## Environment Variables in Static Site

Since this is a vanilla JavaScript project without a build tool, environment variables need special handling:

### Option 1: Use Netlify Build Plugin (Recommended)

Create `netlify/plugins/replace-env.js`:

```javascript
module.exports = {
  onBuild: async ({ utils }) => {
    const fs = require('fs');
    const path = require('path');
    
    // Read files that need env replacement
    const files = ['firebase-config.js', 'js/github-api.js'];
    
    files.forEach(file => {
      const filePath = path.join(__dirname, '..', '..', file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace environment variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('VITE_')) {
          const value = process.env[key];
          const regex = new RegExp(`process\\.env\\.${key}|import\\.meta\\.env\\.${key}`, 'g');
          content = content.replace(regex, `"${value}"`);
        }
      });
      
      fs.writeFileSync(filePath, content);
    });
  }
};
```

### Option 2: Use a Simple Build Script

Create `build.js`:

```javascript
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const files = {
  'firebase-config.js': {
    'import.meta.env.VITE_FIREBASE_API_KEY': process.env.VITE_FIREBASE_API_KEY,
    'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': process.env.VITE_FIREBASE_AUTH_DOMAIN,
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': process.env.VITE_FIREBASE_PROJECT_ID,
    'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': process.env.VITE_FIREBASE_STORAGE_BUCKET,
    'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    'import.meta.env.VITE_FIREBASE_APP_ID': process.env.VITE_FIREBASE_APP_ID,
    'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': process.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
  'js/github-api.js': {
    'import.meta.env?.VITE_GITHUB_TOKEN': process.env.VITE_GITHUB_TOKEN,
  }
};

Object.entries(files).forEach(([file, replacements]) => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, value ? `"${value}"` : '""');
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
```

Then update `netlify.toml`:

```toml
[build]
  command = "node build.js"
  publish = "."
```

## Security Notes

⚠️ **Important**: Never commit your `.env` file or files containing actual API keys/tokens to version control.

- ✅ `.env` is already in `.gitignore`
- ✅ `.env.example` shows the structure without real values
- ✅ Use Netlify environment variables for production
- ✅ Rotate tokens/keys if they're accidentally exposed

## Project Structure

```
.
├── index.html              # Main dashboard page
├── forms.html              # Forms management page
├── firebase-config.js      # Firebase configuration
├── styles.css              # Global styles
├── js/
│   ├── app.js             # Main application logic
│   ├── auth.js            # Authentication
│   ├── dashboard.js       # Dashboard functionality
│   ├── members.js         # Member management
│   ├── forms.js           # Forms management
│   ├── form-builder.js    # Form builder
│   ├── form-submissions.js # Form submissions
│   ├── form-analytics.js  # Form analytics
│   ├── github-api.js      # GitHub API integration
│   ├── analytics.js       # Analytics
│   └── utils.js           # Utility functions
├── .env                   # Environment variables (not in git)
├── .env.example           # Example environment variables
├── .gitignore             # Git ignore rules
├── netlify.toml           # Netlify configuration
└── README.md             # This file
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/vedam-open-admin.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test locally: `npm run build && npm run dev`
6. Follow the [Testing Guide](TESTING.md)
7. Push and create a Pull Request

### Pull Request Process

- ✅ **Preview deployments are automatic** - No approval needed
- ✅ **Tests run automatically** - GitHub Actions check your code
- ✅ **Production deploys after merge** - Only merged PRs go to production
- 📋 **Use PR template** - Fill out the template when creating PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for complete guidelines.

## License

[Add your license here]

## Support

For issues and questions, please open an issue on GitHub.

