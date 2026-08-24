const express = require("express");
const multer = require("multer");
const router = express.Router();
const { getProfile, saveProfile, clearProfile } = require("../services/profileStore");

// Set up multer for handling file uploads, using memory storage and limiting file size to 10 MB.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });


// GET endpoint for retrieving the user's profile, returning stored information or default values if no profile exists.
router.get("/", (req, res) => {
  res.json(getProfile() || { senderName: "", fromEmail: "", senderSignature: "", keyPoints: "", hasResume: false, resumeFilename: null });
});

router.post("/", upload.single("resume"), (req, res) => {
  try {
    const { senderName, fromEmail, senderSignature, keyPoints } = req.body;

    let resumeFile;
    if (req.file) {
      resumeFile = {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        content: req.file.buffer,
      };
    }

    const profile = saveProfile({
      senderName: senderName || "",
      fromEmail: fromEmail || "",
      senderSignature: senderSignature || "",
      keyPoints: keyPoints || "",
      resumeFile,
    });

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", (req, res) => {
  clearProfile();
  res.json({ success: true });
});

module.exports = router;
