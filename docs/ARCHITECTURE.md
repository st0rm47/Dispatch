# Architecture

## Overview

```
┌─────────────┐        /api/*         ┌──────────────┐        ┌────────────────┐
│  Frontend   │ ───────proxied──────▶ │   Backend    │ ─────▶ │  LLM provider   │
│  (nginx,    │                       │  (Express)   │        │  (Claude/GPT/   │
│  static JS) │ ◀──────────────────── │              │ ◀───── │  Gemini/Ollama) │
└─────────────┘                       └──────┬───────┘        └────────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Gmail API   │
                                       │  (OAuth2)    │
                                       └──────────────┘
```

The frontend never talks to Gmail or any LLM directly — it only calls the
backend's `/api/*` routes. All provider credentials live server-side in
`backend/.env` and are never sent to the browser.

## Backend (`backend/src`)

- **`server.js`** — Express entry point, wires up routes, CORS, and (in dev
  only) serves the frontend as a convenience.
- **`routes/`** — one file per endpoint (`providers`, `mail-types`,
  `generate`, `send`). Thin: validate input, call a service, return JSON.
- **`services/llm/`** — the provider abstraction:
  - `index.js` is the registry: it knows which providers are configured
    (via env vars) and routes a `generate` call to the right one.
  - One file per provider (`anthropicProvider.js`, `openaiProvider.js`,
    `geminiProvider.js`, `ollamaProvider.js`), each exposing the same
    `generate({ systemPrompt, userMessage, model }) → { subject, body }`
    shape. Adding a new LLM means adding one file here plus one entry in
    the registry — nothing else changes.
  - `jsonUtil.js` — shared defensive JSON parsing, since models sometimes
    wrap their JSON in prose or markdown fences despite instructions.
- **`services/gmailService.js`** — builds a MIME message (via
  `mailcomposer`, so attachments encode correctly) and sends it through the
  Gmail API using a stored OAuth2 refresh token.
- **`services/getRefreshToken.js`** — a one-time CLI script (`npm run
  auth`) that runs the OAuth consent flow and prints the refresh token to
  paste into `.env`. It is never called by the running server.
- **`templates/emailPrompts.js`** — one system prompt per mail type (cold
  outreach, follow-up, vacancy inquiry, formal application). This is the
  file to edit to change tone, length, or add new mail types.

## Frontend (`frontend/public`)

Plain HTML/CSS/JS — no build step, no framework — because the UI is a
single four-step form, not something that benefits from a component
framework's overhead.

- **`index.html`** — all four step panels live in the DOM at once;
  `app.js` toggles which is visible.
- **`js/app.js`** — holds form state in the DOM itself (inputs keep their
  values across steps), handles step navigation, calls the backend to
  draft/regenerate/send, and keeps the Gmail-style review card in sync.
- **`js/config.js`** — the one place `API_BASE` is set, so the same static
  files work whether nginx is proxying `/api` (Docker) or the backend is
  addressed directly (local dev without Docker).
- **`css/style.css`** — design tokens (colors, spacing) live as CSS custom
  properties at the top of the file.

## Why two containers instead of one

The backend serves the frontend directly in dev mode purely for
convenience (`fs.existsSync` check in `server.js`). In `docker-compose.yml`
they're deliberately split into separate services — nginx serves static
assets (fast, cacheable, no Node process needed for that), and the backend
container only handles API logic and secrets. This also means you could
swap the frontend's host (e.g. a CDN) without touching the backend at all.

## Request flow: drafting and sending an email

1. Browser loads `frontend/public`, fetches `/api/mail-types` and
   `/api/providers` to populate the two dropdowns (providers list is
   filtered server-side to only what's actually configured).
2. User fills in steps 1–3; state lives in the input fields themselves.
3. "Draft the email" → `POST /api/generate` with all field values →
   backend builds a system prompt from `emailPrompts.js` + the user's
   facts → calls the selected provider → returns `{ subject, body }`.
4. User edits directly in the Gmail-style review card (subject input,
   body textarea) — this is just local DOM state, no server round-trip
   until sending.
5. "Send it" → `POST /api/send` (multipart, includes the CV file if
   attached) → `gmailService.sendEmail` builds the MIME message and calls
   the Gmail API.
