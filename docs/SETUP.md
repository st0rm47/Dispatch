# Setup Guide

## 1. Prerequisites

- Node.js 18+ (only needed for non-Docker/local dev)
- Docker + Docker Compose (recommended path)
- A Gmail account you're happy to send from
- At least one LLM API key: Claude, OpenAI, Gemini, or a locally running Ollama model

## 2. Google Cloud setup (one-time, ~5 minutes)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (or reuse one).
2. **APIs & Services → Library** → search "Gmail API" → **Enable**.
3. **APIs & Services → OAuth consent screen** → choose **External** → fill in app name/email → add your own Gmail address as a **test user**. This keeps the app in "testing" mode, which is fine for personal use — no Google review required.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:4000/auth/google/callback`
5. Copy the generated **Client ID** and **Client Secret**.

## 3. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (from step 2)
- At least one of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, or set `OLLAMA_ENABLED=true` if you have [Ollama](https://ollama.com) running locally

Leave `GOOGLE_REFRESH_TOKEN` blank for now — the next step fills it in.

## 4. Authorize Gmail access (one-time)

Run this locally (it needs to open your browser):

```bash
cd backend
npm install
npm run auth
```

This opens your browser, asks you to sign in and grant **send-only** permission (scope is `gmail.send` — it can never read your inbox), then prints a refresh token in the terminal. Paste it into `backend/.env` as `GOOGLE_REFRESH_TOKEN`.

## 5a. Run with Docker (recommended)

```bash
docker compose up --build
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:4000](http://localhost:4000)

The frontend container (nginx) proxies `/api/*` requests to the backend container, so no CORS setup or extra config is needed.

Your saved profile (name, signature, key points, resume) lives in
`backend/data/dispatch.db`, mounted as a volume — it survives
`docker compose down` and rebuilds. It's `.gitignore`'d since it can
contain your resume; delete that file anytime to reset it.

## 5b. Run without Docker

Terminal 1 — backend:
```bash
cd backend
npm install
npm start
```

Terminal 2 — frontend (any static file server works):
```bash
npx serve frontend/public -l 3000
```

Since the frontend isn't behind nginx in this mode, point it at the backend directly by editing `frontend/public/js/config.js`:
```js
window.API_BASE = "http://localhost:4000";
```

Alternatively, skip the second terminal entirely — the backend will also serve `frontend/public` directly at `http://localhost:4000` if that folder exists next to it (this is a dev convenience only; Docker uses the separate nginx container instead).

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "No provider configured" in the UI | No `*_API_KEY` set in `backend/.env`, or you forgot to restart the backend after editing it |
| `invalid_grant` when sending | `GOOGLE_REFRESH_TOKEN` expired or was revoked — rerun `npm run auth` |
| 403 from Gmail API | Gmail API not enabled on the Google Cloud project, or your Gmail isn't listed as a test user on the OAuth consent screen |
| CORS error in browser console (non-Docker mode) | `API_BASE` in `frontend/public/js/config.js` isn't pointing at the backend |
