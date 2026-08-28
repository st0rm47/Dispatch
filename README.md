# Dispatch - Job Mail Automation

Draft and send personalized job-application emails - cold outreach, follow-up, vacancy inquiry, formal application through your own Gmail account, with your choice of LLM writing the copy and your CV attached automatically.

You fill in a short four-step form → the model drafts a subject + body → you review and edit it in a Gmail-style card, exactly like a real draft → "Send" fires it through your Gmail account with the CV attached. Nothing sends without you seeing it first.

## Features

- **Choice of LLM** - Claude, OpenAI, Gemini, or a local Ollama model. The "Write with" dropdown only shows providers you've actually configured.
- **Four mail types out of the box** - cold outreach, follow-up, vacancy inquiry, formal application each with its own drafting strategy, easy to extend.
- **Real Gmail-style review** - From/To/Subject/Body laid out like an actual compose window, editable inline before sending.
- **Non-destructive step navigation** - Jump back to any earlier step to tweak something; nothing you've typed is lost, and you don't need to redraft to see the change reflected.
- **Batch campaign mode** - Paste a list of company names and Claude's web search finds each one's careers page and a _published_ contact email before drafting (never guesses or constructs an email). Skim the whole batch in one table, fix anything, then send all.
- **Remembers your details** - Name, signature, key points, and resume are saved locally (SQLite) after the first time, so you don't re-enter or re-upload them every session. Nothing leaves your machine.
- **Predefined template option** - Skip AI drafting entirely and use a fixed email pattern with placeholders (company name, role, etc. filled in automatically) - instant, free, no provider required.
- **CV attached automatically** via the Gmail API (OAuth2, `gmail.send` scope only - this app can never read your inbox).

## Quick start

```bash
git clone https://github.com/st0rm47/Dispatch.git
cd Dispatch
cd backend && cp .env.example .env   # fill in your keys, see docs/SETUP.md
cd ..
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

Full walkthrough (Google Cloud OAuth setup, getting a refresh token, running without Docker): **[docs/SETUP.md](docs/SETUP.md)**

## Project structure

```
Dispatch/
├── backend/                   # Express API
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/            # providers, mail-types, generate, send
│   │   ├── services/
│   │   │   ├── llm/           # provider registry + one module per LLM
│   │   │   ├── gmailService.js
│   │   │   └── getRefreshToken.js
│   │   └── templates/
│   │       └── emailPrompts.js
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/                  # Static HTML/CSS/JS, no build step
│   ├── public/
│   │   ├── index.html
│   │   ├── css/style.css
│   │   └── js/{app.js, config.js}
│   ├── Dockerfile             # nginx
│   └── nginx.conf
├── docs/
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   └── API.md
├── docker-compose.yml
└── LICENSE
```

## Documentation

- **[docs/SETUP.md](docs/SETUP.md)** — full setup, Google Cloud OAuth, troubleshooting
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how the pieces fit together, how to add a new LLM provider or mail type
- **[docs/API.md](docs/API.md)** — backend API reference

## A few practical notes

- **Gmail send limits:** a personal Gmail account can send roughly 500 emails/day — not a real constraint for manual-trigger use like this.
- **Personalize per company:** the "key points" and "extra context" fields exist so each email is genuinely tailored. Reusing identical bullet points across every company tends to read as, and get filtered as, spam.
- **Recheck before sending:** the model drafts from what you give it, but always skim the review card — company names, role titles, and factual claims are worth a second look before it goes out.

## License

MIT — see [LICENSE](LICENSE).
