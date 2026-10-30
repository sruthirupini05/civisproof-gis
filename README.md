# CivicProof GIS — Godavari Pushkaralu 2027

> **Unified Facility Discovery, QR-Code Identification, Multilingual Navigation & Field Inspection Verification**

CivicProof GIS links physical civic infrastructure to field verification, inspection history, maintenance workflows, and actionable readiness metrics.

---

## 🌟 Highlights & Architecture

- **Interactive GIS Map:** Real-time Leaflet map of Rajahmundry & Godavari Pushkaram sector with custom category markers:
  - 🌊 Bathing Ghats & designated access points
  - 🚻 Public Toilets & sanitation complexes
  - 💧 Drinking-water points (RO kiosks & distribution centers)
  - 🏥 Medical camps & first-aid posts
  - ⛺ Pilgrim shelters & rest areas
- **QR-Code Identification & Offline Fallback (Feature 21):**
  - Unique opaque QR tokens generated for every registered facility (`/facility/:token`)
  - Built-in camera scanner (`html5-qrcode`) + manual facility-code entry fallback
  - Printable and downloadable QR labels for on-site physical mounting (`/admin/qr`)
  - Transparent IndexedDB caching (`idb`): displays previously cached data with timestamp & staleness warning when offline
  - Clear fallback when an uncached facility is scanned offline without misleading promises
- **First-Class Multilingual Support (Feature 22):**
  - **Telugu (తెలుగు)** as a first-class citizen with Noto Sans Telugu font
  - **English** and **Hindi (हिंदी)** with instant switching and local storage persistence
  - Complete translations for navigation menus, status tags, inspection questions, and safety disclaimers
- **Shortest-Route Navigation & Travel-Mode Selection (Feature 23):**
  - OSRM-powered shortest route calculation for **Walking**, **Cycling**, and **Driving**
  - Real-time distance and estimated duration
  - Turn-by-turn routing steps
  - Explicit notification regarding public transport data availability
  - Non-negotiable event restriction disclaimer (explaining that normal routing datasets do not automatically reflect temporary event closures)
  - Offline route caching: recalculates from local IndexedDB storage when offline
- **Operational Readiness & Field Inspection (Features 24 & 25):**
  - Field inspection form with defect tracking and severity ratings
  - Offline inspection drafts saved locally with auto-sync upon reconnection
  - Operational Attention Queue: highlights unverified facilities, stale records (>7 days), and open defects
  - Authorized verification workflow allowing reviewers to update readiness status

---

## 🚀 Running the Project

### Prerequisites
- Node.js v20+ (tested on Node v24 with built-in `node:sqlite`)
- npm v10+

### 1. Start Backend API Server
```powershell
cd C:\Users\sruth\.gemini\antigravity\scratch\civicproof-gis\hackathon-submission\server
npm install
node src/index.js
# API running on http://localhost:3001
```

### 2. Start Frontend Client
```powershell
cd C:\Users\sruth\.gemini\antigravity\scratch\civicproof-gis\hackathon-submission\client
npm install
npm run dev
# Frontend running on http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full access, QR Label Generator, Verify Facilities |
| **Field Inspector** | `inspector1` | `inspect123` | Submit inspections, log defects, view Attention Queue |
| **Field Staff** | `field1` | `field123` | Record field findings and save offline drafts |

---

## 🧪 End-to-End Acceptance Verification (Scenarios A – G)

### Scenario A — Find a facility
1. Open `http://localhost:5173/`
2. Click on the category filter (e.g. **Bathing Ghat** or **Drinking Water**).
3. Click any marker on the map to open the bottom drawer.
4. Verify the recorded status (Verified / Reported), operational status, and last-updated timestamp.

### Scenario B — Scan a QR code offline
1. Open any facility details page while online (e.g. `http://localhost:5173/facility/5jquzohQvM-4`) — this automatically caches it in IndexedDB.
2. In DevTools, go to **Network** tab and toggle **Offline**.
3. Scan or enter the code `5jquzohQvM-4` in the Scan page.
4. Verify the amber **"Showing cached data"** banner and freshness timestamp appear.
5. Enter an invalid or uncached token (e.g. `UNKNOWN999`) and confirm the app informs the user that the facility is not available offline.

### Scenario C — Use the application in Telugu
1. In the top navigation bar, change the language selector to **తెలుగు**.
2. Verify that map controls, facility names (e.g. గోదావరి పుష్కర ఘాట్), category filters, status labels, and warnings render in authentic Telugu Unicode.

### Scenario D — Navigate to a facility
1. From any facility detail or popup, click **"Navigate Here"**.
2. Select travel mode: **Walking**, **Cycling**, or **Driving**.
3. Confirm the polyline appears on the Leaflet map with distance and estimated time.
4. Confirm the event restriction disclaimer is displayed.

### Scenario E — Record a field deficiency
1. Log in with `inspector1` / `inspect123`.
2. Open a facility and click **"Record Inspection"** (`/inspect/:id`).
3. Set status to **Needs Attention**, describe the finding, and add a defect with severity **High**.
4. Click **Submit Inspection**.

### Scenario F — Synchronise after reconnecting
1. While offline, open the inspection form, fill findings, and click **"Save as Draft"**.
2. Notice the top banner indicates **"1 item pending synchronisation"**.
3. Toggle back to **Online** mode and click **"Sync now"**.
4. The draft synchronizes with the backend database.

### Scenario G — Verify operational readiness
1. Go to `/dashboard`.
2. Check the **Attention Queue** for facilities with open defects or stale records.
3. Log in as `admin`, click **Verify** on an unverified facility.
4. Confirm the facility status transitions to **Verified Record**.
