const API = (window.API_BASE || "") + "/api";
const TOTAL_STEPS = 4;
const STEP_NAMES = ["Your info", "Target", "Content", "Review & send"];

let currentStep = 0;
let cvFile = null;

// Step navigation

function goToStep(index) {
  currentStep = Math.max(0, Math.min(TOTAL_STEPS - 1, index));

  document.querySelectorAll(".step-panel").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.panel) === currentStep);
  });

  document.querySelectorAll(".step").forEach((el) => {
    const stepIndex = Number(el.dataset.step);
    el.classList.toggle("active", stepIndex === currentStep);
    el.classList.toggle("done", stepIndex < currentStep);
  });

  const progressPct = ((currentStep + 1) / TOTAL_STEPS) * 100;
  document.getElementById("stepperProgress").style.height = progressPct + "%";

  const mobileLabel = document.getElementById("mobileStepLabel");
  if (mobileLabel) mobileLabel.textContent = `Step ${currentStep + 1} of ${TOTAL_STEPS} — ${STEP_NAMES[currentStep]}`;

  if (currentStep === 3) syncReviewHeader();
}

document.querySelectorAll("[data-next]").forEach((btn) => {
  btn.addEventListener("click", () => goToStep(Number(btn.dataset.next)));
});
document.querySelectorAll("[data-prev]").forEach((btn) => {
  btn.addEventListener("click", () => goToStep(Number(btn.dataset.prev)));
});
document.querySelectorAll(".step").forEach((el) => {
  el.addEventListener("click", () => goToStep(Number(el.dataset.step)));
});

// ---------- Load dropdowns ----------

async function loadMailTypes() {
  const res = await fetch(`${API}/mail-types`);
  const types = await res.json();
  document.getElementById("mailType").innerHTML = types
    .map((t) => `<option value="${t.key}">${t.label}</option>`)
    .join("");
}

let lookupAvailable = false;

async function loadProviders() {
  const res = await fetch(`${API}/providers`);
  const data = await res.json();
  const providers = data.providers || [];
  lookupAvailable = Boolean(data.lookupAvailable);
  window.dispatchEvent(new CustomEvent("lookup-availability", { detail: lookupAvailable }));

  const select = document.getElementById("provider");
  const warning = document.getElementById("providerWarning");

  if (providers.length === 0) {
    select.innerHTML = `<option value="">No provider configured</option>`;
    select.disabled = true;
    warning.textContent =
      "No LLM is configured on the server yet. Add at least one API key (Claude, OpenAI, Gemini, or a local Ollama model) to backend/.env and restart.";
    warning.classList.remove("hidden");
    return;
  }

  select.disabled = false;
  warning.classList.add("hidden");
  select.innerHTML = providers.map((p) => `<option value="${p.key}">${p.label}</option>`).join("");
}

loadMailTypes();
loadProviders();
loadProfile();

// ---------- Saved profile ----------

let hasSavedResume = false;
let savedResumeFilename = null;

async function loadProfile() {
  try {
    const res = await fetch(`${API}/profile`);
    const p = await res.json();
    if (p.senderName) document.getElementById("senderName").value = p.senderName;
    if (p.fromEmail) document.getElementById("from").value = p.fromEmail;
    if (p.senderSignature) document.getElementById("senderSignature").value = p.senderSignature;
    if (p.keyPoints) document.getElementById("keyPoints").value = p.keyPoints;

    hasSavedResume = p.hasResume;
    savedResumeFilename = p.resumeFilename;
    const note = document.getElementById("savedResumeNote");
    if (hasSavedResume) {
      note.textContent = `Using saved resume: ${savedResumeFilename} — choose a new file above to replace it.`;
      note.classList.remove("hidden");
    }
    updateAttachmentChip();
  } catch {
    // No saved profile yet, or backend unreachable — just start blank.
  }
}

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveProfileBtn");
  const statusEl = document.getElementById("profileStatus");
  btn.disabled = true;
  statusEl.textContent = "Saving…";
  statusEl.className = "status";

  const formData = new FormData();
  formData.append("senderName", document.getElementById("senderName").value.trim());
  formData.append("fromEmail", document.getElementById("from").value.trim());
  formData.append("senderSignature", document.getElementById("senderSignature").value.trim());
  formData.append("keyPoints", document.getElementById("keyPoints").value.trim());
  if (cvFile) formData.append("resume", cvFile);

  try {
    const res = await fetch(`${API}/profile`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save.");
    hasSavedResume = data.hasResume;
    savedResumeFilename = data.resumeFilename;
    statusEl.textContent = "✓ Saved";
    statusEl.className = "status ok";
    const note = document.getElementById("savedResumeNote");
    if (hasSavedResume) {
      note.textContent = `Using saved resume: ${savedResumeFilename} — choose a new file above to replace it.`;
      note.classList.remove("hidden");
    }
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = "status err";
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("clearProfileBtn").addEventListener("click", async () => {
  const statusEl = document.getElementById("profileStatus");
  try {
    await fetch(`${API}/profile`, { method: "DELETE" });
    hasSavedResume = false;
    savedResumeFilename = null;
    document.getElementById("savedResumeNote").classList.add("hidden");
    statusEl.textContent = "✓ Cleared";
    statusEl.className = "status ok";
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = "status err";
  }
});

// ---------- Content mode (AI vs predefined template) ----------

const contentModeSelect = document.getElementById("contentMode");
const providerField = document.getElementById("providerField");

contentModeSelect.addEventListener("change", () => {
  providerField.classList.toggle("hidden", contentModeSelect.value === "template");
});

// ---------- File attach ----------

const cvInput = document.getElementById("cv");
const fileDrop = document.getElementById("fileDrop");
const fileLabel = document.getElementById("fileLabel");

cvInput.addEventListener("change", () => {
  cvFile = cvInput.files[0] || null;
  fileLabel.textContent = cvFile ? cvFile.name : "Choose a file or drag it here";
  updateAttachmentChip();
});

["dragover", "dragleave", "drop"].forEach((evt) => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.toggle("dragover", evt === "dragover");
    if (evt === "drop" && e.dataTransfer.files[0]) {
      cvInput.files = e.dataTransfer.files;
      cvFile = e.dataTransfer.files[0];
      fileLabel.textContent = cvFile.name;
      updateAttachmentChip();
    }
  });
});

function updateAttachmentChip() {
  const chip = document.getElementById("reviewAttachment");
  if (cvFile) {
    chip.textContent = `📎 ${cvFile.name} (${Math.round(cvFile.size / 1024)} KB)`;
    chip.classList.remove("hidden");
  } else if (hasSavedResume) {
    chip.textContent = `📎 ${savedResumeFilename} (from saved profile)`;
    chip.classList.remove("hidden");
  } else {
    chip.classList.add("hidden");
  }
}

// ---------- Gather state ----------

function collectFields() {
  return {
    senderName: document.getElementById("senderName").value.trim(),
    from: document.getElementById("from").value.trim(),
    senderSignature: document.getElementById("senderSignature").value.trim(),
    companyName: document.getElementById("companyName").value.trim(),
    to: document.getElementById("to").value.trim(),
    role: document.getElementById("role").value.trim(),
    mailType: document.getElementById("mailType").value,
    provider: document.getElementById("provider").value,
    mode: document.getElementById("contentMode").value,
    keyPoints: document.getElementById("keyPoints").value.trim(),
    extraContext: document.getElementById("extraContext").value.trim(),
  };
}

function syncReviewHeader() {
  const f = collectFields();
  document.getElementById("reviewFrom").textContent = f.from || "—";
  document.getElementById("reviewTo").textContent = f.to || "—";
  document.getElementById("draftTitle").textContent = f.companyName
    ? `Draft to ${f.companyName}`
    : "New message";
  updateAttachmentChip();
}

// ---------- Draft / regenerate ----------

async function draftEmail() {
  const f = collectFields();
  const errorEl = document.getElementById("draftError");
  errorEl.classList.add("hidden");

  if (!f.senderName || !f.from || !f.companyName || !f.to || !f.keyPoints) {
    errorEl.textContent = "Please fill in your name, email, company, recipient, and key points before drafting.";
    errorEl.classList.remove("hidden");
    return null;
  }
  if (f.mode === "ai" && !f.provider) {
    errorEl.textContent = "Pick a provider, or switch Content to \"Predefined template\" to skip AI drafting entirely.";
    errorEl.classList.remove("hidden");
    return null;
  }

  const res = await fetch(`${API}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(f),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate draft.");
  return data;
}

document.getElementById("draftBtn").addEventListener("click", async () => {
  const btn = document.getElementById("draftBtn");
  const errorEl = document.getElementById("draftError");
  btn.disabled = true;
  btn.querySelector(".btn-text").textContent = "Drafting…";
  try {
    const draft = await draftEmail();
    if (!draft) return; // validation message already shown
    document.getElementById("reviewSubject").value = draft.subject;
    document.getElementById("reviewBody").value = draft.body;
    goToStep(3);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.querySelector(".btn-text").textContent = "Draft the email →";
  }
});

document.getElementById("regenBtn").addEventListener("click", async () => {
  const btn = document.getElementById("regenBtn");
  const status = document.getElementById("status");
  btn.disabled = true;
  btn.textContent = "↻ …";
  status.textContent = "";
  status.className = "status";
  try {
    const draft = await draftEmail();
    if (draft) {
      document.getElementById("reviewSubject").value = draft.subject;
      document.getElementById("reviewBody").value = draft.body;
    }
  } catch (err) {
    status.textContent = err.message;
    status.className = "status err";
  } finally {
    btn.disabled = false;
    btn.textContent = "↻ Regenerate";
  }
});

// ---------- Send ----------

document.getElementById("sendBtn").addEventListener("click", async () => {
  const btn = document.getElementById("sendBtn");
  const status = document.getElementById("status");
  const f = collectFields();

  btn.disabled = true;
  btn.textContent = "Sending…";
  status.textContent = "";
  status.className = "status";

  const formData = new FormData();
  formData.append("to", f.to);
  formData.append("from", f.from);
  formData.append("fromName", f.senderName);
  formData.append("subject", document.getElementById("reviewSubject").value);
  formData.append("body", document.getElementById("reviewBody").value);
  if (cvFile) formData.append("cv", cvFile);

  try {
    const res = await fetch(`${API}/send`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send.");
    status.textContent = "✓ Sent — message ID " + data.messageId;
    status.className = "status ok";
  } catch (err) {
    status.textContent = err.message;
    status.className = "status err";
  } finally {
    btn.disabled = false;
    btn.textContent = "Send it";
  }
});

// Keep the review header (From/To/title/attachment) in sync if the user
// edits earlier steps and jumps back to step 4 without redrafting.
document.querySelectorAll("#from, #to, #companyName").forEach((el) => {
  el.addEventListener("input", () => {
    if (currentStep === 3) syncReviewHeader();
  });
});

goToStep(0);
