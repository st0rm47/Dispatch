const express = require("express");
const router = express.Router();
const { lookupCompany } = require("../services/companyLookup");

// POST endpoint for looking up company information based on provided parameters.
router.post("/", async (req, res) => {
  try {
    const { companyName, websiteHint, roleInterest } = req.body;
    if (!companyName) {
      return res.status(400).json({ error: "companyName is required." });
    }
    const result = await lookupCompany({ companyName, websiteHint, roleInterest });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
