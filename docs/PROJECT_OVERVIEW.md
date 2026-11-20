# Credensa — Complete Project Overview

## 🎯 Product Overview

**Credensa** is an AI-native Career Intelligence Platform that treats your career as a structured, evolving record rather than a static PDF resume. It uses autonomous AI agents to reason over your Career Record, match it against job opportunities, draft tailored assets, review them for ATS compatibility, and wait for **human approval** before anything ships.

**Core Philosophy:** One career record → multiple approved outputs (resume, tailored job draft, interview prep, portfolio). AI never fabricates experience — it only sharpens what you've actually recorded.

---

## 📁 Project Structure

```
Credensa/
├── .gitignore
├── .dockerignore
├── Dockerfile
├── cloudbuild.yaml
├── deploy.ps1
├── README.md
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   ├── public/                          # Built frontend served here
│   ├── data/                            # Local JSON fallback database
│   ├── scripts/
│   └── src/
│       ├── config/
│       │   ├── firebase.js              # Firebase Admin SDK init
│       │   └── gemini.js                # Gemini AI client config
│       ├── controllers/
│       │   ├── careerRecordController.js
│       │   ├── matchController.js
│       │   ├── draftController.js
│       │   ├── reviewController.js
│       │   ├── exportController.js
│       │   └── resumeController.js      # Resume upload parsing
│       ├── middleware/
│       │   ├── auth.js                  # Firebase ID token verification
│       │   └── validate.js              # Zod validation middleware
│       ├── routes/
│       │   ├── careerRecordRoutes.js
│       │   ├── matchRoutes.js
│       │   ├── draftRoutes.js
│       │   ├── reviewRoutes.js
│       │   ├── exportRoutes.js
│       │   └── resumeRoutes.js          # Resume upload endpoint
│       ├── schemas/
│       │   └── index.js                 # Zod validation schemas
│       └── services/
│           ├── firestoreService.js      # Firestore CRUD with user scoping
│           ├── geminiService.js         # Gemini AI agent integration
│           ├── pdfService.js            # PDF generation (PDFKit)
│           ├── jobService.js            # Job search tool data
│           └── resumeParser.js          # PDF/DOCX text extraction
├── frontend/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── .oxlintrc.json
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                      # Main app with Auth + routing
│   │   ├── types.ts                     # TypeScript interfaces
│   │   ├── api.ts                       # API client with Firebase ID token proxy
│   │   ├── auth.tsx                     # Firebase Auth provider
│   │   ├── firebase.ts                  # Firebase client config
│   │   ├── index.css                    # Global styles
│   │   └── components/
│   │       └── RecordEditor.tsx         # Main UI component
│   └── dist/                            # Built frontend (served by backend)
├── docs/
│   ├── PROJECT_OVERVIEW.md
│   ├── DEMO.md
│   └── CONTRIBUTING.md
├── .agents/
│   └── skills/
└── .opencode/
    └── plan/
        ├── Credensa_PRD.md
        └── Credensa_Deps_Install_Plan.md
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  http://localhost:5173                                       │
│                                                             │
│  • React 19 + TypeScript + Vite                             │
│  • Firebase Auth (Google Sign-In)                           │
│  • Tailwind CSS styling                                     │
│  • Career Record Editor                                     │
│  • Resume Upload (PDF/DOCX)                                 │
│  • Match Agent UI                                           │
│  • Draft Editor                                             │
│  • ATS Review                                               │
│  • PDF Export                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/API calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
│  http://localhost:3001                                      │
│                                                             │
│  • Express.js REST API                                      │
│  • Firebase Auth ID token verification                      │
│  • Google Gemini 2.0 Flash AI agents                        │
│  • Firebase Firestore database                              │
│  • PDFKit PDF generation                                    │
│  • pdf-parse / mammoth (PDF/DOCX parsing)                   │
│  • Zod validation                                           │
│  • Helmet security headers                                  │
│  • Express rate limiting                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS API calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                        │
│                                                             │
│  • Firebase Auth (Google Sign-In)                          │
│  • Firebase Firestore (NoSQL database)                     │
│  • Google Gemini 2.0 Flash (AI agents)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core Features Implemented

### 1. Career Record Management (Source of Truth)
Users create and maintain a structured Career Record containing:
- **Personal Info:** Name, headline, location, email, phone, LinkedIn, portfolio
- **Experience:** Company, role, dates, achievements (with metrics), skills used
- **Projects:** Name, description, role, tech stack, outcomes, links
- **Education:** Degree, institution, dates, honors
- **Skills:** Name, proficiency level, years of experience

**Key Features:**
- Full CRUD operations
- Versioned records (each edit creates a new snapshot)
- Outputs linked to specific record versions
- User-scoped (each user sees only their own records)

### 2. Match Agent (Opportunity Fit)
**Agentic AI workflow:**
- User pastes a Job Description (JD)
- Agent parses JD into required skills, preferred skills, responsibilities, experience level
- Agent compares against user's Career Record
- Returns:
  - Fit score (0–100)
  - Matched skills (from record)
  - Missing skills (in JD, not in record)
  - Missing metrics (achievements without numbers)
  - Suggested improvements
- Results displayed as: Strong / Ready / Improve tiers

### 3. Draft Agent (Generate Resume / Tailor for Job)
From an approved Career Record + matched JD, the Draft Agent generates:
- Professional summary tailored to the role
- Experience bullets rewritten with ATS keywords and metrics
- Skills section prioritized by JD relevance
- Optional cover letter draft
- ATS keywords identification

### 4. Review Agent (ATS & Quality Check)
Before export, the Reviewer Agent checks:
- ATS keyword density vs JD
- Missing metrics in achievements (flags if < 70% have numbers)
- Vague action words ("helped," "worked on") → suggests stronger verbs
- Resume length (1–2 pages)
- Contact info present
- Returns checklist with pass/fail per item and suggested fixes

### 5. Human-in-the-Loop Approval
Every output must pass through user approval:
- **Approve:** Export PDF, save asset
- **Edit:** Modify content in-line, re-run review
- **Reject:** Discard, return to drafting
- No PDF is generated without explicit approval
- Approval history stored (who approved what, when, which record version)

### 6. Export & Output
- Download approved resume as PDF (ATS-optimized template)
- Download as JSON (structured data)
- Shareable link (conceptual)

### 7. Resume Upload & Parsing
- Upload PDF or DOCX resume
- Automatic text extraction (pdf-parse / mammoth)
- Auto-populates Career Record fields:
  - Personal info (name, headline, location, email, phone, LinkedIn)
  - Experience (roles, projects, achievements)
  - Education (degree, institution, dates, honors)
  - Skills (auto-detected from text)
- User can review and edit parsed data before saving

---

## 🔐 Security & Architecture

### Authentication
- **Firebase Auth** with Google Sign-In
- Firebase ID tokens passed in `Authorization: Bearer <token>` header
- All API routes require authentication (except health check)
- User ID extracted from token and stored with all data
- Users can only access their own data (multi-tenant isolation)

### Security Headers
- **Helmet.js** for security headers
- **CORS** configured for frontend origin
- **Rate limiting:** 100 requests per 15 minutes per IP
- **Error handling:** No stack traces leaked in production

### Data Privacy
- User career data stored in Firestore
- Not used to train public AI models
- User owns their data
- No auto-sharing between users

---

## 🚀 Deployment

### Google Cloud Run (Production)

**Prerequisites:**
- Google Cloud Project with billing enabled
- Google Cloud SDK (gcloud) installed and authenticated
- Secret Manager with secrets: `credensa-gemini-key`, `credensa-firebase-project-id`, `credensa-firebase-client-email`, `credensa-firebase-private-key`

**Deploy:**
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_REGION=asia-south1,_SERVICE=credensa \
  --project=YOUR_PROJECT_ID
```

Or use PowerShell:
```powershell
.\deploy.ps1
```

**Result:** Live URL like `https://credensa-xxxxxx.a.run.app`

---

### Local Development

**Backend:**
```cmd
cd backend
node server.js
```
Runs on `http://localhost:3001`

**Frontend:**
```cmd
cd frontend
npm run dev
```
Runs on `http://localhost:5173`

---

## 📊 Data Models

### Career Record (Firestore: `career_records`)
```json
{
  "id": "string",
  "userId": "string",
  "version": number,
  "personalInfo": {
    "name": "string",
    "headline": "string",
    "location": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "portfolio": "string"
  },
  "experience": [{
    "id": "string",
    "company": "string",
    "role": "string",
    "startDate": "date",
    "endDate": "date | null",
    "current": boolean,
    "achievements": [{ "text": "string", "metric": "string | null" }],
    "skillsUsed": ["string"]
  }],
  "projects": [{
    "id": "string",
    "name": "string",
    "description": "string",
    "role": "string",
    "techStack": ["string"],
    "outcomes": [{ "text": "string", "metric": "string | null" }],
    "link": "string | null"
  }],
  "education": [{
    "id": "string",
    "degree": "string",
    "institution": "string",
    "startDate": "date",
    "endDate": "date | null",
    "honors": "string"
  }],
  "skills": [{ "name": "string", "level": "string", "years": number }],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Job Match Result (Firestore: `matches`)
```json
{
  "id": "string",
  "recordId": "string",
  "recordVersion": number,
  "jdText": "string",
  "jdParsed": {
    "requiredSkills": ["string"],
    "preferredSkills": ["string"],
    "responsibilities": ["string"],
    "experienceLevel": "string"
  },
  "fitScore": number,
  "tier": "Strong" | "Ready" | "Improve",
  "matchedSkills": ["string"],
  "missingSkills": ["string"],
  "missingMetrics": ["string"],
  "suggestions": ["string"],
  "summary": "string",
  "createdAt": "timestamp"
}
```

### Resume Draft (Firestore: `resume_drafts`)
```json
{
  "id": "string",
  "recordId": "string",
  "recordVersion": number,
  "matchId": "string",
  "status": "draft" | "approved" | "rejected" | "edited",
  "content": {
    "summary": "string",
    "experience": [{}],
    "skills": ["string"],
    "coverLetter": "string",
    "atsKeywords": ["string"]
  },
  "reviewResult": {
    "atsScore": number,
    "checks": [{ "id": "string", "name": "string", "passed": boolean, "suggestion": "string | null" }],
    "criticalIssues": ["string"],
    "summary": "string"
  },
  "approvedAt": "timestamp | null",
  "pdfUrl": "string | null",
  "createdAt": "timestamp"
}
```

---

## 📊 Buildathon Demo Flow

1. **Sign in** with Google
2. **Create Career Record** (or upload resume PDF to auto-populate)
3. **Paste Job Description** → Match Agent shows fit score + gaps
4. **Generate Tailored Resume** → Draft Agent creates customized content
5. **Run ATS Review** → See ATS score and missing elements
6. **Approve** → Human approval gate
7. **Download PDF** → ATS-ready resume

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript | v19 |
| Build Tool | Vite | v8 |
| Styling | Tailwind CSS | v4 |
| State | React Context | Built-in |
| Backend | Node.js + Express | v24 + v4 |
| Database | Firebase Firestore | - |
| Auth | Firebase Auth | - |
| AI | Google Gemini 2.0 Flash | - |
| PDF Generation | PDFKit | v0.15 |
| Resume Parsing | pdf-parse + mammoth | Latest |
| Validation | Zod | v4 |
| Security | Helmet + express-rate-limit | v8 + v8 |
| Deployment | Google Cloud Run | - |
| CI/CD | GitHub Actions | - |

---

## 📋 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/records` | Create career record | Yes |
| GET | `/api/records` | List user's records | Yes |
| GET | `/api/records/:id` | Get record by ID | Yes |
| PUT | `/api/records/:id` | Update record | Yes |
| DELETE | `/api/records/:id` | Delete record | Yes |
| POST | `/api/match` | Match record vs JD | Yes |
| GET | `/api/match/:id` | Get match result | Yes |
| GET | `/api/match/record/:recordId` | List matches for record | Yes |
| POST | `/api/draft` | Generate tailored draft | Yes |
| GET | `/api/draft/:id` | Get draft | Yes |
| PUT | `/api/draft/:id` | Update draft | Yes |
| POST | `/api/review` | ATS review | Yes |
| GET | `/api/review/:id` | Get review result | Yes |
| POST | `/api/export/approve` | Approve draft | Yes |
| POST | `/api/export/pdf` | Export PDF | Yes |
| GET | `/api/export/json/:recordId` | Export JSON | Yes |
| POST | `/api/resume/upload` | Upload & parse resume | Yes |

---

## 🎯 Buildathon Demo Script

1. **Sign in** with Google
2. **Create Career Record** OR **Upload Resume** (PDF/DOCX)
3. **Paste Job Description** → Click "Generate Match Analysis" → See fit score
4. **Click "Generate Tailored Resume"** → See AI-tailored content
5. **Click "Run ATS Review"** → See ATS score and fixes
6. **Click "Approve & Export"** → Human approval
7. **Click "Download PDF"** → Download ATS-ready resume

---

## 🚨 Known Limitations

1. **No multi-user collaboration** (single user per account)
2. **No real job board scraping** (uses mock job data for matching)
3. **No email notifications**
4. **No mobile app** (web-only)
5. **Resume parsing is heuristic-based** (not 100% accurate on all PDFs)
6. **No background job processing** (all AI calls are synchronous)

---

## 📞 Support

For issues during development:
1. Check backend terminal for error logs
2. Check browser console for frontend errors
3. Verify `.env` files have correct values
4. Ensure Firebase project has Google Auth enabled
5. Ensure Gemini API key is valid and has quota

---

**Last Updated:** November 20, 2026
**Status:** Production-ready for buildathon demo
**Repository:** `Credensa`
