const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// Single-user local tool: one saved profile, always row id = 1.
// Stored at backend/data/dispatch.db — mounted as a Docker volume in
// docker-compose.yml so it survives container rebuilds. Never committed to
// git (see .gitignore) since it can contain a resume/CV.

const DATA_DIR = process.env.DB_DIR || path.join(__dirname, "../../data");
const DB_PATH = path.join(DATA_DIR, "dispatch.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    sender_name TEXT,
    from_email TEXT,
    sender_signature TEXT,
    key_points TEXT,
    resume_filename TEXT,
    resume_content_type TEXT,
    resume_content BLOB,
    updated_at TEXT
  )
`);

/** Returns saved profile fields, without the raw resume bytes (use getResumeFile for that). */
function getProfile() {
  const row = db
    .prepare(
      `SELECT sender_name, from_email, sender_signature, key_points, resume_filename, resume_content_type
       FROM profile WHERE id = 1`
    )
    .get();

  if (!row) return null;

  return {
    senderName: row.sender_name || "",
    fromEmail: row.from_email || "",
    senderSignature: row.sender_signature || "",
    keyPoints: row.key_points || "",
    hasResume: Boolean(row.resume_filename),
    resumeFilename: row.resume_filename || null,
  };
}

/** Returns the saved resume as a Buffer + metadata, or null if none saved. */
function getResumeFile() {
  const row = db
    .prepare(`SELECT resume_filename, resume_content_type, resume_content FROM profile WHERE id = 1`)
    .get();
  if (!row || !row.resume_filename) return null;
  return {
    filename: row.resume_filename,
    contentType: row.resume_content_type,
    content: row.resume_content,
  };
}

/**
 * Upserts the saved profile. Resume fields are only overwritten when a new
 * file is provided — saving text fields alone never wipes a previously
 * saved resume.
 */
function saveProfile({ senderName, fromEmail, senderSignature, keyPoints, resumeFile }) {
  const existing = db.prepare(`SELECT id FROM profile WHERE id = 1`).get();

  if (existing) {
    if (resumeFile) {
      db.prepare(
        `UPDATE profile SET sender_name=?, from_email=?, sender_signature=?, key_points=?,
         resume_filename=?, resume_content_type=?, resume_content=?, updated_at=datetime('now') WHERE id=1`
      ).run(
        senderName,
        fromEmail,
        senderSignature,
        keyPoints,
        resumeFile.filename,
        resumeFile.contentType,
        resumeFile.content
      );
    } else {
      db.prepare(
        `UPDATE profile SET sender_name=?, from_email=?, sender_signature=?, key_points=?,
         updated_at=datetime('now') WHERE id=1`
      ).run(senderName, fromEmail, senderSignature, keyPoints);
    }
  } else {
    db.prepare(
      `INSERT INTO profile (id, sender_name, from_email, sender_signature, key_points,
       resume_filename, resume_content_type, resume_content, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(
      senderName,
      fromEmail,
      senderSignature,
      keyPoints,
      resumeFile ? resumeFile.filename : null,
      resumeFile ? resumeFile.contentType : null,
      resumeFile ? resumeFile.content : null
    );
  }

  return getProfile();
}

function clearProfile() {
  db.prepare(`DELETE FROM profile WHERE id = 1`).run();
}

module.exports = { getProfile, getResumeFile, saveProfile, clearProfile };
