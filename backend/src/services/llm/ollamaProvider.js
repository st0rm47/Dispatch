const { parseJsonDraft } = require("./jsonUtil");

async function generate({ systemPrompt, userMessage, model }) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      format: "json",
      stream: false,
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\nRespond ONLY with valid JSON, no markdown fences, in this exact shape: {"subject": "...", "body": "..."}`,
        },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.message?.content || "";
  return parseJsonDraft(raw);
}

module.exports = { generate };
