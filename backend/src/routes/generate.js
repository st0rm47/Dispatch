// Route for generating email drafts based on user input and selected mode (AI or template).
const express = require("express");
const router = express.Router();
const { generateWithProvider } = require("../services/llm");
const { MAIL_TYPES } = require("../templates/emailPrompts");
const { renderStaticTemplate, STATIC_TEMPLATES } = require("../templates/staticTemplates");

// POST endpoint for generating email drafts. 
router.post("/", async (req, res) => {
  try {
    const {
      mode, // "ai" (default) or "template"
      provider,
      mailType,
      senderName,
      senderSignature,
      companyName,
      role,
      keyPoints,
      extraContext,
    } = req.body;

    if (!senderName || !companyName || !keyPoints) {
      return res.status(400).json({ error: "senderName, companyName, and keyPoints are required." });
    }

    // Template mode: pure placeholder substitution, no LLM call, no provider needed at all — works even with zero API keys configured.
    if (mode === "template") {
      if (!STATIC_TEMPLATES[mailType]) {
        return res.status(400).json({ error: "Unknown mail type." });
      }
      const draft = renderStaticTemplate({
        mailType,
        senderName,
        senderSignature,
        companyName,
        role,
        keyPoints,
        extraContext,
      });
      return res.json(draft);
    }

    // AI mode (default)
    const type = MAIL_TYPES[mailType];
    if (!type) {
      return res.status(400).json({ error: "Unknown mail type." });
    }
    if (!provider) {
      return res.status(400).json({ error: "provider is required in AI mode." });
    }

    const userMessage = `
Candidate name: ${senderName}
Target company: ${companyName}
Target role: ${role || "(not specified — infer a suitable general role from key points if needed)"}
Key points / achievements to draw on (do not invent facts beyond these):
${keyPoints}
${extraContext ? `\nAdditional context: ${extraContext}` : ""}

Signature block to close with (use as-is, do not rewrite it):
${senderSignature || ""}
`.trim();

    const systemPrompt = `${type.systemPrompt}

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{"subject": "...", "body": "..."}

The "body" should be plain text (no HTML), ready to send, ending with the
provided signature block. Do not include a "Subject:" line inside body.`;

    const draft = await generateWithProvider(provider, { systemPrompt, userMessage });
    res.json(draft);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
