# Credensa — Agentic Career Intelligence Platform

> **Built with Google Gemini and deployed on Google Cloud Run — agentic career intelligence powered by Google AI.**

Credensa treats your career as a structured, evolving **Career Record** instead of a one-off PDF resume. Autonomous AI agents reason over that record, match it against job descriptions, draft tailored assets, review them for ATS compatibility, and wait for **your approval** before anything ships. One career record → many approved outputs. AI never fabricates experience — it only sharpens what you actually recorded.

Built by **Zuber Shaikh** (Founder & CEO) and **Sidrah Waghoo** (Data Analysis) for **Startup Buildathon India 2026 — City Buildathon Mumbai** (20–21 Nov 2026).

---

## The agentic workflow

```
Career Record  →  Match  →  Draft  →  Review  →  Approve  →  PDF
 (source of       (fit +    (tailored  (ATS &     (human       (export
  truth)           gaps)    content)   quality)   gate)        ready)
```

1. **Career Record** — Capture roles, projects, achievements (with metrics), education and skills. Every edit creates a new version, so outputs stay linked to the exact record version they came from.
2. **Match Agent** — Paste a job description. The agent parses required/preferred skills and returns a fit score (0–100), matched skills, missing skills, missing metrics and actionable suggestions — as structured JSON.
3. **Draft Agent** — A tailored resume draft (professional summary, rewritten bullets with ATS keywords and metrics, prioritized skills, optional cover letter), also as structured JSON.
4. **Review Agent** — An ATS and quality checklist: keyword coverage, metric density, vague verbs, resume length and contact info — with pass/fail per item and fix suggestions.
5. **Approve (human-in-the-loop)** — You **Approve / Edit / Reject** the draft. Nothing is exported without explicit approval, and approval history is recorded.
6. **PDF** — The approved draft is rendered into a clean, ATS-friendly PDF. JSON export is available too.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────┐
│ React 19 + TypeScript + Vite + Tailwind (frontend/)      │
│  served as static files by the backend in production      │
└───────────────────────┬──────────────────────────────────┘
                        │  /api (same origin in production)
┌───────────────────────▼──────────────────────────────────┐
│ Express backend (backend/server.js) — Node.js 24         │
│  Orchestrator: Plan → Match → Draft → Review → Approve    │
│  → Export (PDFKit)                                        │
│  Routes → Controllers → Services → Gemini + Storage       │
└───────────┬───────────────────────────┬──────────────────┘
            │                           │
   ┌────────▼────────┐          ┌────────▼────────┐
   │ Google Gemini   │          │ Firebase        │
   │ (Match / Draft /│          │ Firestore       │
   │  Review agents) │          │ (or local JSON) │
   └─────────────────┘          └─────────────────┘
```

- **Single container:** the Dockerfile builds the frontend, copies `frontend/dist` into `backend/public`, and runs the Express server. The backend serves the SPA statically and falls back to `index.html` for client-side routes.
- **Secrets never reach the browser:** all Gemini calls go through the backend proxy. On Cloud Run, secrets are injected from **Secret Manager** at runtime.
- **Real services only:** requires live Gemini and Firestore credentials — no mock data or fallback responses.

### Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Axios, Lucide |
| Backend | Node.js 24, Express 4, PDFKit, UUID |
| AI | Google Gemini 2.0 Flash (`@google/genai`) via Google AI Studio |
| Data | Firebase Firestore (`firebase-admin` / `@google-cloud/firestore`) |
| Infra | Docker, Google Cloud Build, Google Cloud Run, Secret Manager (region: `asia-south1`, Mumbai) |

---

## Local setup

Requirements: **Node.js 20.19+** (Node 24 recommended) and npm.

```bash
# 1. Install backend dependencies
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
cd ..

# 2. Install frontend dependencies
cd frontend
npm install
cd ..
```

Run both servers in two terminals:

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend
npm run dev

# Terminal 2 — frontend dev server (http://localhost:5173)
cd frontend
npm run dev
```

The Vite dev server proxies `/api` → `http://localhost:3001`, so no CORS setup is needed locally. Open <http://localhost:5173>.

To build a production frontend into `backend/public` (Windows):

```bash
cd backend
npm run build:frontend
```

Then just run `npm start` in `backend/` — the app and API share one origin on port 3001.

### Required configuration (no demo mode)

This is a production system — there is **no demo fallback, no local store, and no sample AI output**. It refuses to start without real credentials.

Fill in [`backend/.env`](backend/.env.example) before running:

| Variable | Source |
|----------|--------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase service account (Firebase Console → Project Settings → Service Accounts) |

Fill in [`frontend/.env`](frontend/.env.example) with the Firebase **web** config (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`). Sign-in is Google Authentication only.

`GET /api/health` reports `storage: firestore` and `ai: gemini-live` when correctly configured, or `unconfigured` otherwise. If credentials are missing, the backend exits at startup with a clear error listing what needs to be set.

---

## API endpoints

Base path: `/api` (same origin in production, `http://localhost:3001/api` in local dev).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check; reports storage and AI modes |
| `/api/records` | POST | Create a Career Record |
| `/api/records` | GET | List Career Records (optional `limit`) |
| `/api/records/:id` | GET | Get a Career Record by ID |
| `/api/records/:id` | PUT | Update a Career Record (creates a new version) |
| `/api/records/:id` | DELETE | Delete a Career Record |
| `/api/match` | POST | Match a record against a job description → fit score + gaps |
| `/api/match/:id` | GET | Get a saved match result |
| `/api/match/record/:recordId` | GET | List matches for a record |
| `/api/draft` | POST | Generate a tailored resume draft |
| `/api/draft/:id` | GET | Get a draft |
| `/api/draft/:id` | PUT | Edit a draft before approval |
| `/api/draft/record/:recordId` | GET | List drafts for a record |
| `/api/review` | POST | Run the ATS + quality review on a draft |
| `/api/review/:id` | GET | Get a saved review result |
| `/api/export/approve` | POST | Approve a draft for export |
| `/api/export/pdf` | POST | Generate/download the approved resume as PDF |
| `/api/export/json/:recordId` | GET | Export a record and its assets as JSON |

---

## Deploying to Google Cloud Run

The container is built once and deployed by **Cloud Build**: the `Dockerfile` produces a single image containing both the built SPA and the Express backend, listening on port **3001**. Default region is **asia-south1 (Mumbai)** and service name **credensa**.

### One-time setup

```bash
# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# Create the Secret Manager secrets that cloudbuild.yaml references
echo -n "YOUR_GEMINI_KEY" | gcloud secrets create credensa-gemini-key --data-file=- --replication-policy=automatic
echo -n "credensa-buildathon" | gcloud secrets create credensa-firebase-project-id --data-file=- --replication-policy=automatic
echo -n "firebase-adminsdk@credensa-buildathon.iam.gserviceaccount.com" | gcloud secrets create credensa-firebase-client-email --data-file=- --replication-policy=automatic
echo -n "YOUR_FIREBASE_PRIVATE_KEY" | gcloud secrets create credensa-firebase-private-key --data-file=- --replication-policy=automatic

# Grant the Cloud Run runtime service account access to the secrets
gcloud secrets add-iam-policy-binding credensa-gemini-key \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
# ...repeat for the other three secrets
```

The Cloud Build service account also needs `roles/run.admin` and `roles/iam.serviceAccountUser` to deploy.

### Option A — Cloud Build (CI-style)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-south1,_SERVICE=credensa
```

`cloudbuild.yaml` builds the image, pushes it, and runs `gcloud run deploy` with `--allow-unauthenticated`, `--port 3001`, and `--set-secrets` for `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.

### Option B — `deploy.ps1` (interactive, Windows)

```powershell
.\deploy.ps1
# or with explicit values:
.\deploy.ps1 -Project "your-gcp-project" -Region "asia-south1" -Service "credensa"
```

The script checks that `gcloud` is installed and authenticated, prompts for and confirms `GEMINI_API_KEY` (storing it in Secret Manager without writing it to disk), submits `cloudbuild.yaml`, and prints the live service URL and health-check URL.

### Verify the deployment

```bash
curl https://CREDENSA_URL/api/health
# {"status":"ok","storage":"firestore","ai":"gemini-live", ...}
```

---

## Project structure

```
Credensa/
├── Dockerfile            # Multi-stage build (Vite frontend + Express backend)
├── .dockerignore         # Keeps node_modules, dist, .env, etc. out of the image
├── cloudbuild.yaml       # Build + deploy to Cloud Run
├── deploy.ps1            # Manual deployment helper (Windows/PowerShell)
├── README.md             # This file
├── frontend/             # React + TypeScript + Vite + Tailwind SPA
│   └── dist/             # Build output (copied into backend/public by Docker)
└── backend/              # Express API + agent orchestration
    ├── .env.example      # Documented environment variables
    ├── server.js         # App entry point, static serving + SPA fallback
    ├── public/           # Production SPA files (served by Express)
    └── src/
        ├── routes/       # /records, /match, /draft, /review, /export
        ├── controllers/  # Request handling
        ├── services/     # Agent orchestration, PDF export
        └── config/       # firebase.js, gemini.js
```

---

*Credensa — your professional story, one entry at a time. Built for Startup Buildathon India 2026, Mumbai.*
