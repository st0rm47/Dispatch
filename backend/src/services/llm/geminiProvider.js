const { parseJsonDraft } = require("./jsonUtil");

async function generate({ systemPrompt, userMessage, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `${systemPrompt}\n\nRespond ONLY with valid JSON, no markdown fences, in this exact shape: {"subject": "...", "body": "..."}`,
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonDraft(raw);
}

module.exports = { generate };
