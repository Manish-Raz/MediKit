# MediKit — Patient–Doctor Medication Coordination Platform

MediKit is a full-stack healthcare coordination web application built from scratch to eliminate polypharmacy risks, duplicate prescriptions, dangerous drug-drug interactions, and missed medication doses. It connects **Patients**, **Attending Doctors**, **Family Caregivers**, and **Authorized Pharmacies** into a single, cohesive, real-time safety ecosystem.

---

## 1. Problem Statement & Solution

### The Challenge
Patients receiving prescriptions from multiple specialists (such as a primary care doctor, a cardiologist, and an endocrinologist) are at high risk of:
- **Therapeutic Duplication:** Receiving the same or equivalent medication under different brand names.
- **Drug-Drug Interactions:** Adverse pharmacokinetic or pharmacodynamic reactions between co-administered drugs.
- **Adherence Breakdown:** Unmonitored missed doses, incorrect schedules, or unrecorded reasons for skipped medication.
- **Fragmented Medical Histories:** Doctors lacking visibility into prescriptions issued by other healthcare providers.

### The MediKit Solution
- **Centralized Medication Safety Profile:** A real-time record of all active prescriptions, dosages, and documented allergies.
- **Intelligent Screening Engine:** Automatically detects direct duplicate medications, identical active ingredients under different brand names, and drug interactions before a doctor confirms a prescription.
- **Daily Dose Timeline & Adherence Tracker:** Patients record doses as Taken or Skipped with clinical reasons. Background processes automatically transition overdue doses to Missed and compute 30-day adherence rates.
- **Caregiver & Doctor Adherence Alerts:** Authorized caregivers and physicians receive alerts when patients miss scheduled doses.
- **Prescription Versioning & Immutable Audit Trail:** Modifications create version chains (v1, v2) with documented reasons, and discontinued medications cleanly remove future upcoming doses.
- **Pharmacy & Hospital Discovery:** Free OpenStreetMap-based facility discovery and verified medicine catalog stock lookup without fabricated inventory.

---

## 2. Technology Stack

### Frontend
- **HTML5 & Modern CSS3:** Custom clinical healthcare design system with deep navy, teal/emerald accents, crisp cards, and responsive grids.
- **Vanilla JavaScript (ES6+):** Pure modular JavaScript (`api.js`, `auth.js`, `common.js`, `patient.js`, `doctor.js`, `caregiver.js`, `pharmacy.js`, `locations.js`).
- **GSAP 3.12:** Subtle entrance animations and modal transitions respecting `prefers-reduced-motion`.
- **Lucide Icons:** Clinical and navigation iconography.
- **Fetch API:** Secure communication with backend REST endpoints using same-origin session credentials.

### Backend
- **Node.js & Express.js:** CommonJS REST API architecture (`/api/v1/`).
- **MongoDB & Mongoose ODM:** Persistent collections with schema validation, compound indexes, and unique constraints.
- **Security & Session Authentication:** `express-session` with `connect-mongo` persistent store, `bcryptjs` password hashing, `helmet` security headers, and `express-rate-limit` brute-force protection.
- **Background Cron Scheduler:** `node-cron` running automated overdue dose processing and adherence alert generation.

### Testing & Development
- **Jest & Supertest:** Automated integration tests covering authentication, patient access boundaries, interaction detection, versioning, and dose tracking.
- **Dotenv:** Environment configuration.

---

## 3. Project Structure

```
medikit/
├── public/
│   ├── index.html                   # Public landing page with 1-click demo launchers
│   ├── login.html                   # Sign in page with seeded demo selectors
│   ├── register.html                # Multi-role registration with dynamic fields
│   ├── patient-dashboard.html       # Patient dose schedule, adherence meter & alerts
│   ├── doctor-dashboard.html        # Doctor patient roster, prescription authoring & screening
│   ├── caregiver-dashboard.html     # Caregiver patient monitor & authorized dose logging
│   ├── pharmacy-dashboard.html      # Pharmacy inventory catalog & stock manager
│   ├── medications.html             # Active medications explorer & dosage details
│   ├── prescriptions.html           # Prescriptions registry & version history modal
│   ├── notifications.html           # In-app notification center & alerts
│   ├── locations.html               # Nearby pharmacy & hospital discovery (OSM)
│   ├── profile.html                 # Patient profile, allergies & access management
│   ├── css/
│   │   ├── styles.css               # Design tokens, variables, sidebar, topbar, layouts
│   │   ├── components.css           # Cards, buttons, modals, toasts, timeline items
│   │   └── responsive.css           # 360px mobile, tablet, and desktop breakpoints
│   └── js/
│       ├── api.js                   # Fetch API wrapper with session handling
│       ├── auth.js                  # Authentication guards and role routing
│       ├── common.js                # Shell navigation injector, modals, toasts, GSAP
│       ├── patient.js               # Patient dashboard controller
│       ├── doctor.js                # Doctor clinical dashboard controller
│       ├── caregiver.js             # Caregiver adherence monitor controller
│       ├── pharmacy.js              # Pharmacy inventory controller
│       ├── medications.js           # Medications viewer controller
│       ├── prescriptions.js         # Prescriptions and revision history controller
│       ├── notifications.js         # Notifications center controller
│       ├── locations.js             # Location and medicine availability finder
│       └── profile.js               # Health profile & care team access manager
├── src/
│   ├── config/
│   │   └── db.js                    # Mongoose database connection
│   ├── models/
│   │   ├── User.js                  # Core user authentication model
│   │   ├── PatientProfile.js        # Patient medical notes, allergies, emergency contacts
│   │   ├── DoctorProfile.js         # Doctor specialty, license identifier, clinic
│   │   ├── CaregiverProfile.js      # Caregiver relation details
│   │   ├── PharmacyProfile.js       # Pharmacy address, license, operating hours
│   │   ├── PatientAccess.js         # Patient-to-provider authorization grants
│   │   ├── MedicationCatalog.js     # Standard medication catalog & chemical entities
│   │   ├── Prescription.js          # Versioned prescriptions (v1, v2, v3...)
│   │   ├── ScheduledDose.js         # Idempotent daily doses (upcoming/taken/skipped/missed)
│   │   ├── InteractionRule.js       # Clinical drug-drug interaction rules
│   │   ├── Notification.js          # In-app notifications with deduplication keys
│   │   ├── AuditLog.js              # Immutable clinical & authorization event logs
│   │   └── PharmacyInventory.js     # Pharmacy catalog stock & verification timestamps
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── patientController.js
│   │   ├── prescriptionController.js
│   │   ├── interactionController.js
│   │   ├── doseController.js
│   │   ├── notificationController.js
│   │   ├── locationController.js
│   │   ├── pharmacyController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js                  # requireAuth & requireRole
│   │   ├── authorization.js         # verifyPatientAccess boundary enforcement
│   │   └── rateLimiter.js           # Express rate limiters for auth and API
│   ├── services/
│   │   ├── interactionService.js    # Drug interaction & duplicate checker
│   │   ├── medicationScheduleService.js # Dose generation & future dose cleanup
│   │   ├── adherenceService.js      # 30-day adherence rate & overdue dose processor
│   │   ├── notificationService.js   # Notification dispatcher with deduplication
│   │   └── auditService.js          # Immutable event & state change logger
│   ├── jobs/
│   │   └── overdueDosesJob.js       # Node-cron background adherence monitor
│   ├── routes/                      # Versioned Express routes (/api/v1/*)
│   └── app.js                       # Express app factory with Helmet & static serving
├── scripts/
│   └── seed.js                      # Realistic demo database seeder
├── tests/
│   └── medikit.test.js             # Automated test suite (Jest + Supertest)
├── .env.example
├── .gitignore
├── package.json
└── server.js                        # HTTP entrypoint & scheduler bootstrapper
```

---

## 4. Setup & Local Installation

### Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node v22.18)
- **MongoDB**: Locally installed MongoDB instance (running on `mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI.

### Step 1: Install Dependencies
Open a terminal in the project directory and run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Windows PowerShell:
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```
Default configuration values in `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/medikit
SESSION_SECRET=medikit_secure_session_key_hackathon_2026_dev
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```
*(If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string).*

### Step 3: Seed the Database with Realistic Demo Data
Run the seed script:
```bash
npm run seed
```
This populates the database with demo users, active prescriptions, scheduled doses (taken, skipped, upcoming, missed), drug interaction rules, notifications, and pharmacy inventory.

### Step 4: Run the Automated Test Suite
To verify authentication, authorization boundaries, interaction detection, dose tracking, and adherence calculations:
```bash
npm test
```

### Step 5: Start the MediKit Application
```bash
npm start
# Or for development with auto-reloading:
npm run dev
```

Open your browser to:
**[http://localhost:3000](http://localhost:3000)**

---

## 5. Seeded Demo Accounts

All demo accounts share the password: **`Password123!`**

| Role | Name | Email | Primary Features & Dashboard |
| :--- | :--- | :--- | :--- |
| **Patient** | Johnathan Doe | `john.patient@medikit.demo` | Daily dose tracking (Take/Skip), 30-day adherence meter, drug interaction warnings, allergy record, authorization manager. |
| **Doctor 1 (PCP)** | Dr. Sarah Jenkins, MD | `dr.jenkins@medikit.demo` | Authorized patient roster, prescription authoring with live drug screening, prescription modification & discontinuation. |
| **Doctor 2 (Cardio)** | Dr. Marcus Chen, MD | `dr.chen@medikit.demo` | Multi-doctor coordination, specialist prescription management, interaction screening against patient's existing medications. |
| **Caregiver** | Emily Doe | `emily.caregiver@medikit.demo` | Family adherence monitoring, missed-dose alerts, authorized dose logging on behalf of patient. |
| **Pharmacy** | Metro Pharmacy | `metro.pharmacy@medikit.demo` | Medicine catalog management, stock quantity and price updates, availability verification timestamps. |

*(You can also click any demo account pill on the Landing Page or Login Page to pre-fill credentials automatically).*

---

## 6. Key Workflows & Features

### A. Drug Interaction & Duplication Detection Engine
When a physician prescribes a medication, the backend compares the candidate medicine against the patient's active prescriptions:
1. **Duplicate Medication Check:** Flags if the exact brand/medication is already active.
2. **Duplicate Active Ingredient Check:** Detects identical chemical entities prescribed under different brand names (e.g., *Prinivil* and *Zestril* both containing *lisinopril*).
3. **Clinical Interaction Ruleset:** Screened against a locally documented clinical database. For example:
   - **Lisinopril + Ibuprofen:** Moderate warning (*Reduced Antihypertensive Efficacy & Nephrotoxicity Risk*).
   - **Warfarin + Aspirin:** Severe warning (*Severe Gastrointestinal Hemorrhage & Bleeding Risk*).
   - **Lisinopril + Potassium Chloride:** Severe warning (*Hyperkalemia Risk*).
   - **Clopidogrel + Omeprazole:** Moderate warning (*Decreased Antiplatelet Efficacy*).
   - **Sertraline + Tramadol:** Severe warning (*Potential Serotonin Syndrome*).
4. **Clinical Override:** Doctors are presented with the clinical rationale and recommendation, and must explicitly check an override acknowledgment before issuing.

### B. Daily Dose Scheduling & Adherence Monitoring
- Prescriptions generate daily doses between their start and end dates.
- An idempotency constraint (`patient + prescription + scheduledTime`) guarantees that duplicate doses cannot be generated or double-logged.
- When doses are skipped, patients can select or type an audit reason (e.g., *Nausea*, *Fasting for bloodwork*, *Doctor instructed temporary pause*).
- A background scheduler checks for doses past their grace window, marks them as Missed, and dispatches in-app notifications to the patient and their care team.

### C. Prescription Versioning & History
- Editing an active prescription creates a new version record (`v2`, `v3`) while preserving the earlier record marked as `modified`.
- Discontinuing a prescription removes any future upcoming doses while retaining the full audit history.
- The **History** view traces the entire revision chain and immutable audit events.

### D. Healthcare Facility & Medicine Stock Discovery
- Search nearby pharmacies and hospitals with OpenStreetMap navigation links.
- Public search for medicine stock queries verified pharmacy catalogs and displays reported availability without fabricating stock.

---

## 7. API Reference (v1)

### Authentication
- `POST /api/v1/auth/register` — Register user with role (patient, doctor, caregiver, pharmacy).
- `POST /api/v1/auth/login` — Authenticate and establish session.
- `POST /api/v1/auth/logout` — Terminate session.
- `GET /api/v1/auth/me` — Retrieve authenticated user & role profile.

### Patients & Access Control
- `GET /api/v1/patients/me` — Get current patient profile.
- `PATCH /api/v1/patients/me` — Update allergies, emergency contact, preferences.
- `GET /api/v1/patients/authorized` — List authorized patients for doctor/caregiver.
- `GET /api/v1/patients/:id` — Get authorized patient medical info.
- `GET /api/v1/patients/:id/access` — View access authorization list.
- `POST /api/v1/patients/:id/access` — Grant access to doctor/caregiver by email.
- `PATCH /api/v1/patients/:id/access/:accessId` — Revoke or modify permissions.

### Prescriptions
- `GET /api/v1/prescriptions` — List prescriptions.
- `POST /api/v1/prescriptions` — Issue prescription with interaction screening (Doctors).
- `GET /api/v1/prescriptions/:id` — Get prescription details.
- `PATCH /api/v1/prescriptions/:id` — Modify prescription (creates new version).
- `POST /api/v1/prescriptions/:id/discontinue` — Discontinue prescription.
- `GET /api/v1/prescriptions/:id/history` — View version chain & audit logs.

### Interaction Checking
- `POST /api/v1/interactions/check` — Screen candidate drug against patient medications.
- `GET /api/v1/interactions/patient/:id` — Comprehensive scan of active profile.

### Scheduled Doses & Adherence
- `GET /api/v1/doses/today` — Retrieve today's dose timeline.
- `GET /api/v1/doses` — Query dose history with date range.
- `PATCH /api/v1/doses/:id/status` — Mark dose Taken or Skipped with reason.
- `GET /api/v1/doses/adherence` — Compute 30-day adherence rate & consecutive missed counts.

### Notifications & Discovery
- `GET /api/v1/notifications` — Retrieve notifications & unread counts.
- `PATCH /api/v1/notifications/:id/read` — Mark notification read.
- `PATCH /api/v1/notifications/read-all` — Mark all read.
- `GET /api/v1/locations/pharmacies` — Nearby pharmacies with OSM links.
- `GET /api/v1/locations/hospitals` — Nearby hospitals & 24/7 emergency facilities.
- `GET /api/v1/pharmacy/search` — Query verified medicine inventory stock.
- `GET /api/v1/pharmacy/inventory` — Pharmacy catalog manager.
- `POST /api/v1/pharmacy/inventory` — Add medication to catalog.
- `PATCH /api/v1/pharmacy/inventory/:id` — Update stock & price.

---

## 8. Clinical Limitations & Disclaimer

> [!WARNING]
> **Educational & Demonstration Prototype:** MediKit was engineered as a healthcare hackathon MVP to showcase medication coordination patterns. It is **not** a production-certified medical software system, nor is it cleared by the FDA or international regulatory health authorities.
>
> - The interaction checker uses a curated sample ruleset of documented drug interactions; the absence of a warning does **not** signify that a drug combination is safe.
> - Patients should never stop, modify, or start taking medications without consulting a licensed physician or pharmacist.
> - Pharmacy inventory numbers reflect reported catalog data and must be verified directly with dispensing pharmacies before relying on critical availability.

---

## 9. License

This project is licensed under the MIT License for hackathon and open-source educational evaluation.
