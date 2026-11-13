# PHASE 1: REQUIREMENTS ANALYSIS & SPECIFICATION
**Project Name:** Campus Community Reporting System  
**Project Type:** Web-based Campus / Community Issue Reporting Platform  
**Target Audience:** University Students, Faculty, Campus Staff, and Administrators  
**Team Structure:** 3 Computer Engineering Students (Backend, Frontend, QA/Integration)  

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
In campus and university community environments, physical infrastructure breakdowns, facility hazards, and sanitation or safety issues are frequent. Currently, reports are handled informally (word-of-mouth, unorganized group chats, paper logs, or ad-hoc emails). This leads to:
- **Lack of Transparency:** Students have no tracking mechanism to know if an issue has been acknowledged, investigated, or resolved.
- **Delayed Maintenance:** Facilities management and administrative staff struggle to prioritize and triage reports without a centralized queue.
- **Duplicate Reporting:** Multiple users report identical defects without visibility into existing tickets.
- **Accountability Gaps:** No timestamped audit trail exists for issue resolution or status updates.

### 1.2 The Proposed Solution
The **Campus Community Reporting System** is a lightweight, responsive web platform designed to streamline issue reporting and management. It provides:
1. **A Student Portal:** For rapid issue submission with categorical tagging, personal report status tracking, and automated status notifications.
2. **An Administrative Dashboard:** For campus personnel to review incoming tickets, filter by status and category, inspect incident descriptions, and transition reports through an auditable lifecycle (`Pending` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved` or `Rejected`).
3. **A Serverless, Low-Cost Backend:** Built entirely on **Google Apps Script** backed by **Google Sheets** (`CampusAppDB`), ensuring zero hosting expenditure, instant setup, and familiarity for campus administrators.

---

## 2. User Personas & Role Matrix

| Attribute | Persona 1: Student / Community Reporter | Persona 2: Campus Administrator / Facility Manager |
| :--- | :--- | :--- |
| **Role Name** | `student` | `admin` |
| **Primary Goals** | Quickly log broken facilities, track report progress, receive confirmation when issues are fixed. | Monitor all incoming campus issues, update ticket statuses, assign priorities, manage user accountability. |
| **Key Actions** | - Register / Log in<br>- Create reports (Title, Description, Category)<br>- View personal report history & status<br>- Add clarifying comments<br>- View notifications | - Log in<br>- View all campus reports with metrics<br>- Change report status (`Pending`, `In Progress`, `Resolved`, `Rejected`)<br>- Add administrative notes/comments<br>- View registered user list |
| **Access Boundaries** | Cannot alter report statuses. Cannot view other users' private notification streams. | Full read/update access to all reports and registered user directories. |

---

## 3. MVP Scope Definition

### 3.1 In-Scope (Strict Minimum Viable Product)
- [x] **Authentication:** User registration and login for `student` and `admin` roles. Basic secure credential handling (salted SHA-256 digest via Google Apps Script `Utilities.computeDigest`).
- [x] **Report Lifecycle:** Creation of reports with standardized categories (`Facilities`, `Equipment`, `Sanitation`, `Safety`, `Infrastructure`, `Other`) and predefined statuses (`Pending`, `In Progress`, `Resolved`, `Rejected`).
- [x] **Status Transitions:** Admin capability to transition status with timestamp recording (`updated_at`).
- [x] **Student Dashboard & Tracking:** Real-time view of submitted reports and their current statuses.
- [x] **Discussion / Comments:** Basic comment thread per report for follow-up details between students and admins.
- [x] **Notification System:** Automatic in-app notification creation when an admin changes a report status or posts a response.
- [x] **Admin Management:** Unified metrics (counts of pending, in progress, resolved), comprehensive report table, and user directory.
- [x] **Centralized REST-like API:** Google Apps Script Web App responding with standard JSON payloads.

### 3.2 Out-of-Scope (Deferred Post-MVP)
- [ ] Direct file/image uploads to Google Drive (adds multi-part MIME complexity to Apps Script; can be added in v2 via base64 upload).
- [ ] Real-time push notifications or WebSockets (incompatible with stateless Google Apps Script; polling or refresh on load is used instead).
- [ ] Email notifications via Gmail API (consuming daily email quotas during testing creates operational risks).
- [ ] GPS map geolocation integration (unnecessary complexity for initial MVP validation).
- [ ] OAuth2 / Google Sign-In button (requires GCP Console OAuth Client ID and domain verification; custom lightweight auth used for zero-barrier evaluation).
- [ ] Multi-tenant campus partitioning (single campus instance is sufficient for hackathon demonstration).

---

## 4. Functional Requirements (FR)

### FR-1: Account & Authentication
- **FR-1.1:** The system shall allow new users to register with `name`, `email`, `password`, and default role `student`.
- **FR-1.2:** The system shall enforce unique email addresses during registration.
- **FR-1.3:** The system shall authenticate users against stored password hashes and generate an active session stored in browser `localStorage`.
- **FR-1.4:** The system shall support role-based view routing (`student` routed to `dashboard.html`, `admin` routed to `admin-dashboard.html`).
- **FR-1.5:** The system shall provide a secure client-side logout action that purges stored session tokens.

### FR-2: Report Creation & Submission
- **FR-2.1:** A logged-in student shall be able to submit a report specifying: `title`, `description`, and `category`.
- **FR-2.2:** Allowed categories shall be strictly validated: `Facilities`, `Equipment`, `Sanitation`, `Safety`, `Infrastructure`, `Other`.
- **FR-2.3:** Upon submission, the backend shall automatically assign a unique ID, set `status` to `Pending`, set `user_id`, and record `created_at` and `updated_at` timestamps.

### FR-3: Student Report Management
- **FR-3.1:** Students shall view a list of all reports authored by their `user_id`.
- **FR-3.2:** Students shall view detailed metadata for any specific report, including history, current status badge, and conversation comments.
- **FR-3.3:** Students shall be able to post additional comments on their own reports.

### FR-4: Admin Incident Management
- **FR-4.1:** Administrators shall view a comprehensive, filterable list of all submitted reports across all users.
- **FR-4.2:** Administrators shall have exclusive authority to update a report's `status` to `Pending`, `In Progress`, `Resolved`, or `Rejected`.
- **FR-4.3:** Updating a report's status shall automatically generate a record in the `Notifications` table targeting the report author.
- **FR-4.4:** Administrators shall be able to view a directory of all registered users (`id`, `name`, `email`, `role`, `created_at`).

### FR-5: Notifications
- **FR-5.1:** Users shall retrieve their unread notifications via an active notification panel/page.
- **FR-5.2:** Users shall be able to mark notifications as read (`is_read` = `true`).

---

## 5. Non-Functional Requirements (NFR)

### NFR-1: Performance & Responsiveness
- **NFR-1.1:** Because Google Apps Script Web Apps have a typical execution latency of 800ms - 2500ms, the frontend must render explicit loading spinners and disabled button states on all asynchronous operations to prevent duplicate form submissions.
- **NFR-1.2:** Responses from Apps Script must be minimal JSON payloads to conserve execution time and network bandwidth.

### NFR-2: Usability & UI/UX
- **NFR-2.1:** Modern, responsive design functioning seamlessly on mobile viewports ($\le 480\text{px}$) and desktop viewports ($\ge 1024\text{px}$).
- **NFR-2.2:** Accessible color contrast ratios for all status badges (e.g., Yellow for Pending, Blue for In Progress, Green for Resolved, Red for Rejected).
- **NFR-2.3:** Meaningful empty states ("No reports found", "No unread notifications") when tables or lists contain zero records.

### NFR-3: Reliability & Concurrency
- **NFR-3.1:** Google Apps Script backend functions writing to Google Sheets must use `LockService.getScriptLock()` with a timeout to prevent race conditions during concurrent row appends.
- **NFR-3.2:** The API must return standard HTTP status codes or clear JSON error structures `{ "success": false, "message": "..." }` on any exception.

### NFR-4: Security & Privacy
- **NFR-4.1:** **Password Security:** Passwords must never be stored in plain text. Passwords must be hashed using SHA-256 with a unique salt or application pepper.
- **NFR-4.2:** **Input Sanitization:** All text inputs must be sanitized on both frontend and backend to mitigate Cross-Site Scripting (XSS).
- **NFR-4.3:** **Authorization Checks:** Admin actions (`updateReportStatus`, `getUsers`) must verify that the requesting user possesses the `admin` role.

---

## 6. Technical Risks & Mitigation Strategies

| Risk ID | Technical Risk | Impact | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Google Apps Script CORS / 302 Redirect:** Google Apps Script Web Apps issue a 302 redirect for POST responses, which can cause standard `fetch()` calls to drop headers or fail if `redirect: "follow"` is not configured. | High | High | Implement standard `Content-Type: text/plain;charset=utf-8` payload formatting or send payload as URL-encoded/JSON string, ensuring client `fetch` follows redirects cleanly. |
| **R-02** | **Concurrent Write Conflicts:** Simultaneous writes to Google Sheets without synchronization can overwrite rows or misalign row indices. | High | Medium | Enforce `LockService.getScriptLock()` in Apps Script around all write/append operations. Wait up to 10 seconds before timeout. |
| **R-03** | **Apps Script Cold Start Latency:** Free Google Apps Script Web Apps have cold starts when idle, causing requests to take 2-4 seconds. | Medium | High | Add smooth UI skeletons/loading overlays with descriptive messages ("Communicating with campus database..."). |
| **R-04** | **Google Sheets Quotas & Execution Limits:** Apps Script has a 6-minute maximum single execution limit and rate limits on spreadsheet read/write calls. | Medium | Low | Batch sheet reads via `getValues()` instead of reading cell-by-cell. Keep transactions compact. |
| **R-05** | **Public Endpoint Exposure:** A public Web App URL can be queried directly via Postman or cURL. | Medium | Medium | Validate user tokens/IDs on sensitive actions and document this constraint in security limitations for hackathon defense. |

---

## 7. Proposed Project Directory Structure

```text
campus-community-reporting/
│
├── frontend/
│   ├── index.html               # Public landing page with problem overview & CTA
│   ├── login.html               # Authentication login portal
│   ├── register.html            # New user account registration
│   ├── dashboard.html           # Student main overview & quick stats
│   ├── reports.html             # Student's submitted reports list & filter
│   ├── create-report.html       # Report submission form
│   ├── report-details.html      # Detailed ticket view with comments thread
│   ├── notifications.html       # Notification inbox
│   ├── admin-dashboard.html     # Admin system overview & analytics
│   ├── admin-reports.html       # Admin comprehensive report triage & status editor
│   ├── admin-users.html         # Admin user directory view
│   │
│   ├── css/
│   │   └── style.css            # Unified responsive campus theme stylesheet
│   │
│   └── js/
│       ├── api.js               # Centralized API fetch wrapper & endpoint configs
│       ├── auth.js              # Session management, guards, login/logout handlers
│       ├── dashboard.js         # Student dashboard rendering logic
│       ├── reports.js           # Report creation, listing, detail & comment logic
│       ├── notifications.js     # Notification fetching and mark-as-read logic
│       └── admin.js             # Admin report status management & user table logic
│
├── backend/
│   ├── Code.gs                  # Entrypoint: doGet, doPost, routing & dispatch
│   ├── Database.gs              # Google Sheets connection, locks, sheet CRUD helpers
│   ├── Auth.gs                  # Register, login, hash verification & token issuance
│   ├── Reports.gs               # Report CRUD, status transition, comments logic
│   └── Utils.gs                 # ID generators, JSON response formatters, sanitizers
│
├── docs/
│   ├── REQUIREMENTS.md          # (This document) Comprehensive requirements & scope
│   ├── SYSTEM_ARCHITECTURE.md   # Architectural design, data flows, and sequence diagrams
│   ├── DATABASE_SETUP.md        # Google Sheets schema, column definitions & initial data
│   ├── API_DOCUMENTATION.md     # Complete REST-like API contract & payload specifications
│   ├── TESTING.md               # Test matrix, manual test scripts & QA verification
│   └── AI_PROMPT_LOG.md         # Full audit log of AI engineering interactions
│
├── README.md                    # Project overview, setup guide, and team credentials
└── .gitignore                   # Standard web ignore rules (.DS_Store, local configs)
```

---

## 8. Acceptance Criteria for Phase 1 Sign-off
- [x] Clear articulation of the problem domain and campus community benefits.
- [x] Clear boundary definition between Student and Administrator roles.
- [x] Explicit scoping separating the hackathon MVP from future roadmap items.
- [x] Detailed enumeration of functional and non-functional requirements.
- [x] Rigorous risk analysis covering Google Apps Script constraints, CORS, and concurrency.
- [x] Agreed-upon project directory layout matching hackathon requirements.
