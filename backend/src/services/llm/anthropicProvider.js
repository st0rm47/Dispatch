const Anthropic = require("@anthropic-ai/sdk");
const { parseJsonDraft } = require("./jsonUtil");

async function generate({ systemPrompt, userMessage, model }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model,
    max_tokens: 700,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = response.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  return parseJsonDraft(raw);
}

module.exports = { generate };
