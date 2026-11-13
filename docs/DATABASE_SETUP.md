# PHASE 3: DATABASE DESIGN & SPREADSHEET SETUP
**Project Name:** Campus Community Reporting System  
**Database Engine:** Google Sheets (`SpreadsheetApp`)  
**Spreadsheet Name:** `CampusAppDB`  
**Target Responsible Member:** Student Member 1 (Backend & Database Lead)  

---

## 1. Database Overview

The system uses **Google Sheets** as a lightweight, tabular NoSQL-style relational store. Each sheet within the `CampusAppDB` workbook represents a database table.

### Primary Design Objectives:
1. **Zero Deployment Friction:** Does not require provisioning cloud SQL servers or database credentials.
2. **Human-Readable & Auditable:** Campus administrators can visually inspect, filter, or export data directly within Google Sheets.
3. **Structured Schema Enforcement:** The backend Apps Script layer (`Database.gs`) enforces strict header ordering, validation, and serialization.

---

## 2. Table Schemas & Data Types

The database consists of **4 sheets**: `Users`, `Reports`, `Comments`, and `Notifications`.

### 2.1 Table: `Users`
Stores authentication credentials, profile names, and role-based permissions.

| Column Index | Column Header | Data Type | Nullable | Description & Constraints |
| :---: | :--- | :--- | :---: | :--- |
| **A** | `id` | String | NO | Primary Key. Format: `USR-YYYYMMDD-XXXX` or UUID. |
| **B** | `name` | String | NO | Full name of student or campus staff member. |
| **C** | `email` | String | NO | Unique email address. Must be lowercased and trimmed. |
| **D** | `password_hash` | String | NO | Cryptographic salted SHA-256 digest string. Never plain text. |
| **E** | `role` | String | NO | Allowed values: `student` \| `admin`. |
| **F** | `created_at` | ISO 8601 String | NO | Timestamp of registration (e.g., `2026-09-01T08:00:00.000Z`). |

---

### 2.2 Table: `Reports`
Stores incident tickets logged by students and community members.

| Column Index | Column Header | Data Type | Nullable | Description & Constraints |
| :---: | :--- | :--- | :---: | :--- |
| **A** | `id` | String | NO | Primary Key. Format: `REP-YYYYMMDD-XXXX`. |
| **B** | `user_id` | String | NO | Foreign Key $\rightarrow$ `Users.id`. Submitting user. |
| **C** | `title` | String | NO | Short summary of the incident (max 100 chars). |
| **D** | `description` | String | NO | Detailed description of the problem/location. |
| **E** | `category` | String | NO | Allowed values: `Facilities`, `Equipment`, `Sanitation`, `Safety`, `Infrastructure`, `Other`. |
| **F** | `status` | String | NO | Allowed values: `Pending`, `In Progress`, `Resolved`, `Rejected`. Default: `Pending`. |
| **G** | `created_at` | ISO 8601 String | NO | Ticket creation timestamp. |
| **H** | `updated_at` | ISO 8601 String | NO | Last status transition timestamp. |
| **I** | `image_url` | String | YES | Public CDN URL of attached incident photo (Supabase Storage). |

---

### 2.3 Table: `Comments`
Stores conversational collaboration and inquiry notes on individual tickets.

| Column Index | Column Header | Data Type | Nullable | Description & Constraints |
| :---: | :--- | :--- | :---: | :--- |
| **A** | `id` | String | NO | Primary Key. Format: `COM-YYYYMMDD-XXXX`. |
| **B** | `report_id` | String | NO | Foreign Key $\rightarrow$ `Reports.id`. Associated incident. |
| **C** | `user_id` | String | NO | Foreign Key $\rightarrow$ `Users.id`. Author of comment. |
| **D** | `comment` | String | NO | Text content of comment. |
| **E** | `created_at` | ISO 8601 String | NO | Timestamp when comment was posted. |
| **F** | `image_url` | String | YES | Public CDN URL of optional attached comment photo. |

---

### 2.4 Table: `Notifications`
Stores in-app notifications delivered to users when incident statuses change.

| Column Index | Column Header | Data Type | Nullable | Description & Constraints |
| :---: | :--- | :--- | :---: | :--- |
| **A** | `id` | String | NO | Primary Key. Format: `NOTIF-YYYYMMDD-XXXX`. |
| **B** | `user_id` | String | NO | Foreign Key $\rightarrow$ `Users.id`. Recipient user. |
| **C** | `message` | String | NO | Human-readable notification message. |
| **D** | `is_read` | Boolean | NO | Values: `TRUE` \| `FALSE`. Default: `FALSE`. |
| **E** | `created_at` | ISO 8601 String | NO | Notification dispatch timestamp. |

---

## 3. Seed Data / Initial Benchmark Records

To facilitate testing and live hackathon demonstration, the database is pre-seeded with baseline accounts and sample tickets.

### 3.1 Sheet: `Users` (Row 1 is Header)
| id | name | email | password_hash | role | created_at |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `USR-ADM-001` | Campus Administrator | `admin@campus.edu` | *(Hash of `Admin@123` + salt)* | `admin` | `2026-09-01T08:00:00.000Z` |
| `USR-STU-001` | Alex Rivera | `alex.rivera@student.campus.edu` | *(Hash of `Student@123` + salt)* | `student` | `2026-09-01T09:00:00.000Z` |

*(Note: Salted hashes will be generated using the backend hashing utility in `Auth.gs`)*

### 3.2 Sheet: `Reports` (Row 1 is Header)
| id | user_id | title | description | category | status | created_at | updated_at |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REP-101` | `USR-STU-001` | Water leak in 3rd Floor Lab | Pipe under sink #3 in Room EN-304 is leaking onto the floor. | `Facilities` | `Pending` | `2026-09-01T10:00:00.000Z` | `2026-09-01T10:00:00.000Z` |
| `REP-102` | `USR-STU-001` | Broken Oscilloscope Bench 4 | Screen does not power on when plugged in. | `Equipment` | `In Progress` | `2026-09-01T11:00:00.000Z` | `2026-09-01T14:30:00.000Z` |
| `REP-103` | `USR-STU-001` | Overflowing bin near cafeteria | Bin outside south exit is full and attracting pests. | `Sanitation` | `Resolved` | `2026-08-30T13:00:00.000Z` | `2026-08-31T09:00:00.000Z` |

### 3.3 Sheet: `Comments` (Row 1 is Header)
| id | report_id | user_id | comment | created_at |
| :--- | :--- | :--- | :--- | :--- |
| `COM-201` | `REP-102` | `USR-ADM-001` | Facility technician dispatched to inspect the fuse on Bench 4. | `2026-09-01T14:30:00.000Z` |

### 3.4 Sheet: `Notifications` (Row 1 is Header)
| id | user_id | message | is_read | created_at |
| :--- | :--- | :--- | :--- | :--- |
| `NOTIF-301` | `USR-STU-001` | Your report "Broken Oscilloscope Bench 4" status was updated to In Progress. | `FALSE` | `2026-09-01T14:30:00.000Z` |

---

## 4. Step-by-Step Setup Guide for Student Team

### Step 1: Create the Google Spreadsheet
1. Open [Google Sheets](https://sheets.new).
2. Rename the spreadsheet to: **`CampusAppDB`**.
3. Note the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/`**`<YOUR_SPREADSHEET_ID>`**`/edit`

### Step 2: Configure the Sheets and Headers
You can set up the 4 sheets manually by adding sheets `Users`, `Reports`, `Comments`, `Notifications` and entering the headers in Row 1.  
*Alternatively (Recommended):* The backend code in `backend/Database.gs` includes a helper function `setupDatabase()` that automatically creates all sheets and headers programmatically with a single click!

### Step 3: Connect to Google Apps Script
1. In the Google Sheets menu, click **Extensions > Apps Script**.
2. Rename the Apps Script project to: **`CampusReportingBackend`**.
3. Replace the default files with the modular backend files in `backend/`.

---

## 5. Security & Architectural Limitations of Google Sheets as a Database

When defending the project during the hackathon presentation, the student team can present this honest technical trade-off analysis:

| Capability | Google Sheets DB (Our MVP) | Traditional SQL (PostgreSQL / MySQL) | Student Defense Explanation |
| :--- | :--- | :--- | :--- |
| **Hosting Cost** | \$0 (Zero cost) | \$15–\$50/month cloud host | Perfect for rapid hackathon prototyping and zero-cost student deployment. |
| **Concurrency** | Max ~30 concurrent writes | Thousands of concurrent writes | Handled gracefully in Apps Script using `LockService` for low-to-moderate campus traffic. |
| **Query Flexibility** | Sequential row scans (`getValues()`) | Indexed B-tree queries | For hundreds to thousands of records, memory scans in Apps Script complete in $< 100\text{ms}$. |
| **Visual Auditing** | Direct live GUI in Google Drive | Requires Adminer, pgAdmin, or custom UI | Campus administrators can visually inspect and verify tickets immediately. |
