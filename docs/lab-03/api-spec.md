# TokTickIT Lab 3 — REST API Specification

## 1. Overview & General Conventions

This document defines the complete REST API contract for TokTickIT Lab 3.

### 1.1 Authentication & Session Handling
- Authentication is maintained via Express `express-session` server-side session management (stored in-memory or database session store). The HTTP-Only cookie (`toktickit_session`) carries the signed session identifier, while active user session state is stored and maintained on the server side.
- Cookie settings: `HttpOnly = true`, `SameSite = strict`, `Path = /`, 8-hour expiration. Loaded with server secret (`SESSION_SECRET`).
- State-mutating requests (`POST`, `PATCH`, `PUT`, `DELETE`) require the `X-Requested-With: XMLHttpRequest` custom header for CSRF protection.
- All protected endpoints require a valid session. Unauthenticated requests return `HTTP 401 Unauthorized`.
- Users marked with `mustChangePassword = true` are restricted: requesting standard routes returns `HTTP 403 Forbidden` with error code `MUST_CHANGE_PASSWORD` until `POST /api/auth/change-password` succeeds (`BR-02`). Only `POST /api/auth/change-password`, `POST /api/auth/logout`, and `GET /api/auth/me` remain accessible.

### 1.2 Standard Error Format
All 4xx and 5xx API error responses conform to a unified JSON structure:
```json
{
  "error": "Human-readable error message summary",
  "code": "OPTIONAL_ERROR_CODE",
  "details": [
    { "field": "email", "message": "Valid email address is required" }
  ]
}
```

---

## 2. Authentication & Session Endpoints

### 2.1 User Login
- **HTTP Method**: `POST`
- **Path**: `/api/auth/login`
- **Purpose**: Authenticate user with email and password credentials.
- **Authentication**: None required (Public).
- **Permitted Roles**: Public.
- **Request Body (`application/json`)**:
  ```json
  {
    "email": "jennifer.a@toktickit.local",
    "password": "Initial123!"
  }
  ```
- **Validation Rules**: `email` must be non-empty valid email string; `password` must be non-empty string.
- **Successful Response (`HTTP 200 OK`)**: Sets HTTP-Only auth session cookie `toktickit_session`.
  ```json
  {
    "user": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@toktickit.local",
      "role": "REQUESTER",
      "mustChangePassword": true,
      "isActive": true
    }
  }
  ```
- **Error Responses**:
  - `HTTP 400 Bad Request`: Validation failure.
  - `HTTP 401 Unauthorized`: Invalid email/password or account is inactive (`isActive = false`). Safe message without exposing account active state (`BR-01`).
  - `HTTP 500 Internal Server Error`: Server failure.

### 2.2 User Logout
- **HTTP Method**: `POST`
- **Path**: `/api/auth/logout`
- **Purpose**: Invalidate active user session.
- **Authentication**: Required (`HTTP 401` if missing).
- **Permitted Roles**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- **Request Body**: None.
- **Successful Response (`HTTP 200 OK`)**: Clears auth cookie `toktickit_session`.
  ```json
  { "message": "Successfully logged out" }
  ```

### 2.3 Get Current Authenticated User
- **HTTP Method**: `GET`
- **Path**: `/api/auth/me`
- **Purpose**: Retrieve profile and role of currently logged-in user.
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  {
    "user": {
      "id": 1,
      "name": "Jennifer Anderson",
      "email": "jennifer.a@toktickit.local",
      "role": "REQUESTER",
      "mustChangePassword": false,
      "isActive": true
    }
  }
  ```

### 2.4 Mandatory Password Change
- **HTTP Method**: `POST`
- **Path**: `/api/auth/change-password`
- **Purpose**: Change user password (used for initial password change `BR-02` or voluntary change).
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- **Request Body (`application/json`)**:
  ```json
  {
    "currentPassword": "Initial123!",
    "newPassword": "NewSecurePassword123!",
    "confirmPassword": "NewSecurePassword123!"
  }
  ```
- **Validation Rules**:
  - `currentPassword`: Required string.
  - `newPassword`: Required string, min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (`!@#$%^&*`).
  - `confirmPassword`: Must match `newPassword`.
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  {
    "message": "Password changed successfully",
    "mustChangePassword": false
  }
  ```
- **Error Responses**:
  - `HTTP 400 Bad Request`: Password rules failure or passwords do not match.
  - `HTTP 401 Unauthorized`: Current password incorrect.

---

## 3. Reference Data Endpoints

### 3.1 Get Active Categories
- **HTTP Method**: `GET`
- **Path**: `/api/categories`
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- **Successful Response (`HTTP 200 OK`)**: Array of active category objects.

### 3.2 Get Active Related Systems
- **HTTP Method**: `GET`
- **Path**: `/api/related-systems`
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
- **Successful Response (`HTTP 200 OK`)**: Array of active system objects.

---

## 4. Authenticated Requester Ticket & Attachment Endpoints

### 4.1 Create Ticket (Requester)
- **HTTP Method**: `POST`
- **Path**: `/api/tickets`
- **Purpose**: Create a new ticket owned by the authenticated Requester. Automatically initializes `itPriority` to match `requestedPriority` (`BR-13`, `BR-17`).
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (`HTTP 403` for IT Staff / Admin).
- **Request Body (`application/json`)**:
  ```json
  {
    "categoryId": 2,
    "relatedSystemId": 7,
    "requestedPriority": "MEDIUM",
    "summary": "Laptop screen flickers randomly",
    "description": "My laptop display flickers intermittently when connected to external monitor."
  }
  ```
- **Validation**: Summary (5–150 chars), Description (10–3000 chars), valid active Category and System IDs.
- **Successful Response (`HTTP 201 Created`)**:
  ```json
  {
    "id": 105,
    "ticketNumber": "TKT-2026-000105",
    "summary": "Laptop screen flickers randomly",
    "description": "My laptop display flickers intermittently when connected to external monitor.",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "currentStatus": "NEW",
    "requesterId": 1,
    "assignedStaffId": null,
    "categoryId": 2,
    "relatedSystemId": 7,
    "createdAt": "2026-09-18T10:00:00.000Z"
  }
  ```

### 4.2 List Owned Tickets (Requester)
- **HTTP Method**: `GET`
- **Path**: `/api/tickets`
- **Purpose**: Retrieve paginated list of tickets owned strictly by the logged-in Requester (`BR-03`, `BR-06`).
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER`.
- **Query Parameters**: `search`, `categoryId`, `requestedPriority`, `currentStatus`, `sortBy`, `sortOrder`, `page`, `limit`.
- **Successful Response (`HTTP 200 OK`)**: Paginated JSON object with `data` array and `pagination` metadata.

### 4.3 Get Owned Ticket Detail (Requester)
- **HTTP Method**: `GET`
- **Path**: `/api/tickets/:id`
- **Purpose**: Fetch details of an owned ticket.
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Must own ticket; returns `HTTP 404 Not Found` if owned by another requester to prevent existence leakage `BR-16`).
- **Successful Response (`HTTP 200 OK`)**: Ticket details object.

### 4.4 List Ticket Attachments (History & Active)
- **HTTP Method**: `GET`
- **Path**: `/api/tickets/:id/attachments`
- **Purpose**: Retrieve attachment metadata list for a ticket, including soft-removed attachment history (`BR-20`).
- **Authentication**: Required.
- **Permitted Roles**: Requester (Owner), `IT_STAFF`, `ADMINISTRATOR` (Returns `404 Not Found` for unowned Requester request `BR-16`).
- **Query Parameters**: `includeRemoved` (boolean, default `true`).
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  [
    {
      "id": 12,
      "originalName": "error_screenshot.png",
      "fileSize": 1048576,
      "mimeType": "image/png",
      "isRemoved": false,
      "removalReason": null,
      "createdAt": "2026-09-18T10:05:00.000Z"
    },
    {
      "id": 11,
      "originalName": "old_architecture_diagram.pdf",
      "fileSize": 204800,
      "mimeType": "application/pdf",
      "isRemoved": true,
      "removalReason": "Superseded architecture diagram",
      "removedAt": "2026-09-18T10:10:00.000Z",
      "createdAt": "2026-09-18T10:01:00.000Z"
    }
  ]
  ```

### 4.5 Upload Attachment to Owned Ticket
- **HTTP Method**: `POST`
- **Path**: `/api/tickets/:id/attachments`
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Must own ticket; returns `404 Not Found` if unowned `BR-16`).
- **Form Data**: `file` (Binary file).
- **Validation**: JPG, JPEG, PNG, WEBP, PDF only; max 5 MB; max 5 active attachments per ticket.
- **Successful Response (`HTTP 201 Created`)**: Attachment metadata object.

### 4.6 Download Active Attachment
- **HTTP Method**: `GET`
- **Path**: `/api/attachments/:id/download`
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Owner), `IT_STAFF`, `ADMINISTRATOR`.
- **Successful Response (`HTTP 200 OK`)**: Binary file stream with headers.
- **Error Response**: `HTTP 410 Gone` if attachment was soft-removed (`BR-20`); `HTTP 404 Not Found` if Requester does not own ticket (`BR-16`).

### 4.7 Soft-Remove Attachment
- **HTTP Method**: `POST`
- **Path**: `/api/attachments/:id/soft-remove`
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Owner; returns `404 Not Found` if unowned).
- **Request Body**: `{ "removalReason": "Superseded file version" }` (5–250 chars).
- **Successful Response (`HTTP 200 OK`)**: Updated attachment metadata object (`isRemoved = true`, `removalReason`, `removedAt`).

---

## 5. Public Comments & Resolution Indication Endpoints

### 5.1 Get Public Comments
- **HTTP Method**: `GET`
- **Path**: `/api/tickets/:id/comments`
- **Purpose**: Retrieve list of Public Comments for a ticket.
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Owner), `IT_STAFF`, `ADMINISTRATOR` (Unowned Requester returns `404 Not Found` `BR-16`).
- **Successful Response (`HTTP 200 OK`)**: Array of comment objects.

### 5.2 Post Public Comment
- **HTTP Method**: `POST`
- **Path**: `/api/tickets/:id/comments`
- **Purpose**: Append a Public Comment to a ticket.
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Owner), `IT_STAFF`, `ADMINISTRATOR`.
- **Request Body (`application/json`)**:
  ```json
  { "content": "I tried restarting the device, but the flickering persists." }
  ```
- **Validation & Authorship Rules**:
  - `content`: Non-empty string, trimmed, 3 to 1000 characters (`BR-15`). Whitespace-only or < 3 chars rejected (`HTTP 400 Bad Request`).
  - `authorId`: Derived strictly from session user on backend (`BR-21`). Client attempts to supply or override `authorId` or `createdAt` are ignored/rejected.
  - `createdAt`: Generated by server timestamp (`BR-21`).
- **Successful Response (`HTTP 201 Created`)**: Created comment object with author role badge.

### 5.3 Indicate Problem Appears Resolved (Requester)
- **HTTP Method**: `POST`
- **Path**: `/api/tickets/:id/indicate-resolved`
- **Purpose**: Allow Requester to indicate resolution intent (`BR-05`).
- **Authentication**: Required.
- **Permitted Roles**: `REQUESTER` (Must own ticket; unowned returns `404 Not Found`).
- **Request Body (`application/json`)**:
  ```json
  { "comment": "The display issue seems to have stopped after driver update." }
  ```
- **Validation Rules**:
  - `comment`: Non-empty string, trimmed, 3 to 1000 characters (`BR-15`). Whitespace-only or < 3 chars rejected (`HTTP 400 Bad Request`).
  - `authorId`: Derived strictly from session user on backend (`BR-21`).
- **Successful Response (`HTTP 200 OK`)**: Appends public resolution comment without changing status to `RESOLVED` directly (`BR-05`).

---

## 6. IT Staff Ticket Queue & Operations Endpoints

### 6.1 Get IT Staff Ticket Queue
- **HTTP Method**: `GET`
- **Path**: `/api/staff/tickets`
- **Purpose**: Retrieve paginated list of all system tickets for IT Staff queue management.
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF`, `ADMINISTRATOR` (Read oversight; `HTTP 403` for Requester).
- **Query Parameters**: `search`, `categoryId`, `itPriority`, `currentStatus`, `assignedStaffId`, `sortBy` (default: `createdAt`), `sortOrder` (default: `desc`), `page` (default: `1`), `limit` (default: `10`). Omitted or invalid query parameters fall back safely to these defaults (`FR-12`).
- **Successful Response (`HTTP 200 OK`)**: Paginated tickets JSON object.

### 6.2 Get IT Staff Ticket Detail
- **HTTP Method**: `GET`
- **Path**: `/api/staff/tickets/:id`
- **Purpose**: Retrieve complete ticket details for IT Staff operation dashboard.
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF`, `ADMINISTRATOR` (Read oversight).
- **Successful Response (`HTTP 200 OK`)**: Full ticket object.

### 6.3 Claim / Assign / Reassign Ticket Ownership
- **HTTP Method**: `PATCH`
- **Path**: `/api/staff/tickets/:id/assign`
- **Purpose**: Claim ticket or assign ownership to an active IT Staff or active Administrator account (`BR-12`).
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF` (`HTTP 403` for Administrator).
- **Request Body (`application/json`)**: `{ "assignedStaffId": 5 }` (`null` to unassign).
- **Validation**: `assignedStaffId` must reference an active user with role `IT_STAFF` or `ADMINISTRATOR`. Assigning to a `REQUESTER`, inactive user, or non-existent ID returns `HTTP 400 Bad Request` (`INVALID_ASSIGNMENT_TARGET`).
- **Successful Response (`HTTP 200 OK`)**: Updated ticket object.

### 6.4 Update IT Priority
- **HTTP Method**: `PATCH`
- **Path**: `/api/staff/tickets/:id/priority`
- **Purpose**: Update `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) (`BR-13`).
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF` (`HTTP 403` for Administrator).
- **Request Body (`application/json`)**: `{ "itPriority": "HIGH" }`
- **Successful Response (`HTTP 200 OK`)**: Updated ticket object.

### 6.5 Update Ticket Status (State Machine)
- **HTTP Method**: `PATCH`
- **Path**: `/api/staff/tickets/:id/status`
- **Purpose**: Transition ticket status according to status transition matrix (`BR-14`).
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF` (`HTTP 403` for Administrator).
- **Request Body (`application/json`)**:
  ```json
  {
    "status": "RESOLVED",
    "resolutionSummary": "Replaced display cable and updated graphics driver."
  }
  ```
- **Validation**:
  - Target status must be valid enum and permitted from current status per transition matrix.
  - `resolutionSummary` (optional/encouraged up to 1000 chars) may be provided when `status` is `RESOLVED` (`BR-19`).
- **Successful Response (`HTTP 200 OK`)**: Updated ticket object with `resolutionSummary`.
- **Error Response**: `HTTP 400 Bad Request` (`INVALID_STATUS_TRANSITION`) if transition is invalid.

### 6.6 Get Internal Notes
- **HTTP Method**: `GET`
- **Path**: `/api/staff/tickets/:id/notes`
- **Purpose**: Retrieve private Internal Notes for a ticket (`BR-04`).
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF`, `ADMINISTRATOR` (`HTTP 403` for Requester).
- **Successful Response (`HTTP 200 OK`)**: Array of internal note objects.

### 6.7 Post Internal Note
- **HTTP Method**: `POST`
- **Path**: `/api/staff/tickets/:id/notes`
- **Purpose**: Append a private Internal Note to a ticket (`BR-04`).
- **Authentication**: Required.
- **Permitted Roles**: `IT_STAFF`, `ADMINISTRATOR` (`HTTP 403` for Requester).
- **Request Body (`application/json`)**: `{ "content": "Diagnostics completed." }`
- **Validation & Authorship Rules**:
  - `content`: Non-empty string, trimmed, 3 to 2000 characters (`BR-15`). Whitespace-only rejected (`HTTP 400 Bad Request`).
  - `authorId`: Derived strictly from session user on backend (`BR-21`). Client attempts to supply or override `authorId` or `createdAt` are ignored/rejected.
  - `createdAt`: Generated by server timestamp (`BR-21`).
- **Successful Response (`HTTP 201 Created`)**: Created internal note object.

---

## 7. Administrator User Management Endpoints

### 7.1 List Users (Admin Only)
- **HTTP Method**: `GET`
- **Path**: `/api/admin/users`
- **Purpose**: Retrieve list of user accounts with search and role filter.
- **Authentication**: Required.
- **Permitted Roles**: `ADMINISTRATOR` (`HTTP 403` for Requester and IT Staff).
- **Query Parameters**: `search`, `role`.
- **Successful Response (`HTTP 200 OK`)**: Array of user objects.

### 7.2 Create User (Admin Only)
- **HTTP Method**: `POST`
- **Path**: `/api/admin/users`
- **Purpose**: Create a new user account with one permitted role and an initial password (`BR-06`, `BR-08`).
- **Authentication**: Required.
- **Permitted Roles**: `ADMINISTRATOR`.
- **Request Body (`application/json`)**:
  ```json
  {
    "name": "Alex Thompson",
    "email": "alex.t@toktickit.local",
    "role": "IT_STAFF",
    "isActive": true,
    "initialPassword": "Initial123!"
  }
  ```
- **Validation**: Email unique (`BR-07`), role valid, initial password satisfies rules.
- **Successful Response (`HTTP 201 Created`)**: Created user object (`mustChangePassword = true`).
- **Error Responses**:
  - `HTTP 409 Conflict`: Duplicate email (`EMAIL_ALREADY_EXISTS`).
  - `HTTP 400 Bad Request`: Validation failure.

### 7.3 Edit User Account (Admin Only)
- **HTTP Method**: `PATCH`
- **Path**: `/api/admin/users/:id`
- **Purpose**: Update user's name, email, role, or active status.
- **Authentication**: Required.
- **Permitted Roles**: `ADMINISTRATOR`.
- **Request Body (`application/json`)**: `{ "name": "Alex Thompson Jr.", "role": "IT_STAFF", "isActive": true }`
- **Safety Rules**: Self-deactivation rejected (`400`, `BR-09`); last admin removal rejected (`400`, `BR-10`); duplicate email rejected (`409`, `BR-07`).
- **Successful Response (`HTTP 200 OK`)**: Updated user object.

### 7.4 Reset User Initial Password (Admin Only)
- **HTTP Method**: `POST`
- **Path**: `/api/admin/users/:id/reset-password`
- **Purpose**: Set a new initial password for a user, flagging `mustChangePassword = true` (`BR-08`).
- **Authentication**: Required.
- **Permitted Roles**: `ADMINISTRATOR`.
- **Request Body (`application/json`)**: `{ "initialPassword": "NewInitial123!" }`
- **Successful Response (`HTTP 200 OK`)**: User object with `mustChangePassword = true`.

---

## 8. HTTP Status Codes Summary Table

| Code | Status Name | Scenario / Usage |
| :---: | :--- | :--- |
| `200` | OK | Successful GET, search, status change, priority change, login, logout, password change |
| `201` | Created | Resource created (ticket, attachment, comment, internal note, user account) |
| `400` | Bad Request | Validation error, password rules failure, invalid transition, invalid assignment target, admin self-deactivation |
| `401` | Unauthorized | Unauthenticated access attempt or invalid login credentials |
| `403` | Forbidden | Insufficient role permissions or first-password lock (`MUST_CHANGE_PASSWORD`) |
| `404` | Not Found | Target resource ID does not exist or unowned Requester resource (`BR-16`) |
| `409` | Conflict | Duplicate email address when creating or editing user account (`EMAIL_ALREADY_EXISTS`) |
| `410` | Gone | Download request for soft-removed attachment (`BR-20`) |
| `500` | Internal Error | Unexpected database failure (sanitized error message) |
