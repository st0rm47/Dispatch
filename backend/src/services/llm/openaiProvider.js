const { parseJsonDraft } = require("./jsonUtil");

async function generate({ systemPrompt, userMessage, model }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
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
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";
  return parseJsonDraft(raw);
}

module.exports = { generate };
