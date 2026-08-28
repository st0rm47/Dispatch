// Mode toggle
const tabSingle = document.getElementById("tabSingle");
const tabBatch = document.getElementById("tabBatch");
const singleApp = document.getElementById("singleApp");
const batchApp = document.getElementById("batchApp");

tabSingle.addEventListener("click", () => {
  tabSingle.classList.add("active");
  tabBatch.classList.remove("active");
  singleApp.classList.remove("hidden");
  batchApp.classList.add("hidden");
});

tabBatch.addEventListener("click", () => {
  tabBatch.classList.add("active");
  tabSingle.classList.remove("active");
  batchApp.classList.remove("hidden");
  singleApp.classList.add("hidden");
});

window.addEventListener("lookup-availability", (e) => {
  const warning = document.getElementById("lookupWarning");
  if (!e.detail) {
    warning.textContent =
      "Company lookup needs ANTHROPIC_API_KEY set in backend/.env (it uses Claude's web search), even if you draft with a different provider below.";
    warning.classList.remove("hidden");
    document.getElementById("findDraftBtn").disabled = true;
  } else {
    warning.classList.add("hidden");
    document.getElementById("findDraftBtn").disabled = false;
  }
});

// batch.js loads after app.js, so populate the batch provider dropdown once
// the shared provider list has loaded (reuse the same /api/providers call).
(async function loadBatchProviders() {
  const res = await fetch(`${API}/providers`);
  const data = await res.json();
  const providers = data.providers || [];
  const select = document.getElementById("bProvider");
  select.innerHTML = providers.length
    ? providers.map((p) => `<option value="${p.key}">${p.label}</option>`).join("")
    : `<option value="">No provider configured</option>`;
})();

const bContentModeSelect = document.getElementById("bContentMode");
const bProviderField = document.getElementById("bProviderField");
bContentModeSelect.addEventListener("change", () => {
  bProviderField.classList.toggle("hidden", bContentModeSelect.value === "template");
});

// Prefill the shared sender fields from the same saved profile used in
// single-email mode — it's the same person, so no reason to re-type it.
let bHasSavedResume = false;
let bSavedResumeFilename = null;

(async function loadBatchProfile() {
  try {
    const res = await fetch(`${API}/profile`);
    const p = await res.json();
    if (p.senderName) document.getElementById("bSenderName").value = p.senderName;
    if (p.fromEmail) document.getElementById("bFrom").value = p.fromEmail;
    if (p.senderSignature) document.getElementById("bSenderSignature").value = p.senderSignature;
    if (p.keyPoints) document.getElementById("bKeyPoints").value = p.keyPoints;

    bHasSavedResume = p.hasResume;
    bSavedResumeFilename = p.resumeFilename;
    const note = document.getElementById("bSavedResumeNote");
    if (bHasSavedResume) {
      note.textContent = `Using saved resume: ${bSavedResumeFilename} — choose a new file above to replace it for this batch.`;
      note.classList.remove("hidden");
    }
  } catch {
    // No saved profile yet — fine, just start blank.
  }
})();

// ---------- Small concurrency pool ----------

async function runPool(items, worker, concurrency) {
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

// ---------- Batch state ----------

let batchRows = [];
let bCvFile = null;

const bCvInput = document.getElementById("bCv");
const bFileDrop = document.getElementById("bFileDrop");
const bFileLabel = document.getElementById("bFileLabel");

bCvInput.addEventListener("change", () => {
  bCvFile = bCvInput.files[0] || null;
  bFileLabel.textContent = bCvFile ? bCvFile.name : "Choose a file or drag it here";
});

["dragover", "dragleave", "drop"].forEach((evt) => {
  bFileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    bFileDrop.classList.toggle("dragover", evt === "dragover");
    if (evt === "drop" && e.dataTransfer.files[0]) {
      bCvInput.files = e.dataTransfer.files;
      bCvFile = e.dataTransfer.files[0];
      bFileLabel.textContent = bCvFile.name;
    }
  });
});

function parseCompanyList(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, website] = line.split("|").map((s) => s.trim());
      return { companyName: name, websiteHint: website || null };
    });
}

function pillFor(row) {
  const map = {
    pending: ["pending", "Queued"],
    looking: ["working", "Researching…"],
    drafting: ["working", "Drafting…"],
    ready: ["ready", "Ready"],
    "needs-email": ["needs-email", "No email found"],
    error: ["error", "Error"],
    sending: ["sending", "Sending…"],
    sent: ["sent", "Sent ✓"],
    failed: ["failed", "Failed"],
  };
  const [cls, label] = map[row.status] || ["pending", row.status];
  return `<span class="pill ${cls}">${label}</span>`;
}

function renderBatchTable() {
  const container = document.getElementById("batchTable");
  container.innerHTML = batchRows
    .map(
      (row, i) => `
    <div class="batch-row ${row.expanded ? "expanded" : ""} ${row.include ? "" : "excluded"}" data-row="${i}">
      <div class="batch-row-head" data-toggle="${i}">
        <input type="checkbox" data-include="${i}" ${row.include ? "checked" : ""} onclick="event.stopPropagation()" />
        <span class="batch-row-company">${row.companyName}</span>
        <span class="batch-row-subject">${row.subject || ""}</span>
        ${pillFor(row)}
      </div>
      <div class="batch-row-body">
        ${row.notes ? `<p class="batch-row-note">${row.notes}</p>` : ""}
        <label>Send to
          <input type="email" data-field="email" data-row="${i}" value="${row.email || ""}" placeholder="no email found — enter one manually" />
        </label>
        <label>Subject
          <input type="text" data-field="subject" data-row="${i}" value="${(row.subject || "").replace(/"/g, "&quot;")}" />
        </label>
        <label>Body
          <textarea data-field="body" data-row="${i}" rows="8">${row.body || ""}</textarea>
        </label>
        <button type="button" class="btn tiny" data-redraft="${i}">↻ Redraft this one</button>
      </div>
    </div>
  `
    )
    .join("");

  // Wire up per-row interactions (delegated re-bind each render — batch sizes are small).
  container.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = Number(el.dataset.toggle);
      batchRows[idx].expanded = !batchRows[idx].expanded;
      renderBatchTable();
    });
  });
  container.querySelectorAll("[data-include]").forEach((el) => {
    el.addEventListener("change", () => {
      batchRows[Number(el.dataset.include)].include = el.checked;
    });
  });
  container.querySelectorAll("[data-field]").forEach((el) => {
    el.addEventListener("input", () => {
      batchRows[Number(el.dataset.row)][el.dataset.field] = el.value;
    });
  });
  container.querySelectorAll("[data-redraft]").forEach((el) => {
    el.addEventListener("click", () => redraftRow(Number(el.dataset.redraft)));
  });
}

function updateBatchProgress(doneLabel) {
  document.getElementById("batchProgress").textContent = doneLabel;
}

// ---------- Find & draft all ----------

async function processRow(row) {
  const shared = {
    provider: document.getElementById("bProvider").value,
    mode: document.getElementById("bContentMode").value,
    senderName: document.getElementById("bSenderName").value.trim(),
    senderSignature: document.getElementById("bSenderSignature").value.trim(),
    from: document.getElementById("bFrom").value.trim(),
    keyPoints: document.getElementById("bKeyPoints").value.trim(),
    extraContext: document.getElementById("bExtraContext").value.trim(),
    roleInterest: document.getElementById("bRoleInterest").value.trim(),
  };

  try {
    row.status = "looking";
    renderBatchTable();

    const lookupRes = await fetch(`${API}/lookup-company`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: row.companyName,
        websiteHint: row.websiteHint,
        roleInterest: shared.roleInterest,
      }),
    });
    const lookup = await lookupRes.json();
    if (!lookupRes.ok) throw new Error(lookup.error || "Lookup failed.");

    row.email = lookup.contactEmail || "";
    row.careersUrl = lookup.careersUrl;
    row.hasOpenRole = Array.isArray(lookup.openRoles) && lookup.openRoles.length > 0;
    row.role = row.hasOpenRole ? lookup.openRoles[0].title : shared.roleInterest;
    row.mailType = row.hasOpenRole ? "formal_application" : "vacancy_inquiry";
    row.notes = [lookup.notes, lookup.careersUrl ? `Careers page: ${lookup.careersUrl}` : null]
      .filter(Boolean)
      .join(" — ");

    row.status = "drafting";
    renderBatchTable();

    const draftRes = await fetch(`${API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: shared.provider,
        mode: shared.mode,
        mailType: row.mailType,
        senderName: shared.senderName,
        senderSignature: shared.senderSignature,
        companyName: row.companyName,
        role: row.role,
        keyPoints: shared.keyPoints,
        extraContext: [shared.extraContext, row.careersUrl ? `Careers page: ${row.careersUrl}` : null]
          .filter(Boolean)
          .join(". "),
      }),
    });
    const draft = await draftRes.json();
    if (!draftRes.ok) throw new Error(draft.error || "Draft failed.");

    row.subject = draft.subject;
    row.body = draft.body;
    row.status = row.email ? "ready" : "needs-email";
  } catch (err) {
    row.status = "error";
    row.notes = err.message;
  }
  renderBatchTable();
}

async function redraftRow(index) {
  const row = batchRows[index];
  row.status = "drafting";
  renderBatchTable();
  await processRow(row);
}

async function autoSaveBatchProfile() {
  const formData = new FormData();
  formData.append("senderName", document.getElementById("bSenderName").value.trim());
  formData.append("fromEmail", document.getElementById("bFrom").value.trim());
  formData.append("senderSignature", document.getElementById("bSenderSignature").value.trim());
  formData.append("keyPoints", document.getElementById("bKeyPoints").value.trim());
  if (bCvFile) formData.append("resume", bCvFile);
  try {
    const res = await fetch(`${API}/profile`, { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) {
      bHasSavedResume = data.hasResume;
      bSavedResumeFilename = data.resumeFilename;
    }
  } catch {
    // Non-critical — the batch run itself still proceeds either way.
  }
}

document.getElementById("findDraftBtn").addEventListener("click", async () => {
  const btn = document.getElementById("findDraftBtn");
  const errorEl = document.getElementById("batchError");
  errorEl.classList.add("hidden");

  const rawList = document.getElementById("bCompanyList").value;
  const companies = parseCompanyList(rawList);

  if (!document.getElementById("bSenderName").value.trim() || !document.getElementById("bFrom").value.trim()) {
    errorEl.textContent = "Fill in your name and sending address first.";
    errorEl.classList.remove("hidden");
    return;
  }
  if (companies.length === 0) {
    errorEl.textContent = "Add at least one company, one per line.";
    errorEl.classList.remove("hidden");
    return;
  }

  // Fire-and-forget: shared fields (name, signature, key points, CV) are all
  // filled in by this point, so save them for next time without blocking the run.
  autoSaveBatchProfile();

  batchRows = companies.map((c) => ({
    ...c,
    include: true,
    expanded: false,
    status: "pending",
    email: "",
    subject: "",
    body: "",
    notes: "",
  }));

  document.getElementById("batchResults").classList.remove("hidden");
  renderBatchTable();

  btn.disabled = true;
  let completed = 0;
  updateBatchProgress(`0 / ${batchRows.length} researched & drafted`);

  await runPool(
    batchRows,
    async (row) => {
      await processRow(row);
      completed++;
      updateBatchProgress(`${completed} / ${batchRows.length} researched & drafted`);
    },
    3
  );

  btn.disabled = false;
  document.getElementById("batchResults").scrollIntoView({ behavior: "smooth", block: "start" });
});

// ---------- Send all ----------

document.getElementById("sendAllBtn").addEventListener("click", async () => {
  const btn = document.getElementById("sendAllBtn");
  const statusEl = document.getElementById("sendAllStatus");
  const from = document.getElementById("bFrom").value.trim();
  const fromName = document.getElementById("bSenderName").value.trim();

  const toSend = batchRows.filter((r) => r.include && r.email && (r.status === "ready" || r.status === "failed"));
  if (toSend.length === 0) {
    statusEl.textContent = "Nothing to send — check that rows are included and have an email.";
    statusEl.className = "status err";
    return;
  }

  btn.disabled = true;
  let sent = 0;

  for (const row of toSend) {
    row.status = "sending";
    renderBatchTable();
    statusEl.textContent = `Sending ${sent + 1} / ${toSend.length}…`;
    statusEl.className = "status";

    try {
      const formData = new FormData();
      formData.append("to", row.email);
      formData.append("from", from);
      formData.append("fromName", fromName);
      formData.append("subject", row.subject);
      formData.append("body", row.body);
      if (bCvFile) formData.append("cv", bCvFile);

      const res = await fetch(`${API}/send`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed.");

      row.status = "sent";
    } catch (err) {
      row.status = "failed";
      row.notes = err.message;
    }
    sent++;
    renderBatchTable();

    // Small pause between sends — gentler on Gmail's rate limits and avoids
    // firing a burst of identical-looking traffic all at once.
    if (sent < toSend.length) await new Promise((r) => setTimeout(r, 2500));
  }

  btn.disabled = false;
  const sentCount = toSend.filter((r) => r.status === "sent").length;
  statusEl.textContent = `✓ Done — ${sentCount} / ${toSend.length} sent`;
  statusEl.className = sentCount === toSend.length ? "status ok" : "status err";
});
