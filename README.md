# SurgiSense AI – Postoperative Recovery Intelligence Platform Backend

SurgiSense AI is an AI-powered postoperative Recovery Intelligence Platform centered around the patient's continuously evolving **Recovery Passport™**—acting as the single source of truth for their postoperative healing.

This repository implements the production-grade, modular, secure, and auditable backend built using **Clean Architecture** and **Domain-Driven Design (DDD)** principles in **TypeScript (Node.js/Express)** with **Prisma ORM**.

---

## Architecture Design Principles

```
                 +---------------------------------------+
                 |            Presentation               |
                 |  (Express Web App, Routes, Multer)    |
                 +-------------------+-------------------+
                                     |
                                     v
                 +-------------------+-------------------+
                 |            Application                |
                 |     (SurgiSenseService Use Cases)     |
                 +-------------------+-------------------+
                                     |
                                     v
                 +-------------------+-------------------+
                 |              Domain                   |
                 |    (Entities, ValueObjects, Engines)   |
                 +-------------------+-------------------+
                                     ^
                                     |
                 +-------------------+-------------------+
                 |           Infrastructure              |
                 | (Prisma DB, Winston Logs, Cryptography)|
                 +---------------------------------------+
```

### Domain-Driven Design (DDD) Layers
1. **Domain Layer (`src/domain`)**: Core Entities, Value Objects, and Domain Services (RecoveryTwin, Cohort stats, explainable Evidence summaries, prioritized Interventions, and chronological Clinical Replays). Independent of database or router frameworks.
2. **Application Layer (`src/application`)**: Orchestrates use cases via `SurgiSenseService` linking data persistence interfaces and trigger events.
3. **Infrastructure Layer (`src/infrastructure`)**: Implements concrete storage, cryptography, Winston logs, Prisma repositories, JWT/RBAC security guards, and mock Vision/Memory AI parsers.

---

## Key Features

1. **Recovery Passport™**: Monotonically-increasing, immutable versions representing chronological snapshots.
2. **Digital Recovery Twin™**: Sigmoid healing curve projections modified by age, gender, and comorbidities compared to actual scores, updating deviations and timeline forecasts dynamically.
3. **Structured Clinical Memory**: Clinical RAG extraction parsing raw documents (Discharge summaries, blood reports) into structured query fields.
4. **Wound Image AI Analysis**: Segmenting wounds, calculating inflammation/swelling indicators, and tracking healing percentage.
5. **Explainable AI (Evidence Engine)**: Complete transparency backing every recommendation with clinical factors and guideline references (e.g. NICE, ADA).
6. **Active Feedback Loop**: Capturing doctor modifications/overrides to retrain models securely.
7. **Blockchain Trust Anchors**: Cryptographic hash logs of consent, prediction, and doctor reviews anchored to a tamper-proof ledger.
8. **HIPAA & GDPR Compliance**:
   - Automatic AES-256-GCM encryption/decryption of patient demographics, histories, and notes at the database repository boundary.
   - Patient Privacy Shield: Automatically redacting doctor-only metrics (explainability logic, feedback outcomes, raw interventions) from patient views.
   - Comprehensive audit logging recording actor, role, timestamp, IP, and payload hashes.
   - RBAC gate controllers enforcing role checks (Patient, Doctor, Hospital Admin, System Admin).

---

## Database Schema Model (Prisma)

- **User / Patient / Doctor / Hospital**: Profile hierarchy.
- **RecoveryPassport & RecoveryVersion**: Core trajectory entities.
- **ClinicalMemory / Document / Image**: File extraction datasets.
- **RecoveryTwin / DoctorFeedback / Task / Appointment**: Dynamic analytics.
- **Consent / AuditLog / BlockchainRecord**: Cryptographic verification tables.

---

## API Router Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create patient/doctor user profile, consent, and initial twin.
- `POST /api/v1/auth/login` - Sign JWT access & refresh tokens.
- `POST /api/v1/auth/refresh` - Refresh access token scope.

### Recovery Passport & Versions
- `POST /api/v1/passport/document` - Upload raw medical notes (Discharge Summary, prescriptions) and parse structured Memory.
- `POST /api/v1/passport/image` - Upload and compress wound image.
- `POST /api/v1/passport/evolve` - Evolve passport (Process Vision AI, update Twin, Cohort stats, rank Interventions, and write immutable version).
- `GET /api/v1/passport/detail?patientId={id}` - Fetch single source of truth (Redacted if Patient role; unredacted if Doctor role).
- `GET /api/v1/passport/clinical-replay?patientId={id}` - Chronological story timeline.
- `GET /api/v1/passport/blockchain?passportId={id}` - Ledger hash anchors.

### Task & Care Checklist
- `POST /api/v1/tasks/create` - Schedule a recovery checklist task.
- `GET /api/v1/tasks?patientId={id}` - Get compliance items checklist.
- `POST /api/v1/tasks/:id/complete` - Check off task (Adhered/Missed) and update adherence score.

### Clinician & Operations
- `GET /api/v1/doctor/dashboard?doctorId={id}` - Retrieve patient triage prioritization.
- `POST /api/v1/doctor/feedback` - Log Doctor Decision modifications on recommendations.
- `GET /api/v1/analytics/hospital` - Retrieve cohort aggregates and AI acceptance stats.
- `GET /api/v1/audit/logs` - Inspect logs (System Admin only).

---

## Quick Start & Verification

### Local Setup
1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize the SQLite database and generate Prisma Client:
   ```bash
   npx prisma db push
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```

### Run End-to-End Simulation
To verify the entire system, execute the automated verification test script. This script boots the server, performs full registration, uploads records, extracts clinical memories, runs AI prediction loops, verifies patient redaction shields, and logs blockchain validation ledgers:
```bash
npm run simulate
```

### Run in Docker
```bash
docker-compose up --build
```
The server will start listening at `http://localhost:5000`.
