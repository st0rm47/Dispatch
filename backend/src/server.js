// Load environment variables from .env file, if present. This is important for local development and Docker setups where the .env file contains sensitive API keys and configuration.
require("dotenv").config();

// Set up the backend Express server, which serves the API endpoints and optionally the frontend static files if present.
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Import route handlers for different API endpoints, each responsible for a specific functionality of the backend service.
const providersRoute = require("./routes/providers");
const mailTypesRoute = require("./routes/mailTypes");
const generateRoute = require("./routes/generate");
const sendRoute = require("./routes/send");
const lookupCompanyRoute = require("./routes/lookupCompany");
const profileRoute = require("./routes/profile");

// Initialize the Express application and configure middleware for handling CORS and JSON request bodies.
const app = express();
app.use(cors());
app.use(express.json());


// Register the imported route handlers with their respective API endpoint paths, allowing the backend to respond to requests made to these endpoints.
app.use("/api/providers", providersRoute);
app.use("/api/mail-types", mailTypesRoute);
app.use("/api/generate", generateRoute);
app.use("/api/send", sendRoute);
app.use("/api/lookup-company", lookupCompanyRoute);
app.use("/api/profile", profileRoute);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Dev convenience only: if ../../frontend/public exists next to this backend
// checkout, serve it too, so you can run just the backend during development
// without spinning up the separate nginx/frontend container. In Docker, the
// frontend is served by its own container instead (see docker-compose.yml).
const frontendPath = path.join(__dirname, "../../frontend/public");
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
}

// Start the Express server on the specified port, logging the URL and checking for configured LLM providers and Google refresh token.
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running at http://localhost:${PORT}`);
  const configured = require("./services/llm").listAvailableProviders();
  if (configured.length === 0) {
    console.warn("No LLM provider configured - set at least one API key in backend/.env.");
  } else {
    console.log(`LLM providers available: ${configured.map((p) => p.label).join(", ")}`);
  }
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.warn("No GOOGLE_REFRESH_TOKEN set yet — run `npm run auth` first.");
  }
});
