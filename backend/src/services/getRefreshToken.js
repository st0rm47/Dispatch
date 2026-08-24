// Run this once with `npm run auth` from the backend/ folder. It opens a
// browser for you to grant Gmail send access, then prints the refresh token
// to paste into backend/.env as GOOGLE_REFRESH_TOKEN.
require("dotenv").config();
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const open = require("open");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces a refresh_token to be issued every time
  scope: SCOPES,
});

const redirectPort = new url.URL(process.env.GOOGLE_REDIRECT_URI).port || 4000;

const server = http
  .createServer(async (req, res) => {
    try {
      const qs = new url.URL(req.url, process.env.GOOGLE_REDIRECT_URI).searchParams;
      const code = qs.get("code");
      if (!code) {
        res.end("No code received. Check the terminal for errors.");
        return;
      }
      const { tokens } = await oauth2Client.getToken(code);
      res.end("Success! You can close this tab and go back to the terminal.");
      server.close();

      console.log("\n=== Add this line to backend/.env ===");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("=======================================\n");
      process.exit(0);
    } catch (err) {
      console.error("Error exchanging code for tokens:", err.message);
      res.end("Error — check the terminal.");
      process.exit(1);
    }
  })
  .listen(redirectPort, () => {
    console.log("Opening browser for Google sign-in...");
    open(authUrl);
  });
