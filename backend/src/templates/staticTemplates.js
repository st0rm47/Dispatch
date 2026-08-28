// Predefined email templates as an alternative to LLM drafting.
// No API call, no provider required, instant, deterministic output.
//
// Placeholders:
// {{senderName}}    - Applicant's name
// {{companyName}}   - Company name
// {{role}}          - Target position
// {{keyPoints}}     - Applicant's relevant skills/experience
// {{extraContext}}  - Optional company/job-specific context
// {{signature}}     - Applicant's signature/contact details

const STATIC_TEMPLATES = {
  cold_outreach: {
    subject: "{{role}} opportunities at {{companyName}}",
    body: `Dear Hiring Team,

My name is {{senderName}}, and I'm reaching out to explore opportunities for a {{role}} role at {{companyName}}. I'm particularly interested in contributing to a team where I can apply my technical skills while continuing to grow professionally.

Here are a few highlights of my background:

{{keyPoints}}

{{extraContext}}I have attached my resume for your consideration. If there is a suitable current or upcoming opportunity, I would be glad to discuss how my skills could contribute to your team.

Thank you for your time and consideration.

Best regards,
{{signature}}`,
  },

  followup: {
    subject: "Following up on {{role}} — {{companyName}}",
    body: `Dear Hiring Team,

I hope you're doing well. I wanted to follow up regarding my application for the {{role}} position at {{companyName}}.

I remain very interested in the opportunity and would appreciate any update you may be able to share regarding the status of my application.

{{extraContext}}Please let me know if you need any additional information or documents from my side.

Thank you again for your time and consideration. I look forward to hearing from you.

Best regards,
{{signature}}`,
  },

  vacancy_inquiry: {
    subject: "Inquiry about {{role}} opportunities at {{companyName}}",
    body: `Dear Hiring Team,

My name is {{senderName}}, and I'm writing to inquire whether {{companyName}} currently has, or may soon have, opportunities for a {{role}}.

My relevant background includes:

{{keyPoints}}

{{extraContext}}I've attached my resume for reference. If there is a suitable opening, I would appreciate the opportunity to discuss it further. If another person or team handles recruitment for this area, I would also be grateful if you could point me in the right direction.

Thank you for your time.

Best regards,
{{signature}}`,
  },

  formal_application: {
    subject: "Application for {{role}} — {{companyName}}",
    body: `Dear Hiring Manager,

I am writing to apply for the {{role}} position at {{companyName}}. I am interested in the opportunity to contribute my technical skills and gain further practical experience in a professional environment.

My relevant skills and experience include:

{{keyPoints}}

{{extraContext}}My resume is attached for your review. I would welcome the opportunity to discuss my background and how I could contribute to your team.

Thank you for considering my application. I look forward to hearing from you.

Sincerely,
{{signature}}`,
  },
};

function fillTemplate(str, vars) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = vars[key];
    return value != null && String(value).trim() !== ""
      ? String(value).trim()
      : "";
  });
}

/**
 * Formats user-provided skills/experience into a clean bullet list.
 *
 * Supports:
 * - Plain lines
 * - "- item"
 * - "* item"
 * - "• item"
 * - Numbered lines such as "1. item"
 */
function formatKeyPoints(text) {
  if (!text || !String(text).trim()) {
    return "";
  }

  return String(text)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.charAt(0).toUpperCase() + line.slice(1);

      return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
    })
    .map((line) => `• ${line}`)
    .join("\n");
}

/**
 * Formats optional context so it can be inserted naturally
 * after the key-points section.
 */
function formatExtraContext(text) {
  if (!text || !String(text).trim()) {
    return "";
  }

  return `\n\n${String(text).trim()}\n\n`;
}

function renderStaticTemplate({
  mailType,
  senderName,
  senderSignature,
  companyName,
  role,
  keyPoints,
  extraContext,
}) {
  const tpl = STATIC_TEMPLATES[mailType];

  if (!tpl) {
    throw new Error(`No static template exists for mail type "${mailType}".`);
  }

  const vars = {
    senderName: senderName || "",
    companyName: companyName || "your company",
    role: role || "a suitable role",
    keyPoints: formatKeyPoints(keyPoints),
    extraContext: formatExtraContext(extraContext),
    signature: senderSignature || senderName || "",
  };

  return {
    subject: fillTemplate(tpl.subject, vars).trim(),
    body: fillTemplate(tpl.body, vars)
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  };
}

module.exports = {
  renderStaticTemplate,
  STATIC_TEMPLATES,
};
