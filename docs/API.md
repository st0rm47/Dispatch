# API Reference

Base URL: `http://localhost:4000/api` (direct) or `/api` (via the frontend's nginx proxy).

All responses are JSON. Errors return `{ "error": "message" }` with a 4xx/5xx status.

---

### `GET /mail-types`

Returns the available mail types for the dropdown.

**Response**
```json
[
  { "key": "cold_outreach", "label": "Cold Outreach (no open vacancy)" },
  { "key": "followup", "label": "Follow-up" },
  { "key": "vacancy_inquiry", "label": "Vacancy / Openings Inquiry" },
  { "key": "formal_application", "label": "Formal Job Application" }
]
```

---

### `GET /providers`

Returns the LLM providers configured for drafting, plus whether company
lookup (which always uses Claude specifically, for its web search tool) is
available.

**Response**
```json
{
  "providers": [
    { "key": "anthropic", "label": "Claude (Anthropic)", "model": "claude-sonnet-5" },
    { "key": "openai", "label": "ChatGPT (OpenAI)", "model": "gpt-4o-mini" }
  ],
  "lookupAvailable": true
}
```

---

### `POST /lookup-company`

Researches a company: official website, careers page, a *published* contact
email (never guessed/constructed), and any currently listed open roles.
Requires `ANTHROPIC_API_KEY` regardless of which provider you draft with,
since it relies on Claude's web search tool.

**Body**
```json
{
  "companyName": "Acme Robotics",
  "websiteHint": "https://acme.example",
  "roleInterest": "Software engineering internship"
}
```

Required: `companyName`. `websiteHint` and `roleInterest` are optional.

**Response**
```json
{
  "website": "https://acme.example",
  "careersUrl": "https://acme.example/careers",
  "contactEmail": "careers@acme.example",
  "emailSource": "Listed on the careers page footer",
  "openRoles": [{ "title": "Software Engineering Intern", "url": "https://acme.example/careers/123" }],
  "confidence": "high",
  "notes": "Double-check the email is still monitored."
}
```

Any field can be `null` (or an empty array for `openRoles`) if nothing
reliable was found — the caller should treat that as "needs manual input,"
never fall back to a guessed address.

---

### `POST /generate`

Drafts a subject + body. Does **not** send anything.

**Body**
```json
{
  "mode": "ai",
  "provider": "anthropic",
  "mailType": "cold_outreach",
  "senderName": "Aayush Sharma",
  "senderSignature": "Aayush Sharma\n+977-98XXXXXXXX\nlinkedin.com/in/aayushsharma",
  "companyName": "Acme Robotics",
  "role": "Software Engineering Intern",
  "keyPoints": "- 3rd year CS student\n- Built X using Y",
  "extraContext": "Referred by a friend on the team"
}
```

`mode` is `"ai"` (default, omit it for the same behavior) or `"template"`:
- `"ai"` — drafts with the given `provider`, required in this mode.
- `"template"` — pure placeholder substitution using
  `templates/staticTemplates.js`, no LLM call, no provider needed. Useful
  when you want fast, free, fully predictable output instead of AI
  variation, or don't have any provider configured at all.

Required always: `mailType`, `senderName`, `companyName`, `keyPoints`.
Required in AI mode only: `provider`.

**Response**
```json
{ "subject": "...", "body": "..." }
```

---

### `POST /send`

`multipart/form-data`. Sends the email via Gmail.

| Field | Required | Notes |
|---|---|---|
| `to` | yes | Recipient email |
| `from` | yes | Must match the Gmail account authorized via `npm run auth` |
| `fromName` | no | Display name shown to the recipient, e.g. "Subodh Ghimire" — without it, they just see the bare address |
| `subject` | yes | |
| `body` | yes | Plain text (an HTML alternative with matching paragraph spacing is generated automatically) |
| `cv` | no | File attachment (PDF/DOC/DOCX, up to 10MB). If omitted, falls back to the saved resume from `/profile`, if one exists |
| `skipSavedResume` | no | Set to `"true"` to send with no attachment at all, even if a resume is saved |

**Response**
```json
{ "success": true, "messageId": "18c..." }
```

---

### `GET /profile`

Returns the saved sender profile (name, email, signature, key points, and
whether a resume is saved). Empty strings/`false` if nothing has been saved
yet — this never 404s.

**Response**
```json
{
  "senderName": "Subodh Ghimire",
  "fromEmail": "ghimiresubodh59@gmail.com",
  "senderSignature": "Subodh Ghimire\nPhone: 9848943334",
  "keyPoints": "- 8th semester CSIT student\n- Backend + AI/ML projects",
  "hasResume": true,
  "resumeFilename": "resume.pdf"
}
```

---

### `POST /profile`

`multipart/form-data`. Saves/updates the profile. Text fields are always
upserted; the `resume` file field is optional — omitting it leaves any
previously saved resume untouched (saving text fields alone never wipes it).

| Field | Notes |
|---|---|
| `senderName`, `fromEmail`, `senderSignature`, `keyPoints` | Text fields, all optional |
| `resume` | Optional file — only replaces the saved resume if provided |

**Response**: same shape as `GET /profile`.

---

### `DELETE /profile`

Clears the saved profile and resume entirely.

**Response**
```json
{ "success": true }
```

---

### `GET /health`

Liveness check.

**Response**
```json
{ "status": "ok" }
```
