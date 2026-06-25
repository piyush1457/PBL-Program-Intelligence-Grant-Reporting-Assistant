# PBL Program Intelligence & Grant Reporting Assistant

A responsive full-stack program intelligence system built for **Mantra4Change** to process school-level project-based learning (PBL) response data, calculate deterministic risk indicators, prepare leadership agendas, and assemble donor-ready grant reports.

---

## Setup Instructions

### 1. Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

### 3. Installation
Install the project dependencies (including SQLite bindings, SWR caching, Zod validation, Recharts, and Groq SDK):
```bash
npm install
```

### 4. Running Local Development Server
Launch the application:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The SQLite database will be initialized and seeded automatically on startup.

### 5. Running Tests
Run the Vitest unit tests:
```bash
npm run test
```

### 6. Production Build
Verify typings and build optimization:
```bash
npm run build
```

---

## Directory Folder Structure

```
M4C/
├── csv/                         # Standardized Grant profile & Evidence Index CSVs
├── csv_exports/                 # Raw school survey response CSVs (July - Sept 2025)
├── images/                      # Raw photos/news assets
├── public/                      # Public static images (copied automatically on build)
├── src/
│   ├── app/                     # Next.js App Router structure
│   │   ├── api/                 # Strongly validated REST route handlers
│   │   │   ├── blocks/
│   │   │   ├── dashboard/
│   │   │   ├── districts/
│   │   │   ├── filters/
│   │   │   ├── grant/
│   │   │   └── review-summary/
│   │   ├── explorer/            # District and block drilldown interface
│   │   ├── grants/              # Donor report writer and evidence index
│   │   ├── review/              # Leadership briefing summary and prompts
│   │   ├── globals.css          # Styling system variables and dark mode rules
│   │   └── layout.tsx           # Global sidebar layout
│   ├── components/              # Modular UI elements (FilterBar, KPICard, etc.)
│   └── lib/                     # Decoupled business logic & database connections
│       ├── __tests__/           # Vitest unit test files
│       ├── services/            # Centralized database analytics services
│       ├── db.ts                # SQLite connection client caching
│       ├── risk.ts              # Risk classification heuristics
│       ├── seed.ts              # SQLite transactional seeder & concurrency lock
│       ├── types.ts             # Strict TypeScript declarations
│       └── utils.ts             # Dynamic time math & formatter utilities
└── vitest.config.ts             # Test configuration mapping Next.js aliases
```

---

## Architectural Data Flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Web Browser (Client)                     │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
      Fetch via SWR               │ HTTP GET / POST
      (Deduplicated Caching)      ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                Next.js REST API Route Handlers              │
   │           (Validated with Zod, Safe Error Boundaries)       │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │             Centralized Analytics Service Layer             │
   │               (src/lib/services/analytics.ts)               │
   └──────────────┬───────────────┬────────────────┬─────────────┘
                  │               │                │
                  ▼               ▼                ▼
           ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
           │ Risk Engine │ │  SQLite DB   │ │   Groq SDK   │
           │ (risk.ts)   │ │ (better-sq)  │ │ (llama-3.1)  │
           └─────────────┘ └──────────────┘ └──────────────┘
```

### Data Pipeline & Normalization
1. **CSV Ingestion**: PapaParse streams school survey files on startup.
2. **Seeding Concurrency Lock**: Next.js builds pages in parallel workers. The db script uses a status row in a `seeding_status` lock table. The first worker to start acquires the lock, and subsequent workers exit early if they detect the lock, preventing database write conflicts.
3. **Database Normalization**: Normalized into 4 transactional SQLite tables:
   - `school_responses`: Holds Class 6-8 enrollment, attendance, subject lists, evidence flags, and districts/blocks.
   - `grant_finance`: Details approved budgets, monthly utilization, cumulative utilization, and finance notes.
   - `grant_performance`: Houses pre-aggregated milestones and report status.
   - `evidence_media`: Indexes photographic evidence and newspaper clippings with captions.

---

## Deterministic Risk Engine & Analytics Formulas

All risk indexes are calculated dynamically in code:
- **Participation Rate** = `Active PBL Schools / Total Schools`
- **Evidence Compliance Rate** = `Schools Submitting Evidence / Active PBL Schools`
- **Student Attendance Rate** = `Total Attendance Sessions / (Total Enrollment * Sessions)`
  * *Single Subject selection*: `Sessions = 1`
  * *All/Combined Subjects*: `Sessions = 2` (Math & Science)

### Classification Thresholds
- 🟢 **On Track**: `Rate >= 75%`
- 🟡 **Behind**: `60% <= Rate < 75%`
- 🟠 **At Risk**: `35% <= Rate < 60%`
- 🔴 **Critical**: `Rate < 35%`

### Worst-of-Three Risk Roll-up
The overall risk rating of any district or block is determined by the lowest rating among its Participation, Evidence, and Attendance rates. For example, if a block has 90% Participation (On Track) and 80% Attendance (On Track) but only 30% Evidence uploads, its overall status is classified as **Critical**.

---

## AI Narrative Generation & Safeguards

```
[Dynamic Database Rollup] ──> [Structured Facts Context] ──> [Strict System Prompting] ──> [Groq Synthesis]
                                                                                               │
                                                                       ┌───────────────────────┴───────────────────────┐
                                                                       ▼                                               ▼
                                                           [AI Narrative Output]                            [Deterministic Fallback]
                                                           (Fact Audit Trail Printed)                       (Text Interpolation Output)
```

1. **No Raw Logs**: We do not send raw CSV records to the LLM. We first aggregate raw rows into structured JSON summaries.
2. **Strict System Prompting**: The system prompt constrains the AI to use *only* the facts passed in the prompt context. It prohibits hallucinations of locations, donors, or achievements not present in the facts.
3. **Traceability**: The UI explicitly prints the list of source facts used directly below the narrative to allow immediate audit checks.
4. **Deterministic Fallback**: If the API call fails or is disabled, the system generates a structured report template using TypeScript string interpolation, ensuring that program metrics are always displayed.

---

## Production Migration & Engineering Strategy

### Why SQLite Was Selected
SQLite is a zero-configuration database that stores data in a single local file. It is extremely fast for read-heavy operations, lightweight, and simplifies local development and assessment review by eliminating database hosting credentials.

### Production Scaling Considerations (SQLite → PostgreSQL)
While WAL mode is enabled on SQLite, write locks make it unsuitable for high-concurrency production applications. 
* **Migration Plan**: Replace `better-sqlite3` with `pg` (PostgreSQL) using an ORM like **Prisma** or **Drizzle** to handle schema migrations.
* **Serverless Deployments**: SQLite files are ephemeral on serverless environments (e.g. AWS Lambda, Vercel). Migrating to PostgreSQL hosted on a managed service (e.g. Supabase, AWS RDS) ensures persistent, centralized data access.

### Caching Strategy
- **Client Cache**: SWR is integrated on the main dashboard to cache API responses, reducing duplicate requests on page navigation.
- **Server Cache**: In production, introduce Redis to cache aggregated district and block rollups to avoid querying the raw database on every filter toggle.

### Authentication & Security Roadmap
- **Auth**: Introduce NextAuth.js to restrict access to coordinates and donor reports to authorized staff members.
- **Role-Based Access Control (RBAC)**: Enforce route-level checks (e.g. only managers can review financials, while field officers can upload survey responses).

### Monitoring & Logging Roadmap
- **Structured Logs**: Replace `console.log` with a structured logger (like **Pino** or **Winston**) exporting logs in JSON format.
- **APM Integration**: Pipe logs and server vitals to monitoring dashboards like **Datadog** or **Logrocket** to track runtime errors and database query latency.
