const express = require("express");
const multer = require("multer");
const router = express.Router();
const { sendEmail } = require("../services/gmailService");
const { getResumeFile } = require("../services/profileStore");

// Set up multer for handling file uploads, using memory storage and limiting file size to 10 MB.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST endpoint for sending emails with optional attachments. Validates required fields and handles file uploads, falling back to a saved resume if no file is provided and skipSavedResume is not set to true.
router.post("/", upload.single("cv"), async (req, res) => {
  try {
    const { to, from, fromName, subject, body, skipSavedResume } = req.body;
    if (!to || !from || !subject || !body) {
      return res.status(400).json({ error: "to, from, subject, and body are required." });
    }

    let attachment;
    if (req.file) {
      attachment = {
        filename: req.file.originalname,
        content: req.file.buffer,
        contentType: req.file.mimetype,
      };
    } else if (skipSavedResume !== "true") {
      // No file attached to this specific request — fall back to the saved
      // resume, if one exists, so it doesn't need re-uploading every time.
      const saved = getResumeFile();
      if (saved) {
        attachment = { filename: saved.filename, content: saved.content, contentType: saved.contentType };
      }
    }

    const result = await sendEmail({ to, from, fromName, subject, body, attachment });
    res.json({ success: true, messageId: result.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
