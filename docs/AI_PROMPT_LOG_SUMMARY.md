# Executive Summary: AI Prompt & Engineering Interaction Log
**Project:** Campus Community Reporting System  
**Architecture:** Vanilla HTML5/CSS3/JS + Google Apps Script + Google Sheets + Supabase Storage  
**Scope:** 10 Core Lifecycle Phases + 2 Major Feature Iterations  

---

## 📊 Lifecycle Overview Matrix

| Log Entry | Phase / Feature | User Prompt Intent | Primary AI Engineering Deliverables | Core Decisions & Mitigations |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Phase 1: Requirements Analysis** | Problem statement, 10-phase rules, tech stack constraints. | `docs/REQUIREMENTS.md`, initial roadmap. | Defined 5 functional clusters; scoped MVP; deferred raw Google Drive upload to avoid fragile auth. |
| **2** | **Phase 2: System Architecture** | Architect 3-tier serverless topology. | `docs/SYSTEM_ARCHITECTURE.md`, sequence flows. | Mitigated Apps Script CORS/redirects using `text/plain` & `redirect: "follow"`; concurrency locking strategy. |
| **3** | **Phase 3: Database Design** | Provision schema & data operations. | `docs/DATABASE_SETUP.md`, `backend/Database.gs`. | 4-table relational model on Google Sheets (`Users`, `Reports`, `Comments`, `Notifications`); `LockService` thread safety. |
| **4** | **Phase 4: Backend Implementation** | Full Apps Script backend logic. | `backend/*.gs`, `docs/API_DOCUMENTATION.md`. | Salted SHA-256 password digests; automated in-app notifications on status changes; strict input validation. |
| **5** | **Phase 5: Frontend Implementation** | Complete 11-page responsive UI. | 11 HTML views, `css/style.css`, modular JS. | Dynamic navbar in `auth.js`; role route protection; evaluator demo quick-fill buttons; local mock fallback. |
| **6** | **Phase 6: API Integration** | Connect frontend to Apps Script. | `frontend/js/api.js`, `docs/DEPLOYMENT_GUIDE.md`. | Centralized `API_URL`; live latency & health diagnostic check; zero-friction offline/live toggling. |
| **7** | **Phase 7: Testing & QA** | Verification & test matrix. | `docs/TESTING.md`, automated verification. | 22 formal end-to-end test cases across 5 suites; 91/91 structural test assertions passed (100% pass rate). |
| **8** | **Phase 8: Debugging & Hardening** | Bug triage & edge-case fixes. | `docs/DEBUGGING_REPORT.md`, patch fixes. | Fixed Google Sheets boolean string coercion (`is_read`); hardened date parsers; case-insensitive enum checks. |
| **9** | **Phase 9: Project Documentation** | Production docs & repository prep. | `README.md`, `.gitignore`, `AI_PROMPT_LOG.md`. | Team role breakdown; architecture defense narratives; clean evaluator quick-start instructions. |
| **10** | **Feature: Student Visibility & Comments** | Community transparency & peer discussion. | Multi-student mock data, scope filters, thread UI. | Dual-scope ("All Campus" vs "My Reports"); author role badges; peer corroboration without granting admin status rights. |
| **11** | **Feature: Photo Attachments** | Photo uploads for reports & comments without changing core stack. | `frontend/js/storage.js`, Supabase bucket, lightbox. | Client-side Canvas compression (shrinking multi-MB photos to ~300KB); direct Supabase CDN uploads; `image_url` column in Sheets; fullscreen lightbox. |

---

## 🏆 Key Architectural Defenses (Hackathon & Grading Panel)

1. **Why Google Sheets instead of SQL?**
   - Eliminates database hosting costs, connection strings, and credential leaks. Allows campus administrators to audit, filter, and export incident reports directly in an intuitive spreadsheet.
2. **Why Supabase Storage for Photos instead of Google Drive?**
   - Google Drive links require complex OAuth scopes, break with cross-domain iframe permissions, and expire. Supabase Storage provides permanent public CDN URLs directly from lightweight browser `fetch()` uploads without altering the Apps Script database engine.
3. **Why Client-Side Image Compression?**
   - High-resolution smartphone cameras produce 5–15 MB images. Compressing photos down to 1200px / ~300KB in the browser via HTML5 Canvas before uploading saves storage bandwidth and ensures instant submissions even on slow campus Wi-Fi.
4. **How are Concurrency Conflicts Prevented?**
   - Google Apps Script uses Google’s distributed `LockService.getScriptLock()` with a 10-second wait lock during table mutations, ensuring atomic row appends.
