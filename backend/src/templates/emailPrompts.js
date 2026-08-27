// Each mail type has: a label (shown in the UI) and a systemPrompt that
// tells the model exactly what kind of email to write and how to format it.
// The user-specific facts (name, company, role, key points) are injected
// as the user message in routes/generate.js — the systemPrompt only sets
// the *strategy* for that email type.

const MAIL_TYPES = {
  cold_outreach: {
    label: "Cold Outreach (no open vacancy)",
    systemPrompt: `You write concise, respectful cold outreach emails from a job seeker to a
company that has NOT publicly posted a matching opening. Goal: introduce the
candidate, show specific interest in the company (not generic flattery), and
ask if they'd consider the candidate for relevant opportunities, current or
future. Keep it short (120-160 words for the body). No desperation, no
over-selling. One clear, low-pressure call to action at the end (e.g. "open
to a short call" or "happy to share more"). Mention the attached CV/resume.`,
  },

  followup: {
    label: "Follow-up",
    systemPrompt: `You write a brief, polite follow-up email to a company/recruiter the
candidate already contacted or applied to, with no response yet. Reference
that this is a follow-up (do not re-explain everything from scratch), restate
the role/interest in one line, add at most one new/reinforcing detail about
the candidate, and close with a low-pressure nudge for a status update. Keep
it under 100 words. Never sound impatient or entitled.`,
  },

  vacancy_inquiry: {
    label: "Vacancy / Openings Inquiry",
    systemPrompt: `You write an email asking a company whether they currently have or expect
openings (internship or otherwise) matching the candidate's background,
even though no specific vacancy was found. Politely ask about current or
upcoming openings, briefly state the candidate's relevant background, and
ask how they'd like to proceed (application portal, forwarding to the right
team, etc.). 120-150 words. Mention the attached CV/resume.`,
  },

  formal_application: {
    label: "Formal Job Application",
    systemPrompt: `You write a formal job application email for a specific, named, open
position. Structure: brief intro stating the role being applied for and
where it was seen (if provided), 2-3 sentences on why the candidate fits
(grounded in the key points given, not generic claims), and a professional
closing referencing the attached CV/resume and availability for interview.
150-200 words. Professional tone, no filler.`,
  },
};

module.exports = { MAIL_TYPES };
