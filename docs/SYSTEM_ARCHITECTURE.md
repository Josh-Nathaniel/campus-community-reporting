# PHASE 2: SYSTEM ARCHITECTURE & DESIGN SPECIFICATION
**Project Name:** Campus Community Reporting System  
**Document:** System Architecture & Technical Design  
**Author:** Senior System Architect / Technical Mentor  
**Target Audience:** Computer Engineering Student Team & Hackathon Evaluators  

---

## 1. High-Level Architectural Overview

The Campus Community Reporting System follows a **3-Tier Serverless Architecture** that completely removes the operational overhead of managing physical or cloud virtual servers:

```text
+-------------------------------------------------------------------------+
|                         TIER 1: PRESENTATION LAYER                      |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |                      Client Web Browser                         |   |
|   |  - HTML5 Pages (Landing, Dashboards, Forms, Details)            |   |
|   |  - CSS3 (Responsive Design, Mobile/Desktop Layouts, Badges)    |   |
|   |  - Vanilla JavaScript (DOM manipulation, Session state)         |   |
|   |  - Fetch API (`api.js`) with Redirect Follow & Error Handling   |   |
|   +-----------------------------------------------------------------+   |
+------------------------------------+------------------------------------+
                                     |
                       HTTPS Requests (JSON / GET / POST)
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         TIER 2: API & LOGIC LAYER                       |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |              Google Apps Script Web App (Serverless)            |   |
|   |  - Entrypoints: `doGet(e)` and `doPost(e)`                      |   |
|   |  - Action Router & Dispatcher (`Code.gs`)                       |   |
|   |  - Authentication & Password Hashing (`Auth.gs`)                |   |
|   |  - Report Processing & Status Transition Engine (`Reports.gs`)  |   |
|   |  - Concurrency Control (`LockService` in `Database.gs`)         |   |
|   |  - Data Sanitization & JSON Response Serializer (`Utils.gs`)    |   |
|   +-----------------------------------------------------------------+   |
+------------------------------------+------------------------------------+
                                     |
                         Google Apps Script API Calls
                            (`SpreadsheetApp` SDK)
                                     |
                                     v
+------------------------------------+------------------------------------+
|                        TIER 3: DATA STORAGE LAYER                       |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |                Google Sheets Database (`CampusAppDB`)           |   |
|   |  - Sheet `Users`: User accounts, roles, salted password hashes  |   |
|   |  - Sheet `Reports`: Issue tickets, status, categories           |   |
|   |  - Sheet `Comments`: Collaboration messages per report ticket   |   |
|   |  - Sheet `Notifications`: In-app alerts for ticket updates      |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

---

## 2. Text-Based Architectural Diagram

```text
[ Browser / Mobile Client ]
         |
         | 1. HTTP GET / POST
         v
[ Google Apps Script Web App URL ]
         |
         +--> [ doGet(e) ] --------> Action Router (?action=...)
         |                              |-- 'users'         --> Auth.getUsers()
         |                              |-- 'reports'       --> Reports.getReports()
         |                              |-- 'report'        --> Reports.getReportById(id)
         |                              +-- 'notifications' --> Reports.getNotifications(userId)
         |
         +--> [ doPost(e) ] -------> Action Router (body.action)
                                        |-- 'register'             --> Auth.register(data)
                                        |-- 'login'                --> Auth.login(data)
                                        |-- 'createReport'         --> Reports.create(data)
                                        |-- 'createComment'        --> Reports.addComment(data)
                                        |-- 'updateReportStatus'   --> Reports.updateStatus(data)
                                        +-- 'markNotificationRead' --> Reports.markNotificationRead(data)
                                        |
                                        v
                                 [ LockService ] (Thread safety)
                                        v
                            [ SpreadsheetApp API ]
                                        v
                         [ Google Sheets: CampusAppDB ]
                           ├── Users
                           ├── Reports
                           ├── Comments
                           └── Notifications
```

---

## 3. User Roles & Access Control Model

The system enforces a Role-Based Access Control (RBAC) model dividing the system into two distinct roles:

```text
+-----------------------+-----------------------------+-------------------------------+
| Feature / Operation   | Student (`student`)         | Administrator (`admin`)       |
+-----------------------+-----------------------------+-------------------------------+
| User Registration     | Yes (Self-service)          | No (Provisioned or Promoted)  |
| Login & Session       | Yes                         | Yes                           |
| View Personal Reports | Yes                         | Yes (Can view all)            |
| View All Reports      | No                          | Yes                           |
| Create New Report     | Yes                         | Yes                           |
| Change Report Status  | NO (Forbidden)              | YES (Full status control)     |
| Post Comments         | Yes (On accessible reports) | Yes (Official responses)      |
| View Notifications    | Yes (Personal stream only)  | Yes (Personal stream only)    |
| View User Directory   | NO (Forbidden)              | YES                           |
+-----------------------+-----------------------------+-------------------------------+
```

### 3.1 Client-Side Route Guards (`auth.js`)
- Each protected page checks `localStorage.getItem("campus_user")`.
- If no active session exists, the user is redirected to `login.html`.
- For admin-only pages (`admin-dashboard.html`, `admin-reports.html`, `admin-users.html`), the script verifies `user.role === "admin"`. If not an admin, the student is redirected to `dashboard.html` with an access alert.

### 3.2 Server-Side Permission Verification (`Auth.gs` & `Reports.gs`)
- High-privilege operations (`updateReportStatus`, `users` listing) require the caller to provide an `admin_user_id`. The backend verifies the user ID exists in the `Users` sheet and possesses `role === "admin"`.

---

## 4. Frontend & Backend Relationship

### 4.1 Stateless Client-Server Model
1. The frontend consists of pure, static assets (HTML, CSS, JS) that can be hosted on GitHub Pages or opened locally in any browser.
2. The Google Apps Script Web App is completely stateless. It does not retain server-side session memory across requests.
3. Every mutating request contains the caller's identity (`user_id`).

### 4.2 Handling Google Apps Script Peculiarities
- **The HTTP 302 Redirect Challenge:** When an external browser sends a `POST` request to an Apps Script Web App, Google issues an HTTP 302 redirect to `script.googleusercontent.com` before returning the final response.
- **Solution:** In `js/api.js`, all `fetch()` calls explicitly specify:
  ```javascript
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  ```
- **Why `text/plain`?** Using `Content-Type: application/json` triggers a CORS pre-flight `OPTIONS` request. Google Apps Script Web Apps **do not support OPTIONS pre-flights**. By using `text/plain;charset=utf-8` containing a stringified JSON body, the browser treats it as a "simple request", bypassing the OPTIONS pre-flight entirely while allowing Apps Script to parse `JSON.parse(e.postData.contents)`.

---

## 5. API Communication Protocol & Unified Response Contract

All communication adheres to a deterministic, structured JSON envelope:

### 5.1 Standard Success Envelope
```json
{
  "success": true,
  "message": "Human-readable status summary",
  "data": { ... }
}
```

### 5.2 Standard Error Envelope
```json
{
  "success": false,
  "message": "Clear explanation of the error",
  "data": null
}
```

### 5.3 Unified Action Routing
Google Apps Script exposes a single web endpoint URL (`https://script.google.com/macros/s/.../exec`). Routing is dispatched internally via action parameters:
- **GET:** `?action=<actionName>&param1=value1`
- **POST:** Payload JSON body `{ "action": "<actionName>", "payloadField": ... }`

---

## 6. Database Entity Relationship (Google Sheets Schema)

The database `CampusAppDB` comprises four interconnected sheets:

```text
+-----------------------+              +------------------------------+
|        Users          | 1          * |           Reports            |
+-----------------------+--------------+------------------------------+
| PK  id                |              | PK  id                       |
|     name              |              | FK  user_id                  |
|     email (UNIQUE)    |              |     title                    |
|     password_hash     |              |     description              |
|     role              |              |     category                 |
|     created_at        |              |     status                   |
+-----------+-----------+              |     created_at               |
            |                          |     updated_at               |
            | 1                        +--------------+---------------+
            |                                         | 1
            |                                         |
            |                                         | *
            | *                        +--------------+---------------+
+-----------v-----------+              |           Comments           |
|     Notifications     |              +------------------------------+
+-----------------------+              | PK  id                       |
| PK  id                |              | FK  report_id                |
| FK  user_id           |              | FK  user_id                  |
|     message           |              |     comment                  |
|     is_read           |              |     created_at               |
|     created_at        |              +------------------------------+
+-----------------------+
```

### 6.1 Entity Definitions
1. **Users:** Holds credentials, role (`student` or `admin`), and registration timestamp.
2. **Reports:** Stores individual incident tickets submitted by students. Tied to `user_id`.
3. **Comments:** Stores conversation trail per ticket. Relates to both `report_id` and `user_id`.
4. **Notifications:** Stores actionable updates generated for users when report statuses are updated or comments are posted.

---

## 7. Core Data Flows & Sequence Diagrams

### 7.1 Report Submission Flow
```text
Student Browser                 api.js                  Google Apps Script (doPost)         Google Sheets (Reports)
      |                            |                                    |                              |
      | 1. Fill Form & Click       |                                    |                              |
      |    "Submit Report"         |                                    |                              |
      |--------------------------->|                                    |                              |
      |                            | 2. POST { action: "createReport",  |                              |
      |                            |    user_id, title, desc, cat }     |                              |
      |                            |----------------------------------->|                              |
      |                            |                                    | 3. LockService.getScriptLock |
      |                            |                                    |    Validate fields           |
      |                            |                                    | 4. Generate UUID & timestamp |
      |                            |                                    | 5. Append Row to 'Reports'   |
      |                            |                                    |----------------------------->|
      |                            |                                    | 6. Release ScriptLock        |
      |                            | 7. Return JSON { success: true }   |                              |
      |                            |<-----------------------------------|                              |
      | 8. Show Success Alert &    |                                    |                              |
      |    Redirect to reports.html|                                    |                              |
      |<---------------------------|                                    |                              |
```

### 7.2 Admin Status Update & Automated Notification Flow
```text
Admin Browser                   api.js                  Google Apps Script (doPost)         Google Sheets
      |                            |                                    |                              |
      | 1. Select New Status       |                                    |                              |
      |    (e.g., "Resolved")      |                                    |                              |
      |    & Click "Update"        |                                    |                              |
      |--------------------------->|                                    |                              |
      |                            | 2. POST { action: "updateStatus",  |                              |
      |                            |    report_id, status, admin_id }   |                              |
      |                            |----------------------------------->|                              |
      |                            |                                    | 3. Verify Admin Role         |
      |                            |                                    | 4. LockService.getScriptLock |
      |                            |                                    | 5. Locate row & update status|
      |                            |                                    |    and updated_at timestamp  |
      |                            |                                    |----------------------------->|
      |                            |                                    | 6. Generate Notification:    |
      |                            |                                    |    "Your report #[id] is now |
      |                            |                                    |     Resolved."               |
      |                            |                                    | 7. Append Row to             |
      |                            |                                    |    'Notifications' sheet     |
      |                            |                                    |----------------------------->|
      |                            |                                    | 8. Release ScriptLock        |
      |                            | 9. Return JSON { success: true }   |                              |
      |                            |<-----------------------------------|                              |
      | 10. Update UI Badge & Toast|                                    |                              |
      |<---------------------------|                                    |                              |
```

---

## 8. Concurrency & Reliability Architecture

### 8.1 Google Sheets Race Conditions & Mitigation
In Google Sheets, if two users submit records simultaneously, both script instances might read the same last row index (`sheet.getLastRow()`) before appending, resulting in overwritten rows.

**Mitigation via `LockService`:**
```javascript
function safeSheetAppend(sheet, rowValues) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 10 seconds for concurrent executions to finish
    lock.waitLock(10000);
    sheet.appendRow(rowValues);
    SpreadsheetApp.flush(); // Force immediate persistence
    return true;
  } catch (e) {
    throw new Error("Database is currently busy. Please try again in a few moments.");
  } finally {
    lock.releaseLock();
  }
}
```

### 8.2 Client-Side Latency Mitigation
To manage the 1–3 second execution latency typical of Google Apps Script:
1. **Button Debounce & Loading State:** On submit button click, disable button, show spinner, and change text to `"Processing..."`.
2. **Global Network Handler:** All `fetch()` calls in `api.js` are wrapped in a `try...catch` block displaying friendly user notices if the request times out or experiences connection drops.

---

## 9. Security Architecture & Student Defense Rationale

### 9.1 Password Hashing Strategy
- **Mechanism:** When a user registers or logs in, the backend computes:
  $$\text{password\_hash} = \text{SHA-256}(\text{raw\_password} + \text{salt})$$
  implemented via Google Apps Script's native `Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8)`.
- **Defense Explanation for Hackathon Presentation:**
  > *"Because Google Apps Script is a sandboxed JavaScript runtime that does not support C-compiled native libraries like bcrypt or Argon2, we implemented cryptographic salted SHA-256 digests using Google's native `Utilities.computeDigest`. This guarantees that plain-text passwords are never stored in Google Sheets. In a future production iteration, a dedicated identity provider (such as Google OAuth or Firebase Auth) could be integrated."*

---

## 10. Verification of Phase 2 Deliverables
- [x] End-to-end 3-tier system architecture clearly described.
- [x] Clear text-based and ASCII architecture diagrams.
- [x] Comprehensive RBAC matrix defining student vs admin capabilities.
- [x] Explicit handling of Apps Script CORS / 302 redirect behavior documented.
- [x] Full database entity relationship schema specified.
- [x] Sequence flows documented for report creation and admin status updating.
- [x] Concurrency safety with `LockService` documented with implementation blueprint.
