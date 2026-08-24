const express = require("express");
const router = express.Router();
const { MAIL_TYPES } = require("../templates/emailPrompts");

// GET endpoint for retrieving available mail types, returning a list of mail type keys and their corresponding labels.
router.get("/", (req, res) => {
  const types = Object.entries(MAIL_TYPES).map(([key, v]) => ({ key, label: v.label }));
  res.json(types);
});

module.exports = router;
