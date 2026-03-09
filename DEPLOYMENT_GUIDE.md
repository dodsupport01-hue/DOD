# DOD Healthcare Kiosk — Full-Stack Deployment Guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FREE HOSTING STACK                       │
├─────────────────────────────────────────────────────────────┤
│  Frontend  →  Netlify (free)   →  your-site.netlify.app     │
│  Backend   →  Render (free)    →  your-api.onrender.com     │
│  Database  →  MongoDB Atlas    →  Free 512MB cluster        │
│  Images    →  Cloudinary CDN   →  Free 25GB storage         │
│  Domain    →  Netlify subdomain (free) or custom .in/.com   │
└─────────────────────────────────────────────────────────────┘

Admin Panel → your-site.netlify.app/admin/
            └── Login → Dashboard → Upload images → LIVE instantly
```

---

## 📦 FREE HOSTING PLATFORMS

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Netlify** | Frontend + Admin Panel | Unlimited static sites, free SSL |
| **Render** | Node.js Backend API | 750 hrs/month, free |
| **MongoDB Atlas** | Database | 512MB free forever |
| **Cloudinary** | Image Storage CDN | 25GB storage, 25GB bandwidth/month |

---

## 🚀 STEP-BY-STEP DEPLOYMENT

---

### STEP 1 — Get Cloudinary API Secret

1. Go to → https://console.cloudinary.com
2. Login to your account
3. Go to **Settings** → **API Keys**
4. You already have: `API Key: 747515935252991`
5. **Copy the API Secret** (click the eye icon to show it)
6. Also note your **Cloud Name** (top-left of dashboard, like `dxyz12abc`)
7. Keep these 3 values ready:
   - Cloud Name: `_______________`
   - API Key: `747515935252991`
   - API Secret: `_______________`

---

### STEP 2 — Set Up MongoDB Atlas (Free Database)

1. Go to → https://cloud.mongodb.com
2. Click **Try Free** → Sign up (use Google for faster signup)
3. Choose **Free Shared Cluster (M0)**
4. Select region: **Asia (Mumbai ap-south-1)**
5. Click **Create Cluster** (takes 2-3 mins)
6. **Create Database User:**
   - Username: `dodadmin`
   - Password: create a strong password
   - Click **Create User**
7. **Allow Network Access:**
   - Click **Network Access** → **Add IP Address**
   - Click **Allow Access From Anywhere** (0.0.0.0/0)
   - Click **Confirm**
8. **Get Connection String:**
   - Click **Clusters** → **Connect** → **Connect your application**
   - Copy the string like:
     `mongodb+srv://dodadmin:PASSWORD@cluster0.xxxxx.mongodb.net/dod-healthcare`
   - Replace `<password>` with your actual password
   - Save this connection string

---

### STEP 3 — Create the `.env` File for Backend

1. In VS Code, go to `D:\websitem\DOD\backend\`
2. Create a file named `.env` (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://dodadmin:YOURPASSWORD@cluster0.xxxxx.mongodb.net/dod-healthcare
JWT_SECRET=DODHealthcare2026SecretKey_ChangeThis_XYZ789
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=747515935252991
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here
ADMIN_EMAIL=admin@dodhealthcare.com
ADMIN_PASSWORD=DODAdmin@2026
FRONTEND_URL=https://your-site.netlify.app
```

> ⚠️ NEVER commit the `.env` file to GitHub (it's in .gitignore)

---

### STEP 4 — Push Code to GitHub

1. Go to https://github.com → Sign up (Free)
2. Click **New Repository** → Name: `dod-healthcare-website` → Public → Create
3. Open terminal in VS Code (`Ctrl + ~`):

```bash
cd D:\websitem\DOD
git init
git add .
git commit -m "Initial commit - DOD Healthcare website + backend + admin panel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dod-healthcare-website.git
git push -u origin main
```

---

### STEP 5 — Deploy Backend to Render (Free)

1. Go to → https://render.com → Sign up with GitHub
2. Click **New +** → **Web Service**
3. Connect your GitHub repo: `dod-healthcare-website`
4. Configure:
   - **Name**: `dod-healthcare-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
5. **Add Environment Variables** (click "Add Environment Variable" for each):
   ```
   MONGODB_URI         = (your Atlas connection string)
   JWT_SECRET          = DODHealthcare2026SecretKey_ChangeThis_XYZ789
   JWT_EXPIRES_IN      = 7d
   CLOUDINARY_CLOUD_NAME = your_cloud_name
   CLOUDINARY_API_KEY  = 747515935252991
   CLOUDINARY_API_SECRET = your_api_secret
   ADMIN_EMAIL         = admin@dodhealthcare.com
   ADMIN_PASSWORD      = DODAdmin@2026
   FRONTEND_URL        = https://your-site.netlify.app
   NODE_ENV            = production
   ```
6. Click **Create Web Service**
7. Wait 3-5 minutes for deployment
8. Your API URL will be: `https://dod-healthcare-api.onrender.com`
9. Test it: open `https://dod-healthcare-api.onrender.com/api/health` → should show `{"status":"OK"}`

---

### STEP 6 — Update API URLs in Code

After you get your Render URL, update these 2 files:

**In `index.html`** (line ~1793):
```javascript
const BACKEND_URL = 'https://dod-healthcare-api.onrender.com';
```

**In `admin/index.html`** (line ~85):
```javascript
const API_BASE = 'https://dod-healthcare-api.onrender.com/api';
```

**In `admin/dashboard.html`** (line ~230):
```javascript
const API_BASE = 'https://dod-healthcare-api.onrender.com/api';
```

Then commit and push:
```bash
git add .
git commit -m "Update API URLs to production"
git push
```

---

### STEP 7 — Deploy Frontend + Admin Panel to Netlify (Free)

1. Go to → https://netlify.com → Sign up with GitHub
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** → Select `dod-healthcare-website`
4. Configure:
   - **Base directory**: (leave blank — root of repo)
   - **Build command**: (leave blank — static site)
   - **Publish directory**: `.` (dot, root folder)
5. Click **Deploy Site**
6. Your site will be live at: `https://RANDOMNAME.netlify.app`
7. **Rename your site** (optional): Site Settings → Change site name → `dod-healthcare`
   - URL becomes: `https://dod-healthcare.netlify.app`

---

### STEP 8 — Update CORS in Backend

1. In Render dashboard → your service → **Environment**
2. Update `FRONTEND_URL` to your actual Netlify URL:
   ```
   FRONTEND_URL = https://dod-healthcare.netlify.app
   ```
3. Render auto-redeploys

---

### STEP 9 — First Admin Login

1. Open: `https://dod-healthcare.netlify.app/admin/`
2. Login with:
   - Email: `admin@dodhealthcare.com`
   - Password: `DODAdmin@2026`
3. **IMMEDIATELY change your password** in Settings tab!

---

### STEP 10 — Upload Brands & Certifications

**Adding a Brand:**
1. Admin Dashboard → Click **Brand Partners** in sidebar
2. Click **Add Brand** (+ button)
3. Enter brand name (e.g., "Mayo Clinic")
4. Upload logo image (PNG/JPG/SVG)
5. Click **Save Brand**
6. ✅ Image uploads to Cloudinary, URL saved to MongoDB
7. ✅ Open your website → scroll to Brands section → NEW brand appears INSTANTLY!

**Adding a Certification:**
1. Admin Dashboard → Click **Certifications** in sidebar
2. Click **Add Certification**
3. Fill in title, description, year
4. Upload image OR leave blank (emoji will be used)
5. Click **Save Certification**
6. ✅ Updates live on website immediately!

---

## 📁 Final Folder Structure

```
D:\websitem\DOD\
├── index.html          ← Main website (loads brands/certs from API)
├── script.js
├── styles.css
├── styles-additions.css
├── admin/
│   ├── index.html      ← Admin Login page
│   ├── dashboard.html  ← Admin Dashboard
│   └── admin.css       ← Admin styles
└── backend/
    ├── server.js       ← Express API server
    ├── package.json
    ├── .env            ← ⚠️ NOT committed to GitHub
    ├── .env.example    ← Template (safe to commit)
    ├── .gitignore
    ├── config/
    │   └── cloudinary.js
    ├── middleware/
    │   └── auth.js
    ├── models/
    │   ├── Admin.js
    │   ├── Brand.js
    │   └── Certification.js
    ├── routes/
    │   ├── auth.js
    │   ├── brands.js
    │   └── certifications.js
    └── utils/
        └── seed.js
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| POST | `/api/auth/login` | No | Admin login |
| GET | `/api/auth/me` | Yes | Get admin info |
| POST | `/api/auth/change-password` | Yes | Change password |
| GET | `/api/brands` | No | Get active brands (website uses this) |
| GET | `/api/brands/all` | Yes | Get all brands including hidden |
| POST | `/api/brands` | Yes | Add brand with image upload |
| PUT | `/api/brands/:id` | Yes | Update brand |
| DELETE | `/api/brands/:id` | Yes | Delete brand |
| GET | `/api/certifications` | No | Get active certifications |
| GET | `/api/certifications/all` | Yes | Get all certifications |
| POST | `/api/certifications` | Yes | Add certification |
| PUT | `/api/certifications/:id` | Yes | Update certification |
| DELETE | `/api/certifications/:id` | Yes | Delete certification |

---

## 💾 Database

**MongoDB Atlas** stores only lightweight data (no images):
- `admins` collection: email, hashed password, name
- `brands` collection: name, `logoUrl` (Cloudinary URL), altText, order, isActive
- `certifications` collection: title, description, year, `logoUrl`, sealEmoji, order, isActive

All images are on **Cloudinary CDN** — fast global delivery.

---

## 🆓 Free Tier Limits

| Service | Free Limit | Notes |
|---------|-----------|-------|
| Netlify | 100GB bandwidth/month | More than enough |
| Render | 750 hrs/month | Sleeps after 15min idle (wakes in ~30s) |
| MongoDB Atlas | 512MB storage | Enough for thousands of entries |
| Cloudinary | 25GB storage, 25GB transfer | Plenty for logos |

> 💡 **Render Free Tier Tip**: The backend "sleeps" after 15 minutes of inactivity. First request takes ~30 seconds to wake up. This is normal on free tier.

---

## 🌐 Custom Domain (Optional Free Options)

- **Freenom**: Free `.tk`, `.ml`, `.ga` domains (go to freenom.com)
- **Netlify subdomain**: `yourbrand.netlify.app` is free and looks professional
- **Paid .in domain**: ~₹500/year on GoDaddy/Namecheap

---

## ❓ Local Development (Testing on Your PC)

```bash
# Terminal 1: Start Backend
cd D:\websitem\DOD\backend
npm install
# create .env file first!
npm run dev

# Terminal 2: Open Frontend
# Open index.html with Live Server extension in VS Code
# Update BACKEND_URL = 'http://localhost:5000' in index.html
```

Admin panel local URL: `http://localhost:5500/admin/index.html`
