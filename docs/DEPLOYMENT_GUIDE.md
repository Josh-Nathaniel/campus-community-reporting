# GOOGLE APPS SCRIPT WEB APP DEPLOYMENT & INTEGRATION GUIDE
**Project Name:** Campus Community Reporting System  
**Document:** End-to-End Cloud Deployment & API Integration Runbook  
**Target Responsible Member:** Student Member 1 (Backend Lead) & Student Member 3 (Integration Lead)  

---

## 1. Overview

This guide walks your team through deploying the `backend/` Google Apps Script files to Google Drive, linking them to your `CampusAppDB` Google Spreadsheet, deploying as a serverless Web App, and binding the resulting endpoint URL to the frontend.

---

## 2. Step-by-Step Deployment Runbook

### Step 1: Create the Google Sheets Database
1. Open your browser and navigate to [Google Sheets](https://sheets.new).
2. Name the spreadsheet: **`CampusAppDB`**.
3. Copy the **Spreadsheet ID** from the browser URL:
   ```text
   https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j/edit
                                          ^^^^^^^^^^^^^^^^^^^^
                                             SPREADSHEET_ID
   ```

---

### Step 2: Open Google Apps Script
1. In the Google Sheets top menu bar, click:  
   **Extensions $\rightarrow$ Apps Script**.
2. Rename the project in the top left from *"Untitled project"* to:  
   **`CampusReportingBackend`**.

---

### Step 3: Copy Modular Code Files
In the Apps Script editor left panel, delete the default empty `Code.gs` or rename/replace it. Create 5 script files using the **`+`** icon $\rightarrow$ **Script**:

1. **`Database.gs`**:
   - Copy all contents from [`backend/Database.gs`](file:///C:/Users/brand/.gemini/antigravity/scratch/campus-community-reporting/backend/Database.gs).
   - *(Note: If your Apps Script was opened from Extensions > Apps Script, leave `var SPREADSHEET_ID = "";` as is. It automatically connects to the container spreadsheet!)*
2. **`Utils.gs`**:
   - Copy all contents from [`backend/Utils.gs`](file:///C:/Users/brand/.gemini/antigravity/scratch/campus-community-reporting/backend/Utils.gs).
3. **`Auth.gs`**:
   - Copy all contents from [`backend/Auth.gs`](file:///C:/Users/brand/.gemini/antigravity/scratch/campus-community-reporting/backend/Auth.gs).
4. **`Reports.gs`**:
   - Copy all contents from [`backend/Reports.gs`](file:///C:/Users/brand/.gemini/antigravity/scratch/campus-community-reporting/backend/Reports.gs).
5. **`Code.gs`**:
   - Copy all contents from [`backend/Code.gs`](file:///C:/Users/brand/.gemini/antigravity/scratch/campus-community-reporting/backend/Code.gs).

Click the **Save Project** icon (floppy disk) or press `Ctrl + S` / `Cmd + S`.

---

### Step 4: Run the One-Click Database Initializer
1. In the toolbar dropdown (which shows available functions), select:  
   **`setupDatabase`**.
2. Click **Run**.
3. Google will present an **"Authorization Required"** modal:
   - Click **Review Permissions**.
   - Select your Google account.
   - Click **Advanced** (in small text) $\rightarrow$ **Go to CampusReportingBackend (unsafe)**.
   - Click **Allow**.
4. The script will execute in $\approx 2$ seconds.
5. Check your `CampusAppDB` spreadsheet! You will see 4 sheets automatically created with bold headers:
   - `Users`
   - `Reports`
   - `Comments`
   - `Notifications`

---

### Step 5: Deploy as a Serverless Web App (CRITICAL CONFIGURATION)
1. In the top right corner of the Apps Script editor, click:  
   **Deploy $\rightarrow$ New deployment**.
2. Click the gear icon next to *"Select type"* $\rightarrow$ choose **Web app**.
3. Fill out the configuration fields **EXACTLY** as follows:
   - **Description:** `Campus Reporting API v1`
   - **Execute as:** `Me (your-email@gmail.com)` *(Default)*
   - **Who has access:** **`Anyone`**  
     *(⚠️ CRITICAL: Must be "Anyone" so the frontend web app can query without triggering a Google OAuth login prompt!)*
4. Click **Deploy**.
5. Copy the **Web App URL**:
   ```text
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

### Step 6: Connect the Frontend

You have two simple ways to connect the frontend:

#### Option A: Hardcode in `frontend/js/api.js` (Recommended for final GitHub Pages demo)
Open [`frontend/js/api.js`](file:///C:/Users/brand/.gemini/antigravity/scratch/campus-community-reporting/frontend/js/api.js) and paste your URL on Line 10:
```javascript
const API_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

#### Option B: Live In-Browser Connection Setting (Instant Testing)
1. Open any frontend page (e.g., `frontend/index.html` or `frontend/login.html`) in your browser.
2. In the navigation bar, click the badge: **`🔌 API: Local Mock`**.
3. Paste your Web App URL into the modal input.
4. Click **Test Connection** — you will immediately see:
   `Connected to Google Apps Script successfully! (xxx ms response)`
5. Click **Save & Apply**!

---

## 3. Verifying the Full Integration Cycle

Once connected, run through this test sequence to verify end-to-end integration:

1. **User Registration:** Register a new user at `register.html`. Check your Google Sheet `Users` tab — a new row will instantly appear with a salted SHA-256 password hash!
2. **User Login:** Log in with those credentials at `login.html`.
3. **Submit Report:** Submit a new issue at `create-report.html`. Check your Google Sheet `Reports` tab — the incident ticket will appear with status `Pending`.
4. **Admin Triage:** Log in with an admin account, open `admin-reports.html`, and change the status to `In Progress`. Check the `Notifications` tab in Google Sheets — an automated alert is generated for the student!
5. **Student Notifications:** Log back in as the student and open `notifications.html` — the alert is visible and can be marked as read!

---

## 4. Troubleshooting Common Apps Script Deployment Issues

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **CORS / Preflight Error** | POST request used `Content-Type: application/json`. | Our `api.js` explicitly uses `text/plain;charset=utf-8` to bypass preflight OPTIONS. Never change this header back to `application/json`. |
| **HTML Login Prompt Returned Instead of JSON** | "Who has access" was set to "Only myself". | In Apps Script: Click **Deploy > Manage deployments > Edit > Who has access > Anyone > Deploy**. |
| **Code changes in Apps Script not taking effect** | Apps Script requires a new version deployment. | In Apps Script: Click **Deploy > Manage deployments > Edit > Version: New version > Deploy**. |
| **Spreadsheet permission error** | `setupDatabase` or Apps Script was not authorized. | Run `setupDatabase` once manually in the Apps Script editor and click "Allow" on the authorization screen. |
