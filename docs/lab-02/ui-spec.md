# TokTickIT Lab 2 — Zen Green UI Specification

## 1. Design System Overview & Color Tokens

The TokTickIT Lab 2 user interface follows the **Zen Green Design System**, providing a clean, accessible, and modern IT service desk experience.

### Color Tokens

| Token Name | Hex Code | Purpose / Intended Usage |
|---|---|---|
| **Primary Green** | `#006B3C` | App header, primary action buttons (`.btn-primary`), active pagination page |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, focus accents, links (`<a>`), hover states |
| **Pale Green** | `#EAF6EF` | Selected rows, success callouts, info callout background, low priority badge |
| **Page Background** | `#F5F7F6` | Quiet, near-white page body background |
| **Surface / Cards** | `#FFFFFF` | White background for card container surfaces with subtle `#E2E8F0` border |
| **Text Primary** | `#1E2923` | Dark charcoal-green for body text (high contrast, non-pure black) |
| **Text Muted** | `#64748B` | Slate gray for labels, timestamps, secondary metadata, disclaimers |
| **Read-Only Surface** | `#F1F5F3` | Quiet shading for system-generated, read-only field backgrounds |
| **Error / Destructive** | `#D92D20` | Dark red text, borders, high-priority badges, and error messages below fields |
| **Warning / Amber** | `#FEF3C7` / `#D97706` | Amber background and text for medium priority, pending status, and warning badges |
| **Info / Blue** | `#EFF6FF` / `#2563EB` | Light blue background and text for Open status badge |
| **Success** | `#10B981` | Emerald green success confirmation banners and online status indicators |

---

## 2. Typography & Spacing Scale

- **Font Family**: System UI stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
- **Headings**:
  - `H1` (Page Title): `24px` (`1.5rem`), bold (`700`), `#1E2923`.
  - `H2` (Section Header): `18px` (`1.125rem`), semi-bold (`600`), `#1E2923`.
  - `H3` (Card Header): `16px` (`1rem`), semi-bold (`600`), `#1E2923`.
- **Body Text**: `14px` (`0.875rem`), line-height `1.5`, `#1E2923`.
- **Small / Meta Text**: `12px` (`0.75rem`), line-height `1.4`, `#64748B`.
- **Ticket Number Link**: Monospace font (`font-family: monospace`), bold, color `#006B3C`.
- **Spacing Scale**: 4px base multiplier (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).

---

## 3. Component States & Field Rules

### Control States
- **Editable Fields**: White background (`#FFFFFF`), border `1px solid #CBD5E1`, border-radius `6px`, padding `8px 12px`.
- **Read-Only Fields**: Soft gray-green shading background (`#F1F5F3`), border `1px solid #E2E8F0`, text color `#475569`, cursor `not-allowed`. Distinct from editable fields.
- **Required Field Markers**: Red asterisk (`*` in `#D92D20`) placed immediately after the field label text.
- **Validation Messages**: Text color `#D92D20`, font size `12px`, positioned directly below the associated field control. Never rendered solely at top of screen.
- **Focus States**: Visible outline ring `2px solid #0B7A46` with offset `2px`. Native browser focus indicators preserved or enhanced for keyboard accessibility.
- **Disabled States**: Background `#F1F5F9`, text `#94A3B8`, cursor `not-allowed`, opacity `0.65`.

### Button Hierarchy & States
1. **Primary Action** (`.btn-zen-primary`): Background `#006B3C`, text `#FFFFFF`. Hover: `#0B7A46`. Active focus: ring `#0B7A46`. (e.g., `+ Create Ticket`, `-> Continue`).
2. **Secondary / Outline Action** (`.btn-zen-secondary`): Background `#FFFFFF`, text `#1E2923`, border `1px solid #CBD5E1`. Hover: `#F8FAFC`. (e.g., `Cancel`, `Clear Filters`, `<- Back to My Tickets`).
3. **Tertiary / Link**: Text `#006B3C` or `#0B7A46`, transparent background.
4. **Destructive Action** (`.btn-zen-danger`): Background `#D92D20`, text `#FFFFFF`. Hover: `#B42318`.
5. **Busy / Submitting State**: Button disabled (`disabled={true}`), opacity `0.8`, text accompanied by an inline animated spinner icon (`Loading...`).

### Badge Rules
- **Requested & IT Priority Badges**:
  - `LOW`: Pale Green badge (`bg `#EAF6EF`, text `#006B3C`, border `#C6E7D2`).
  - `MEDIUM`: Amber badge (`bg `#FEF3C7`, text `#D97706`, border `#FDE68A`).
  - `HIGH`: Light Red badge (`bg `#FEE2E2`, text `#DC2626`, border `#FCA5A5`).
  - `URGENT`: Dark Red badge (`bg `#7F1D1D`, text `#FFFFFF`, bold).
- **Ticket Status Badges**:
  - `NEW`: Pale Green badge (`bg `#EAF6EF`, text `#006B3C`, bold).
  - `OPEN`: Light Blue badge (`bg `#EFF6FF`, text `#2563EB`).
  - `IN_PROGRESS`: Pale Green badge (`bg `#EAF6EF`, text `#006B3C`).
  - `PENDING`: Amber badge (`bg `#FEF3C7`, text `#D97706`).
  - `RESOLVED`: Pale Green badge (`bg `#EAF6EF`, text `#006B3C`).
  - `CLOSED`: Gray badge (`bg `#F1F5F9`, text `#475569`).

---

## 4. Application Shell & Navigation

- **Application Header**: Dark green navbar (`#006B3C`) spanning 100% width.
  - Left: **TokTickIT** branding identity with clock-in-circle icon.
  - Center: Main navigation links (**[document icon] My Tickets**, **[plus icon] Create Ticket**) with active page link highlighted by white background pill / accent.
  - Right: Active Development Requester profile pill showing `[person icon] Profile v` or selected Requester name with a "Switch Requester" trigger.
- **Breadcrumb Navigation**:
  - `Home icon > Development Requester Selection`
  - `My Tickets > Ticket Details`
- **Layout Container**: Centered content area with maximum width `1200px`, margin `0 auto`, padding `24px 16px`.

---

## 5. Required UI Screen States

### 5.1 Development Requester Selection Screen (Figure 8.1 / Image 2)
- **Breadcrumb**: `Home > Development Requester Selection`
- **Centered Card**: White surface card with rounded corners and subtle border (`max-width: 640px`).
- **Required UI States**:
  1. **Loading State**: Displays an inline animated spinner inside the select dropdown container while active Development Requesters are fetched from `GET /api/requesters`. Dropdown and Continue button are disabled.
  2. **No Active Requesters / Empty State**: Rendered when `GET /api/requesters` returns an empty array `[]`. Displays an amber warning callout: *"No active development requesters available in the database. Please run seed script."* Continue button remains disabled.
  3. **Safe API Failure State**: Rendered when `GET /api/requesters` fails (HTTP 500 or network error). Displays a red Zen Green error banner: *"Failed to load development requesters. [ Retry ]"* with a Retry action button.
  4. **Active Selection State**: Shows active requesters loaded in select dropdown. Excludes inactive requesters (`isActive = false`, `BR-04`). Includes info callout banner `(i) Only active development requesters are shown.` and shield disclaimer card *"Authentication coming in Lab 3"*. Clicking `[ -> Continue ]` sets active context and navigates into application shell.

### 5.2 Create Ticket Screen (Create Mode)
- **Layout**: Centered card surface (`max-width: 800px`).
- **Required UI States**:
  1. **Initial State**: Renders empty form with system-generated read-only fields (`Ticket Number` placeholder *Generated upon submission*, `Date` current timestamp), Category dropdown, Related System dropdown, Requested Priority dropdown (default `MEDIUM`), empty Summary input, and empty multiline Description textarea.
  2. **Reference-Data Loading State**: Displays subtle spinner overlay on Category and Related System dropdowns while fetching from `GET /api/categories` and `GET /api/related-systems`.
  3. **Validation State (`AC-23`)**: Triggered when submitting invalid data (missing Category/System, Summary outside 5–150 chars, Description outside 10–3000 chars). Inputs with errors receive red border (`#D92D20`) and field-level validation messages appear directly below associated controls. No API call is made.
  4. **Submitting / Busy State (`BR-13`, `BR-27`)**: Submit button becomes disabled, opacity reduced to `0.8`, displays inline animated spinner (`Submitting ticket...`), and ignores repeated clicks.
  5. **Success State**: Rendered upon successful `POST /api/tickets` response (HTTP 201 Created). Displays a Zen Green success banner showing the generated official Ticket Number (`TKT-YYYY-XXXXXX`) and clear next action buttons: `[ View Ticket Detail ]` and `[ Create Another Ticket ]`.
  6. **API Failure State (`BR-14`, `AC-11`)**: Rendered when the backend returns HTTP 500 or network failure. Displays a top red error banner (*"Failed to create ticket. Please try again."*) while preserving all entered form values (Summary, Description, Category, System, Priority) in place.

### 5.3 My Tickets Screen (Figure 8.4 / Image 3)
- **Header Bar**: Title **My Tickets**, subtitle *"View and track all of your support requests."*, `[ Clear Filters ]` button, `[ + ] Create Ticket` button.
- **Filter Bar**: Search bar (`search`), 3 filter dropdowns (`Category`, `Requested Priority`, `Current Status`).
- **Required UI States**:
  1. **Loading State**: Table body / card container displays full-width skeleton loader bars or animated loading spinner while fetching `GET /api/tickets`.
  2. **Empty State (`AC-15`)**: Rendered when `GET /api/tickets` returns 0 total tickets for the active requester. Displays empty box illustration, message *"You have not submitted any IT support tickets yet."*, and primary green button `[ + Create Ticket ]`.
  3. **No-Results State (`AC-16`)**: Rendered when tickets exist for the requester but the active search or filter query returns 0 matching records. Displays message *"No tickets match your filter criteria."* and button `[ Clear Filters ]`.
  4. **Safe API Failure State**: Rendered when `GET /api/tickets` returns HTTP 500 or network error. Displays red error banner *"Unable to load tickets from server. [ Retry ]"* with an inline Retry action.

### 5.4 Attachment Component States
- **Required UI States**:
  1. **Active State**: Rendered for active attachments (`isRemoved = false`). Shows file icon, original filename, formatted size (e.g. `1.0 MB`), upload date, `[ Download ]` button, and `[ Remove ]` button.
  2. **Uploading State**: Rendered during file upload via `POST /api/tickets/:id/attachments`. Displays file row with progress bar / spinner and `Uploading...` indicator.
  3. **Invalid Attachment State (`AC-05`, `AC-06`)**: Rendered when selecting an unsupported file type (not JPG, PNG, WEBP, PDF), file > 5 MB, or exceeding 5 active attachments limit. Displays immediate red validation message below dropzone: *"File type not permitted. Only JPG, PNG, WEBP, and PDF files under 5 MB are allowed."* Upload request is blocked.
  4. **Soft-Removed State (`AC-07`, `BR-19`, `BR-20`)**: Rendered after confirming removal with a 5–250 character reason. Displays grayed-out metadata entry in audit history showing filename, badge "Soft-Removed", timestamp, removal reason, and permanently disabled download button with tooltip *"Attachment soft-removed"*.
  5. **Unavailable / Blocked-Download State (`AC-08`, `BR-21`)**: Rendered if a download request is attempted on a soft-removed file (`GET /api/attachments/:id/download`). API returns HTTP 410 Gone; UI displays toast notification: *"This attachment was soft-removed and can no longer be downloaded."*

---

## 6. Layout & Responsive Breakpoints

| Viewport Category | Width Range | Layout Adaptation Rules |
|---|---|---|
| **Desktop** | `≥ 992 px` | Multi-column forms, full data table for My Tickets, side-by-side filters |
| **Tablet** | `768 px – 991 px` | 2-column form grid, reduced-column responsive table or card layout. The overall page must not require horizontal page scrolling. |
| **Mobile** | `< 768 px` | 1-column stacked inputs, My Tickets table converts to card list, full-width touch buttons |

---

## 7. Accessibility Rules (WCAG 2.1 AA)

- **Color Contrast**: All body text and button labels achieve minimum contrast ratio of `4.5:1` against backgrounds.
- **Non-Color Indicators**: Badges and status messages pair color coding with explicit text labels or icons.
- **Keyboard Focus**: Interactive elements possess visible focus indicators (`2px` ring). Forms submit on `Enter` key within text inputs.
- **ARIA Attributes**: `aria-required="true"` on required controls, `aria-invalid="true"` when validation fails, `aria-live="polite"` for dynamic status banners.

---

## 8. Visual Inspection Checklist & Screenshot Paths

- [ ] Header renders Primary Green (`#006B3C`) with active identity pill.
- [ ] Read-only fields use distinct soft shading (`#F1F5F3`).
- [ ] Required field labels include red asterisk (`*`).
- [ ] Validation errors appear directly below field controls.
- [ ] Submit button displays busy spinner during request processing.
- [ ] My Tickets displays as table on desktop and card list on mobile.
- [ ] Soft-removed attachments display removal reason and disabled download.

### Required Screenshot Artifact Paths (Desktop, Tablet, Mobile)
- **Create Ticket**: `artifacts/lab-02/screenshots/create-ticket/{desktop,tablet,mobile}.png`
- **My Tickets**: `artifacts/lab-02/screenshots/my-tickets/{desktop,tablet,mobile}.png`
- **Ticket Detail**: `artifacts/lab-02/screenshots/ticket-detail/{desktop,tablet,mobile}.png`
