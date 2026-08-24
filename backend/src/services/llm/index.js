const anthropic = require("./anthropicProvider");
const openai = require("./openaiProvider");
const gemini = require("./geminiProvider");
const ollama = require("./ollamaProvider");

// Add a new LLM by adding one entry here and one provider module next to this file.
const PROVIDERS = {
  anthropic: {
    label: "Claude (Anthropic)",
    isEnabled: () => Boolean(process.env.ANTHROPIC_API_KEY),
    module: anthropic,
    model: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  },
  openai: {
    label: "ChatGPT (OpenAI)",
    isEnabled: () => Boolean(process.env.OPENAI_API_KEY),
    module: openai,
    model: () => process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  gemini: {
    label: "Gemini (Google)",
    isEnabled: () => Boolean(process.env.GEMINI_API_KEY),
    module: gemini,
    model: () => process.env.GEMINI_MODEL || "gemini-1.5-flash",
  },
  ollama: {
    label: "Local model (Ollama)",
    isEnabled: () => process.env.OLLAMA_ENABLED === "true",
    module: ollama,
    model: () => process.env.OLLAMA_MODEL || "llama3.1",
  },
};

/** Returns only the providers that have credentials configured, for the frontend dropdown. */
function listAvailableProviders() {
  return Object.entries(PROVIDERS)
    .filter(([, p]) => p.isEnabled())
    .map(([key, p]) => ({ key, label: p.label, model: p.model() }));
}

/** Drafts an email using the requested provider. Throws if that provider isn't configured. */
async function generateWithProvider(providerKey, { systemPrompt, userMessage }) {
  const provider = PROVIDERS[providerKey];
  if (!provider || !provider.isEnabled()) {
    throw new Error(
      `The "${providerKey}" provider isn't configured on the server. Add its API key to backend/.env and restart.`
    );
  }
  return provider.module.generate({ systemPrompt, userMessage, model: provider.model() });
}

module.exports = { listAvailableProviders, generateWithProvider };
