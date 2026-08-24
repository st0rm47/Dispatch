const { google } = require("googleapis");
// mailcomposer's default export is a function that builds AND compiles the
// message in one step (module.exports = mail => new MailComposer(mail).compile()).
// Calling .compile() again on its result fails, since that result is already
// a compiled MimeNode, not a MailComposer instance.
const mailcomposer = require("mailcomposer");

function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plain-text email spacing renders inconsistently across clients — some
// preserve blank lines as visible gaps, others collapse them, which is why
// the same message can look fine in one inbox and cramped in another.
// Sending an HTML alternative with explicit paragraph margins fixes that
// for any client that renders HTML (nearly all of them), while the plain
// text part remains as a fallback.
function textToHtml(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1f2933;">${body}</div>`;
}

/**
 * Sends an email through the Gmail API, optionally with a file attachment.
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.from - your own Gmail address (must match the authorized account)
 * @param {string} [params.fromName] - display name to show alongside the address, e.g. "Subodh Ghimire"
 * @param {string} params.subject
 * @param {string} params.body - plain text body
 * @param {{filename: string, content: Buffer, contentType: string}} [params.attachment]
 */
async function sendEmail({ to, from, fromName, subject, body, attachment }) {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  // Without a display name, mailcomposer (and Gmail) render the From header
  // as just the bare address, so recipients see "you@gmail.com" instead of
  // "Your Name". mailcomposer accepts { name, address } for this directly.
  const mailOptions = {
    from: fromName ? { name: fromName, address: from } : from,
    to,
    subject,
    text: body,
    html: textToHtml(body),
  };

  if (attachment) {
    mailOptions.attachments = [
      {
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      },
    ];
  }

  const raw = await new Promise((resolve, reject) => {
    mailcomposer(mailOptions).build((err, message) => {
      if (err) return reject(err);
      resolve(message);
    });
  });

  const encodedMessage = raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  return result.data; // { id, threadId, ... }
}

module.exports = { sendEmail };
