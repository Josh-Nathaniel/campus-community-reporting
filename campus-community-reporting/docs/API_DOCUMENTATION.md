# REST-LIKE API DOCUMENTATION
**Project Name:** Campus Community Reporting System  
**Backend:** Google Apps Script Web App  
**Protocol:** HTTPS  
**Standard Format:** JSON  

---

## 1. Overview & General Invocation Rules

The backend is deployed as a single Google Apps Script Web App endpoint:
```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

### 1.1 Invocation Protocol
- **GET Requests:** Use standard URL query parameters (e.g., `?action=reports&user_id=USR-101`).
- **POST Requests:** Send stringified JSON payloads. To bypass browser CORS `OPTIONS` pre-flights and accommodate Google Apps Script 302 redirects, all client `fetch` calls MUST use:
  ```javascript
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  redirect: "follow"
  ```

### 1.2 Standard Response Envelopes

#### Success Envelope (HTTP 200)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error Envelope (HTTP 200 with error flag)
```json
{
  "success": false,
  "message": "Descriptive error explanation",
  "data": null
}
```

---

## 2. GET Endpoints (Data Retrieval)

### 2.1 Retrieve Reports List
Fetches reports. If `role` is `student` and `user_id` is supplied, filters to personal reports. If `role` is `admin` (or omitted), returns all campus reports.

- **Query Parameters:**
  - `action`: `reports` (Required)
  - `user_id`: String (Optional. Submitting user ID)
  - `role`: String (Optional. `student` | `admin`)
- **Example URL:**
  `GET /exec?action=reports&user_id=USR-1725350400-A1B2&role=student`
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Reports retrieved successfully",
    "data": [
      {
        "id": "REP-1725351000-X1Y2",
        "user_id": "USR-1725350400-A1B2",
        "user_name": "Alex Rivera",
        "title": "Water leak in Room 304",
        "description": "Pipe under the second sink is leaking.",
        "category": "Facilities",
        "status": "Pending",
        "created_at": "2026-09-01T10:00:00.000Z",
        "updated_at": "2026-09-01T10:00:00.000Z"
      }
    ]
  }
  ```

---

### 2.2 Retrieve Single Report Details & Comments
Fetches complete metadata for a single report along with its entire conversation comment thread.

- **Query Parameters:**
  - `action`: `report` (Required)
  - `id`: String (Required. Report ID)
- **Example URL:**
  `GET /exec?action=report&id=REP-1725351000-X1Y2`
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Report details retrieved successfully",
    "data": {
      "report": {
        "id": "REP-1725351000-X1Y2",
        "user_id": "USR-1725350400-A1B2",
        "user_name": "Alex Rivera",
        "title": "Water leak in Room 304",
        "description": "Pipe under the second sink is leaking.",
        "category": "Facilities",
        "status": "Pending",
        "created_at": "2026-09-01T10:00:00.000Z",
        "updated_at": "2026-09-01T10:00:00.000Z"
      },
      "comments": [
        {
          "id": "COM-1725352000-C3D4",
          "report_id": "REP-1725351000-X1Y2",
          "user_id": "USR-1725350999-ADM1",
          "user_name": "Campus Administrator",
          "comment": "Maintenance crew scheduled for 2:00 PM inspection.",
          "created_at": "2026-09-01T11:00:00.000Z"
        }
      ]
    }
  }
  ```

---

### 2.3 Retrieve User Notifications
Retrieves all in-app notifications targeting a specific user, sorted newest first.

- **Query Parameters:**
  - `action`: `notifications` (Required)
  - `user_id`: String (Required. Recipient User ID)
- **Example URL:**
  `GET /exec?action=notifications&user_id=USR-1725350400-A1B2`
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Notifications retrieved successfully",
    "data": [
      {
        "id": "NOTIF-1725353000-N1N2",
        "user_id": "USR-1725350400-A1B2",
        "message": "Your report 'Water leak in Room 304' status was updated to: In Progress",
        "is_read": false,
        "created_at": "2026-09-01T11:00:00.000Z"
      }
    ]
  }
  ```

---

### 2.4 Retrieve Registered Users (Admin Only)
Fetches the registered user directory for administrative auditing. Requires `admin_id` of a verified admin account.

- **Query Parameters:**
  - `action`: `users` (Required)
  - `admin_id`: String (Required. Requesting Admin User ID)
- **Example URL:**
  `GET /exec?action=users&admin_id=USR-1725350999-ADM1`
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Users retrieved successfully",
    "data": [
      {
        "id": "USR-1725350400-A1B2",
        "name": "Alex Rivera",
        "email": "alex.rivera@student.campus.edu",
        "role": "student",
        "created_at": "2026-09-01T09:00:00.000Z"
      }
    ]
  }
  ```

---

## 3. POST Endpoints (Mutations)

### 3.1 User Registration
Creates a new student or admin account. Enforces email uniqueness and generates salted password hash.

- **Payload:**
  ```json
  {
    "action": "register",
    "name": "Alex Rivera",
    "email": "alex.rivera@student.campus.edu",
    "password": "StudentPassword123",
    "role": "student"
  }
  ```
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Account registered successfully.",
    "data": {
      "id": "USR-1725350400-A1B2",
      "name": "Alex Rivera",
      "email": "alex.rivera@student.campus.edu",
      "role": "student",
      "created_at": "2026-09-01T09:00:00.000Z"
    }
  }
  ```

---

### 3.2 User Login
Authenticates credentials against stored password hash.

- **Payload:**
  ```json
  {
    "action": "login",
    "email": "alex.rivera@student.campus.edu",
    "password": "StudentPassword123"
  }
  ```
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "data": {
      "id": "USR-1725350400-A1B2",
      "name": "Alex Rivera",
      "email": "alex.rivera@student.campus.edu",
      "role": "student",
      "created_at": "2026-09-01T09:00:00.000Z"
    }
  }
  ```

---

### 3.3 Create Report
Submits a new campus incident ticket. Default status is always initialized to `Pending`.

- **Payload:**
  ```json
  {
    "action": "createReport",
    "user_id": "USR-1725350400-A1B2",
    "title": "Water leak in Room 304",
    "description": "Pipe under second sink is dripping consistently onto floor.",
    "category": "Facilities"
  }
  ```
- **Allowed Categories:** `Facilities`, `Equipment`, `Sanitation`, `Safety`, `Infrastructure`, `Other`
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Report submitted successfully.",
    "data": {
      "id": "REP-1725351000-X1Y2",
      "user_id": "USR-1725350400-A1B2",
      "user_name": "Alex Rivera",
      "title": "Water leak in Room 304",
      "description": "Pipe under second sink is dripping consistently onto floor.",
      "category": "Facilities",
      "status": "Pending",
      "created_at": "2026-09-01T10:00:00.000Z",
      "updated_at": "2026-09-01T10:00:00.000Z"
    }
  }
  ```

---

### 3.4 Update Report Status (Admin Only)
Transitions an incident report to a new lifecycle state. Automatically emits an in-app notification to the original student author.

- **Payload:**
  ```json
  {
    "action": "updateReportStatus",
    "report_id": "REP-1725351000-X1Y2",
    "status": "In Progress",
    "admin_id": "USR-1725350999-ADM1"
  }
  ```
- **Allowed Statuses:** `Pending`, `In Progress`, `Resolved`, `Rejected`
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Report status updated successfully.",
    "data": {
      "id": "REP-1725351000-X1Y2",
      "status": "In Progress",
      "updated_at": "2026-09-01T11:00:00.000Z"
    }
  }
  ```

---

### 3.5 Create Comment
Adds a message to a report's conversation thread.

- **Payload:**
  ```json
  {
    "action": "createComment",
    "report_id": "REP-1725351000-X1Y2",
    "user_id": "USR-1725350400-A1B2",
    "comment": "The leak appears to be accelerating; maintenance needed promptly."
  }
  ```
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Comment posted successfully.",
    "data": {
      "id": "COM-1725352000-C3D4",
      "report_id": "REP-1725351000-X1Y2",
      "user_id": "USR-1725350400-A1B2",
      "user_name": "Alex Rivera",
      "comment": "The leak appears to be accelerating; maintenance needed promptly.",
      "created_at": "2026-09-01T10:30:00.000Z"
    }
  }
  ```

---

### 3.6 Mark Notification Read
Flags a notification as read.

- **Payload:**
  ```json
  {
    "action": "markNotificationRead",
    "notification_id": "NOTIF-1725353000-N1N2"
  }
  ```
- **Example Response:**
  ```json
  {
    "success": true,
    "message": "Notification marked as read.",
    "data": {
      "id": "NOTIF-1725353000-N1N2"
    }
  }
  ```
