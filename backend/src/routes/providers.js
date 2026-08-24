const express = require("express");
const router = express.Router();
const { listAvailableProviders } = require("../services/llm");

// GET endpoint for retrieving available LLM providers and whether company lookup is available based on the presence of an API key.
router.get("/", (req, res) => {
  res.json({
    providers: listAvailableProviders(),
    lookupAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

module.exports = router;
