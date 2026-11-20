# Contributing to Credensa

Thanks for helping build Credensa! This guide covers everything you need to
get a change from your machine to a reviewed pull request.

## Prerequisites

- **Node.js 24** is required (matches CI and production). npm ships with Node.
- Git, and a `gcloud` CLI only if you plan to deploy.

Check your versions:

```bash
node --version   # expect v24.x
npm --version
```

## Local development setup

Install dependencies in both workspaces (each has its own `package-lock.json`,
so use `npm install` locally and `npm ci` in CI):

```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

Copy the environment template and fill in only what you need. Demo mode works
with everything left blank:

```bash
cp backend/.env.example backend/.env     # Windows: copy backend\.env.example backend\.env
```

Run the two servers in separate terminals:

```bash
# Terminal 1 — backend API (http://localhost:3001)
cd backend
node server.js

# Terminal 2 — frontend dev server (http://localhost:5173)
cd frontend
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:3001`, so open
<http://localhost:5173>. Check `GET /api/health` to see whether the app is in
demo or live mode. See the [README](../README.md) for the full API reference.

### Secrets

Put secrets in `backend/.env` for local development only. **Never commit
`.env`** — it is git-ignored; `backend/.env.example` is the committed template
that documents every variable. In production, secrets (Gemini key, Firebase
credentials) are stored in **Google Secret Manager** and injected into Cloud
Run at runtime — they are never baked into the image or the browser bundle.

## Branch naming

Create a topic branch off an up-to-date `main`/`master`. Use one of these
prefixes followed by a short, kebab-case description:

- `feat/` — new feature (e.g. `feat/ats-keyword-highlighting`)
- `fix/` — bug fix (e.g. `fix/pdf-export-length`)
- `docs/` — documentation only (e.g. `docs/contributing-guide`)

```bash
git switch -c feat/short-description
```

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional scope): <short imperative summary>

[optional body]

[optional footer]
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.
Examples:

```
feat(draft): add ATS keyword prioritisation
fix(export): handle empty approval history
docs: add contributing guide
```

Keep the summary under ~72 characters and write it in the imperative mood
("add", not "added").

## Checks to run before opening a PR

CI runs the same checks on every push and pull request. Run them locally first.

Frontend (from `frontend/`):

```bash
npm run lint      # oxlint
npm run build     # tsc -b && vite build
```

Backend syntax check (from `backend/`). Loop over every source file plus the
entry point:

```bash
for f in $(find src -name '*.js') server.js; do node --check "$f"; done
```

Backend tests, **if** a `backend/tests` directory exists:

```bash
node backend/tests/run-tests.js       # from the repository root
# CI additionally runs: node --test tests/   (from backend/)
```

All checks must pass before you request review.

## Demo seed data

If `backend/scripts/seed-demo.js` is present, you can load sample Career
Records for local demos:

```bash
node backend/scripts/seed-demo.js      # from the repository root
```

This is optional; the app also runs in deterministic demo mode with no seeded
data.

## Deployment

Production deploys to **Google Cloud Run** (region `asia-south1`, Mumbai) via
Cloud Build. From the repository root, either:

```bash
gcloud builds submit --config cloudbuild.yaml
```

or, on Windows, run the interactive helper:

```powershell
.\deploy.ps1
```

The `Dockerfile` builds the frontend and serves it from the Express backend in
a single container. Confirm a deployment with `curl <SERVICE_URL>/api/health`.
Only maintainers should deploy; never put credentials in a commit.

## Pull request checklist

- [ ] Branch follows the naming convention above
- [ ] Commits follow Conventional Commits
- [ ] `npm run lint` and `npm run build` pass in `frontend/`
- [ ] Backend `node --check` loop passes
- [ ] Tests pass (if present)
- [ ] No `.env`, API keys, or credentials are included in the diff
- [ ] README/docs updated if behavior or setup changed
