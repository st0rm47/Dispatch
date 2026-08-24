const Anthropic = require("@anthropic-ai/sdk");
const { parseJsonDraft } = require("./llm/jsonUtil");

// Company lookup always uses Claude specifically (regardless of which provider
// the user picked for drafting), because it needs a model with a built-in web
// search tool. This keeps the "who am I emailing" research separate from the
// "what does the email say" drafting, which can use any configured provider.

const SYSTEM_PROMPT = `You are a research assistant helping a job seeker find how to contact a
company about job opportunities. Given a company name (and optionally a
known website), use web search to find:

1. The company's official website.
2. Their careers/jobs page URL, if one exists.
3. A publicly listed contact email for job applications, HR, or careers
   (e.g. careers@, jobs@, hr@, talent@). Only include an email if you
   actually found it published on a real page — never guess, construct, or
   pattern-match one (e.g. do not assume "careers@company.com" just because
   that's a common pattern; find it stated somewhere).
4. Any currently open positions listed on their careers page, limited to
   ones that could plausibly match a general software/tech/internship
   background unless told otherwise. Title + URL only — never invent a
   posting that isn't actually listed.

After searching, respond with ONLY a single JSON object — no markdown
fences, no prose before or after — in this exact shape:
{
  "website": "https://... or null",
  "careersUrl": "https://... or null",
  "contactEmail": "found@company.com or null",
  "emailSource": "short note on where the email was found, or null",
  "openRoles": [{"title": "...", "url": "..."}],
  "confidence": "high" | "medium" | "low",
  "notes": "one short sentence flagging anything the user should double-check"
}`;

async function lookupCompany({ companyName, websiteHint, roleInterest }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Company lookup needs ANTHROPIC_API_KEY set in backend/.env (it uses Claude's web search tool), regardless of which provider you're drafting with."
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = [
    `Company: ${companyName}`,
    websiteHint ? `Known website: ${websiteHint}` : null,
    roleInterest ? `Candidate is interested in roles like: ${roleInterest}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userMessage }],
  });

  const rawText = response.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  try {
    return parseJsonDraft(rawText);
  } catch {
    // Fail soft: one bad lookup shouldn't blow up an entire batch.
    return {
      website: null,
      careersUrl: null,
      contactEmail: null,
      emailSource: null,
      openRoles: [],
      confidence: "low",
      notes: "Automated lookup couldn't be parsed — fill in the email manually.",
    };
  }
}

module.exports = { lookupCompany };
