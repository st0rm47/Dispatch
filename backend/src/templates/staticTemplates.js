// Predefined mail patterns as an alternative to LLM drafting: no API call,
// no provider needed, instant, and fully predictable. Only the bracketed
// placeholders change per company; everything else is fixed wording.
//
// Placeholders: {{senderName}} {{companyName}} {{role}} {{keyPoints}}
// {{extraContext}} {{signature}}

const STATIC_TEMPLATES = {
  cold_outreach: {
    subject: "Exploring opportunities at {{companyName}}",
    body: `Dear Hiring Team,

My name is {{senderName}}, and I'm reaching out to express interest in potential opportunities at {{companyName}}, particularly around {{role}}.

A bit about my background:
{{keyPoints}}

{{extraContext}}I've attached my resume for your review, and would welcome the chance to discuss how I could contribute to your team — now or as future openings come up.

Thank you for your time and consideration.

Best regards,
{{signature}}`,
  },

  followup: {
    subject: "Following up — {{role}} at {{companyName}}",
    body: `Dear Hiring Team,

I wanted to briefly follow up on my earlier note regarding {{role}} at {{companyName}}. I remain very interested in the opportunity and wanted to check if there's any update on my application.

{{extraContext}}Happy to provide any additional information that would help.

Thank you again for your time.

Best regards,
{{signature}}`,
  },

  vacancy_inquiry: {
    subject: "Inquiring about openings at {{companyName}}",
    body: `Dear Hiring Team,

My name is {{senderName}}. I'm writing to ask whether {{companyName}} currently has, or expects to have, any openings related to {{role}}.

A bit about my background:
{{keyPoints}}

{{extraContext}}I've attached my resume for reference. If there's a better contact or process for this, I'd appreciate being pointed in the right direction.

Thank you for your time.

Best regards,
{{signature}}`,
  },

  formal_application: {
    subject: "Application for {{role}} at {{companyName}}",
    body: `Dear Hiring Manager,

I am writing to formally apply for the {{role}} position at {{companyName}}.

{{keyPoints}}

{{extraContext}}My resume is attached for your review. I would welcome the opportunity to discuss my qualifications further and am available at your convenience for an interview.

Thank you for your time and consideration.

Sincerely,
{{signature}}`,
  },
};

function fillTemplate(str, vars) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = vars[key];
    return value != null && value !== "" ? value : "";
  });
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
    role: role || "roles matching my background",
    keyPoints: keyPoints || "",
    extraContext: extraContext ? `${extraContext}\n\n` : "",
    signature: senderSignature || senderName || "",
  };

  return {
    subject: fillTemplate(tpl.subject, vars),
    body: fillTemplate(tpl.body, vars),
  };
}

module.exports = { renderStaticTemplate, STATIC_TEMPLATES };
