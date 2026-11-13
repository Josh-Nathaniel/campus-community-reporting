# DEBUGGING & SYSTEM HARDENING REPORT (DEBUGGING_REPORT.md)
**Project Name:** Campus Community Reporting System  
**Lead Engineer:** Senior Mentor & Student Team (M1, M2, M3)  
**Process Model:** Strict 8-Step Root Cause Analysis (RCA) & Minimal Surgical Fixes  

---

## 1. Overview of the 8-Step Debugging Protocol

During Phase 8, all potential runtime anomalies, edge cases, and cross-platform type discrepancies were triaged using our standardized 8-step debugging protocol:
1. **Identify the error**
2. **Reproduce the error**
3. **Identify the responsible file**
4. **Explain the likely cause**
5. **Propose a fix**
6. **Implement the smallest appropriate fix**
7. **Test again**
8. **Document important bugs and fixes**

---

## 2. Bug Triage & Root Cause Analyses

### Case 1: Google Sheets Boolean Coercion in Notifications
- **What went wrong:**
  When reading the `is_read` column from the `Notifications` Google Sheet, values written as `FALSE` or `"FALSE"` were occasionally evaluated as *read* by the frontend. In JavaScript:
  ```javascript
  Boolean("FALSE") === true; // Non-empty string evaluates truthy!
  ```
  This caused unread notifications to miss the unread highlight badge if Google Sheets serialized them as uppercase strings.
- **Why it went wrong:**
  Google Sheets cell values read via Apps Script `sheet.getValues()` can return boolean `false`, string `"FALSE"`, string `"false"`, or integer `0` depending on user editing and spreadsheet locale settings.
- **Responsible file:**
  `frontend/js/notifications.js`
- **What was changed:**
  Implemented a robust boolean normalization helper `isNotificationRead(val)`:
  ```javascript
  function isNotificationRead(val) {
    if (val === true || val === 1) return true;
    if (typeof val === "string") {
      const s = val.trim().toLowerCase();
      return s === "true" || s === "1";
    }
    return false;
  }
  ```
  Updated notification rendering condition to: `const isUnread = !isNotificationRead(n.is_read);`
- **How it was tested:**
  Passed test inputs: `true`, `false`, `"TRUE"`, `"FALSE"`, `"true"`, `"false"`, `0`, `1`, `""`, and `null`. Confirmed that only explicit affirmative values evaluate as read, while all unread permutations trigger the unread badge and highlight.

---

### Case 2: In-Browser Date Parsing Anomalies
- **What went wrong:**
  When `r.created_at` was empty, malformed, or formatted differently across browser engines, calling `new Date(isoString).toLocaleDateString(...)` could render `"Invalid Date"` in table cells.
- **Why it went wrong:**
  The original helper lacked an explicit `isNaN(d.getTime())` guard prior to calling `toLocaleDateString`.
- **Responsible files:**
  `frontend/js/dashboard.js`, `frontend/js/reports.js`, `frontend/js/admin.js`, `frontend/js/notifications.js`
- **What was changed:**
  Hardened `formatDate(isoString)` and `formatDateTime(isoString)`:
  ```javascript
  function formatDate(isoString) {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return String(isoString);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return String(isoString);
    }
  }
  ```
- **How it was tested:**
  Passed empty strings `""`, `null`, invalid date strings `"not-a-date"`, and standard ISO strings `"2026-09-01T10:00:00.000Z"`. Verified that invalid dates fallback gracefully to the raw string or `"-"` without throwing exceptions or rendering `"Invalid Date"`.

---

### Case 3: Category & Status Case-Sensitivity in Backend
- **What went wrong:**
  In `backend/Reports.gs`, `VALID_CATEGORIES.indexOf(category) === -1` performed strict case-sensitive checks. If an external client or script submitted `"facilities"` (lowercase) instead of `"Facilities"`, the request was rejected with `Invalid category`.
- **Why it went wrong:**
  Strict equality checking without case normalization made the API fragile to variations in client serialization.
- **Responsible file:**
  `backend/Reports.gs`
- **What was changed:**
  Implemented case-insensitive loop matching that normalizes the input value to the canonical title-cased enum:
  ```javascript
  var matchedCategory = null;
  for (var c = 0; c < VALID_CATEGORIES.length; c++) {
    if (VALID_CATEGORIES[c].toLowerCase() === category.toLowerCase()) {
      matchedCategory = VALID_CATEGORIES[c];
      break;
    }
  }
  if (!matchedCategory) {
    throw new Error("Invalid category. Must be one of: " + VALID_CATEGORIES.join(", "));
  }
  category = matchedCategory;
  ```
  Applied the identical pattern to `status` in `handleUpdateReportStatus`.
- **How it was tested:**
  Submitted payloads with `"facilities"`, `"FACILITIES"`, `"Facilities"`, `"in progress"`, and `"resolved"`. Verified that all inputs were accepted and correctly stored in their canonical title-cased representation.

---

### Case 4: Blank Table Rows on Empty Admin Reports Filter
- **What went wrong:**
  In `frontend/js/admin.js`, if a filter resulted in an empty set, `renderAdminTableRows()` returned `""`, rendering an empty `<tbody>` instead of an informative placeholder.
- **Why it went wrong:**
  The function assumed caller handling and lacked an empty-array defensive guard.
- **Responsible file:**
  `frontend/js/admin.js`
- **What was changed:**
  Added defensive check at the top of `renderAdminTableRows()`:
  ```javascript
  if (!reports || reports.length === 0) {
    return '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No reports found matching criteria.</td></tr>';
  }
  ```
- **How it was tested:**
  Selected non-matching filter criteria in `admin-reports.html`. Verified that a centered row appears stating "No reports found matching criteria."

---

## 3. Regression Test Verification

Following the implementation of all surgical fixes:
- Re-ran the automated verification suite `scratch/verify_system.ps1`:
  **91/91 assertions passed with 0 failures**.
- Confirmed zero regressions across DOM element IDs, router cases, and script links.
