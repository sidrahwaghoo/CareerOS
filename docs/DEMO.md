# Credensa — Production Onboarding Guide

Credensa turns one structured Career Record into three AI-generated artifacts:
a **Job Match Analysis**, a **Tailored Resume Draft**, and an **ATS Review**.
Everything you see is your own data, scoped to your signed-in Google account and
processed by live Gemini AI. Your workspace starts empty and is populated only
by the data you enter.

## 1. Sign in

Open the app and choose **Continue with Google**. The app uses Firebase
Authentication; your ID token is sent with every API request and the backend
uses it to scope every record, match and draft to your account. If Google
Authentication is not enabled for the deployment, sign-in fails with a clear
message — no guest or fallback mode exists.

## 2. Create your Career Record

Open **Career Studio** (the floating **+** or **Add Entry**), fill in your
personal information, experience, projects, education and skills, then choose
**Save Record**. The completeness bar reflects only what you actually entered.
The category counts in the Career Notebook are derived from your saved records.

## 3. Match → Draft → Review → Approve → PDF

1. In Career Studio, paste a **real job description** into *Match with Job
   Description* and choose **Generate Match Analysis**. The Match agent returns
   a fit score, tier, matched skills, gaps and suggestions for that JD.
2. Choose **Generate Tailored Resume**. The Draft agent rewrites your summary
   and achievements using only your record — edit anything inline and choose
   **Save Edits**.
3. Choose **Run ATS Review**. The Review agent scores the draft against the job
   description. Editing the draft clears the review so it must be re-run.
4. Choose **Approve & Export** to record your approval, then **Download PDF** to
   generate the ATS-ready resume from the approved content.

Match and Draft require the matching upstream step and a saved record. If the
AI provider is not configured, the app reports **"AI not configured — contact
administrator"** rather than showing substitute content. If your session has
expired it reports **"Sign in required"** and returns you to the sign-in screen.

## 4. Operational notes

- Records are private to your account — no other user can see them.
- `GET /api/health` reports the live storage and AI configuration status.
- Deployment and environment setup live in the project README and the backend
  `/.env.example`. Keep real credentials out of source control.
