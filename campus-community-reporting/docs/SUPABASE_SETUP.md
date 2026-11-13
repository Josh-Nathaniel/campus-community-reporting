# Supabase Storage Setup Guide (Photo Attachments)
**Project Name:** Campus Community Reporting System  
**Feature:** Incident & Comment Photo Uploads  
**Storage Provider:** Supabase Storage (Free Tier)  

---

## 1. Why Supabase Storage?
- **Zero backend burden:** Photos are uploaded directly from the client's browser to Supabase Storage via lightweight REST `fetch()`.
- **Permanent Public URLs:** No signed URL expirations or complex token refreshes.
- **No Google Drive link headaches:** Keeps Google Sheets clean by storing standard, fast CDN image URLs instead of base64 chunks or restricted Drive links.

---

## 2. 2-Minute Quick Setup

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New Project**.
3. Choose a name (e.g., `campus-reporting`) and database password.
4. Select your nearest region and click **Create new project**.

---

### Step 2: Create the Storage Bucket
1. From the left sidebar, click **Storage** (folder icon).
2. Click **New Bucket**.
3. Set **Bucket name** to: `report-photos`.
4. Toggle **Public bucket** to **ON** (Enabled).  
   *(This allows students and administrators to view images via direct CDN links without authentication tokens).*
5. Click **Save bucket**.

---

### Step 3: Configure Storage Policies (Allow Uploads)
1. In the **Storage** section, click **Policies** (or the **Configuration** tab).
2. Under `report-photos` bucket policies, click **New Policy** $\rightarrow$ **For full customization** (or **Get started quickly**).
3. Set:
   - **Policy Name:** `Allow public image uploads`
   - **Allowed operation:** Check `INSERT` (and optionally `SELECT`)
   - **Target roles:** Select `anon` (or `public`)
   - **Policy definition (`WITH CHECK` expression):** `true`
4. Click **Review** and then **Save Policy**.

*(Tip: Because the bucket is marked Public, `SELECT` reads are already permitted automatically).*

---

### Step 4: Copy Your API Credentials
1. In the left sidebar, go to **Project Settings** (gear icon) $\rightarrow$ **API**.
2. Find the following two values:
   - **Project URL:** e.g., `https://xyzabcdefghijklmnop.supabase.co`
   - **Project API Keys $\rightarrow$ `anon` / `public` Key:** `eyJhbGciOi...`

---

### Step 5: Configure in the Application
You can connect your credentials in **either** of two ways:

#### Option A: In `frontend/js/storage.js` (Recommended for deployment)
Open `frontend/js/storage.js` and paste your credentials into the `SUPABASE_CONFIG` object:
```javascript
const SUPABASE_CONFIG = {
  url: "https://your-project-id.supabase.co",
  anonKey: "eyJhbGciOi...",
  bucket: "report-photos"
};
```

#### Option B: Via Browser Console (Zero code edit)
Open your browser's Developer Tools Console (`F12`) on any page of the website and run:
```javascript
setSupabaseCredentials("https://your-project-id.supabase.co", "YOUR_ANON_KEY", "report-photos");
```

---

## 3. Google Sheets Updates
Ensure your `CampusAppDB` Google Spreadsheet has the new columns added:
1. Open your `CampusAppDB` spreadsheet.
2. In the **`Reports`** sheet, add column `I` with header: `image_url`.
3. In the **`Comments`** sheet, add column `F` with header: `image_url`.

*That's it! Your campus reporting site is fully configured to upload, optimize, and display photos.*
