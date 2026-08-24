/**
 * Providers are instructed to return raw JSON, but models occasionally wrap
 * it in prose or markdown fences anyway. This parses defensively: try a
 * straight JSON.parse first, then fall back to extracting the first
 * {...} block found in the text.
 */
function parseJsonDraft(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through to error below
      }
    }
    throw new Error(`Model did not return valid JSON. Raw output was:\n${raw}`);
  }
}

module.exports = { parseJsonDraft };
