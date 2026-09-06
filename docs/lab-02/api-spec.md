# TokTickIT Lab 2 — REST API Specification

## 1. Overview & General Conventions

This document defines the REST API specification for TokTickIT Lab 2.

### Requester-Scoped Identity Header
Because authentication will be introduced in Lab 3, Lab 2 uses a temporary Development Requester selection context. All requester-scoped endpoints require the HTTP header:
`X-Development-Requester-Id: <number>`

- If the header is missing or malformed, the API responds with `HTTP 400 Bad Request`.
- If the header references an inactive requester (`isActive = false`), the API responds with `HTTP 403 Forbidden`.

### Standard Error Response Format
All 4xx and 5xx API error responses conform to a unified JSON structure:
```json
{
  "error": "Human readable summary error message",
  "details": [
    {
      "field": "summary",
      "message": "Summary must be at least 5 characters long"
    }
  ]
}
```

---

## 2. Reference Data Endpoints

### 2.1 Get Active Categories
- **HTTP Method**: `GET`
- **Path**: `/api/categories`
- **Purpose**: Retrieve list of active Ticket Categories for dropdowns and filters.
- **Headers**: None required.
- **Query Parameters**: None.
- **Request Body**: None.
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```
- **Unexpected Error (`HTTP 500 Internal Server Error`)**:
  ```json
  { "error": "Failed to fetch categories" }
  ```

### 2.2 Get Active Related Systems
- **HTTP Method**: `GET`
- **Path**: `/api/related-systems`
- **Purpose**: Retrieve list of active Related Systems for dropdowns and filters.
- **Headers**: None required.
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" },
    { "id": 4, "name": "LEB2 App" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "Corporate Laptop" }
  ]
  ```

### 2.3 Get Active Development Requesters
- **HTTP Method**: `GET`
- **Path**: `/api/requesters`
- **Purpose**: Retrieve active Development Requesters for the testing selection screen. Inactive requesters (`isActive = false`) are excluded (`BR-04`).
- **Headers**: None required.
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  [
    { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@toktickit.local", "department": "Marketing" },
    { "id": 2, "name": "Michael Brown", "email": "michael.b@toktickit.local", "department": "IT Support" },
    { "id": 3, "name": "Sarah Johnson", "email": "sarah.j@toktickit.local", "department": "Human Resources" },
    { "id": 4, "name": "David Lee", "email": "david.l@toktickit.local", "department": "Engineering" }
  ]
  ```

---

## 3. Ticket Management Endpoints

### 3.1 Create Ticket
- **HTTP Method**: `POST`
- **Path**: `/api/tickets`
- **Purpose**: Create a new IT support ticket for the active Development Requester. Initial attachments selected during creation are uploaded sequentially via `POST /api/tickets/:id/attachments` after ticket creation succeeds (`BR-22`).
- **Headers**: `X-Development-Requester-Id: <number>` (Required)
- **Request Body (`application/json`)**:
  ```json
  {
    "categoryId": 2,
    "relatedSystemId": 7,
    "requestedPriority": "MEDIUM",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery drains much faster than usual even when system is idle."
  }
  ```
- **Validation Rules**:
  - `categoryId`: Required integer, must exist in database AND be active (`isActive = true`) (`BR-11`).
  - `relatedSystemId`: Required integer, must exist in database AND be active (`isActive = true`) (`BR-11`).
  - `requestedPriority`: Required enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `summary`: Required string, trimmed, 5 to 150 characters (`BR-09`).
  - `description`: Required string, trimmed, 10 to 3000 characters (`BR-10`).
- **Successful Response (`HTTP 201 Created`)**:
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000101",
    "summary": "Laptop battery drains quickly",
    "description": "My laptop battery drains much faster than usual even when system is idle.",
    "requestedPriority": "MEDIUM",
    "itPriority": "UNASSIGNED",
    "currentStatus": "NEW",
    "requesterId": 1,
    "categoryId": 2,
    "relatedSystemId": 7,
    "createdAt": "2026-08-31T12:00:00.000Z",
    "updatedAt": "2026-08-31T12:00:00.000Z"
  }
  ```
- **Validation Error (`HTTP 400 Bad Request`)**:
  ```json
  {
    "error": "Validation failed",
    "details": [
      { "field": "summary", "message": "Summary must be at least 5 characters long" }
    ]
  }
  ```

### 3.2 List Owned Tickets (Search, Filter, Sort, Paginate)
- **HTTP Method**: `GET`
- **Path**: `/api/tickets`
- **Purpose**: Retrieve a paginated, searchable, and filterable list of tickets owned exclusively by the active requester (`BR-06`).
- **Headers**: `X-Development-Requester-Id: <number>` (Required)
- **Query Parameters Contract**:
  - `search` (optional): Partial string match (`ILIKE`/`contains`) against `ticketNumber`, `summary`, or `description` (`BR-23`).
  - `categoryId` (optional): Filter by Category ID.
  - `requestedPriority` (optional): Filter by enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `currentStatus` (optional): Filter by enum (`NEW`, `OPEN`, `PENDING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
  - `sortBy` (optional): Field to sort by (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`). Default: `createdAt`.
  - `sortOrder` (optional): Sort direction (`asc`, `desc`). Default: `desc`. Secondary sort: `id DESC` (`BR-24`).
  - `page` (optional): Page number (1-indexed). Default: `1`.
  - `limit` (optional): Page size (`10`, `25`, `50`). Default: `10` (`BR-25`).
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "Laptop battery drains quickly",
        "requestedPriority": "MEDIUM",
        "itPriority": "UNASSIGNED",
        "currentStatus": "NEW",
        "category": { "id": 2, "name": "Hardware" },
        "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
        "createdAt": "2026-08-31T12:00:00.000Z",
        "updatedAt": "2026-08-31T12:00:00.000Z"
      }
    ],
    "pagination": {
      "totalItems": 1,
      "totalPages": 1,
      "currentPage": 1,
      "pageSize": 10,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
  ```
- **Invalid Query Error (`HTTP 400 Bad Request`)**: Returned when `page < 1`, invalid `limit`, unknown `sortBy`/`sortOrder`, or invalid filter enums are passed (`BR-25`).

### 3.3 Get Owned Ticket Detail
- **HTTP Method**: `GET`
- **Path**: `/api/tickets/:id`
- **Purpose**: Retrieve the owned Ticket and its Requester, Category, and Related System information.
- **Headers**: `X-Development-Requester-Id: <number>` (Required)
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  {
    "id": 101,
    "ticketNumber": "TKT-2026-000101",
    "summary": "Laptop battery drains quickly",
    "description": "Full description of battery drain issue...",
    "requestedPriority": "MEDIUM",
    "itPriority": "UNASSIGNED",
    "currentStatus": "NEW",
    "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@toktickit.local" },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
    "createdAt": "2026-08-31T12:00:00.000Z",
    "updatedAt": "2026-08-31T12:00:00.000Z"
  }
  ```
- **Ownership Failure (`HTTP 403 Forbidden`)**: Returned when attempting to fetch a ticket owned by another requester (`BR-06`).
- **Missing Resource (`HTTP 404 Not Found`)**: Returned when ticket ID does not exist.

---

## 4. Attachment Management Endpoints

### 4.1 Upload Attachment
- **HTTP Method**: `POST`
- **Path**: `/api/tickets/:id/attachments`
- **Purpose**: Upload a single attachment file to an owned ticket.
- **Headers**: `X-Development-Requester-Id: <number>`, `Content-Type: multipart/form-data`
- **Form Data**: `file` (Binary file)
- **Validation**: File MIME type must be JPG, JPEG, PNG, WEBP, or PDF (`BR-15`). Size ≤ 5 MB (`BR-16`). Active attachments count ≤ 5 (`BR-17`).
- **Successful Response (`HTTP 201 Created`)**:
  ```json
  {
    "id": 12,
    "ticketId": 101,
    "filename": "battery_report.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1048576,
    "isRemoved": false,
    "createdAt": "2026-08-31T12:05:00.000Z"
  }
  ```
- **Limit / Validation Exceeded (`HTTP 400 Bad Request`)**: Returned for invalid MIME type, file size > 5 MB, or active attachments count > 5.
- **Ownership Failure (`HTTP 403 Forbidden`)**: Returned when attempting to upload to another requester's ticket (`BR-06`).

### 4.2 Get Ticket Attachments Metadata
- **HTTP Method**: `GET`
- **Path**: `/api/tickets/:id/attachments`
- **Purpose**: Retrieve list of active and soft-removed attachment metadata for an owned ticket.
- **Headers**: `X-Development-Requester-Id: <number>` (Required)
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  [
    {
      "id": 12,
      "filename": "battery_report.pdf",
      "mimeType": "application/pdf",
      "fileSize": 1048576,
      "isRemoved": false,
      "createdAt": "2026-08-31T12:05:00.000Z"
    },
    {
      "id": 11,
      "filename": "screenshot_old.png",
      "mimeType": "image/png",
      "fileSize": 512000,
      "isRemoved": true,
      "removedAt": "2026-08-31T12:02:00.000Z",
      "removalReason": "Uploaded duplicate image",
      "createdAt": "2026-08-31T12:01:00.000Z"
    }
  ]
  ```

### 4.3 Download Active Attachment (Serves Preview)
- **HTTP Method**: `GET`
- **Path**: `/api/attachments/:id/download`
- **Purpose**: Download or in-browser preview an active attachment file belonging to an owned ticket.
- **Headers**: `X-Development-Requester-Id: <number>` (Required)
- **Successful Response (`HTTP 200 OK`)**: Streams file binary with `Content-Type` (e.g. `application/pdf`, `image/png`) and `Content-Disposition: attachment; filename="<original_name>"`.
- **Soft-Removed Blocked Response (`HTTP 410 Gone`)**: Returned when attempting to download a soft-removed file (`BR-21`).
- **Ownership Failure (`HTTP 403 Forbidden`)**: Returned when attempting to download another requester's attachment (`BR-06`).

### 4.4 Soft-Remove Attachment
- **HTTP Method**: `POST`
- **Path**: `/api/attachments/:id/soft-remove`
- **Purpose**: Soft-remove an active attachment from an owned ticket.
- **Headers**: `X-Development-Requester-Id: <number>` (Required)
- **Request Body (`application/json`)**:
  ```json
  { "removalReason": "Uploaded incorrect log file" }
  ```
- **Validation**: `removalReason` is required, trimmed, 5 to 250 characters (`BR-20`).
- **Successful Response (`HTTP 200 OK`)**:
  ```json
  {
    "id": 12,
    "isRemoved": true,
    "removedAt": "2026-08-31T12:10:00.000Z",
    "removalReason": "Uploaded incorrect log file"
  }
  ```
- **Ownership Failure (`HTTP 403 Forbidden`)**: Returned when attempting to soft-remove another requester's attachment (`BR-06`).

---

## 5. HTTP Status Codes Summary Table

| HTTP Status Code | Name | Scenario / Usage |
|---|---|---|
| `200` | OK | Successful GET, search, filter, download/preview, or soft-removal |
| `201` | Created | Ticket created or attachment uploaded successfully |
| `400` | Bad Request | Validation error, invalid file type, size > 5MB, attachment limit > 5, invalid query params, missing/malformed requester header |
| `403` | Forbidden | Cross-requester access attempt to unowned ticket/attachment or inactive requester identity |
| `404` | Not Found | Ticket or attachment ID does not exist |
| `410` | Gone | Attempting to download a soft-removed attachment |
| `500` | Internal Server Error | Unexpected database or file storage failure (sanitized error message) |
