import nodemailer from "nodemailer";
import type { Lead } from "./db/schema";

/**
 * Outbound notification email over plain SMTP — no paid API, no third-party SDK.
 * Point it at any mailbox you already own (Namecheap Private Email, Google Workspace,
 * Gmail app password…). If SMTP env vars are missing, sending is a silent no-op so
 * local dev and preview deploys never fail on it.
 */

const HOST = process.env.SMTP_HOST ?? "";
const PORT = Number(process.env.SMTP_PORT ?? "465");
const USER = process.env.SMTP_USER ?? "";
const PASS = process.env.SMTP_PASS ?? "";
const FROM = process.env.LEAD_NOTIFY_FROM || USER;

/** Comma-separated list, e.g. "kasey@campusrun.network,brandon@campusrun.network". */
const TO = (process.env.LEAD_NOTIFY_TO ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const emailConfigured = Boolean(HOST && USER && PASS && TO.length > 0);

// Reuse one pooled transport across warm invocations instead of reconnecting per send.
const globalForMail = globalThis as unknown as {
  __campusrunMailer?: nodemailer.Transporter;
};

function transport(): nodemailer.Transporter {
  globalForMail.__campusrunMailer ??= nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: USER, pass: PASS },
    pool: true,
    maxConnections: 1,
  });
  return globalForMail.__campusrunMailer;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const dash = (v: string | null | undefined) => (v && v.trim() !== "" ? v : "—");

/**
 * Emails the team a new intake submission. Never throws — a mail outage must not
 * cost us the lead, which is already committed to the database before this runs.
 */
export async function notifyNewLead(lead: Lead, adminUrl: string): Promise<boolean> {
  if (!emailConfigured) {
    console.warn("[email] SMTP not configured — skipping new-lead notification");
    return false;
  }

  const rows: [string, string][] = [
    ["Company", dash(lead.company)],
    ["Contact", dash(lead.contactName)],
    ["Role", dash(lead.role)],
    ["Email", dash(lead.email)],
    ["Phone", dash(lead.phone)],
    ["Website", dash(lead.website)],
    ["Interested in", lead.interests.length ? lead.interests.join(", ") : "—"],
    ["Campuses / markets", dash(lead.campuses)],
    ["Timeline", dash(lead.timeline)],
    ["Budget", dash(lead.budget)],
    ["Heard about us", dash(lead.heardFrom)],
  ];

  const text = [
    `New Campus Run inquiry from ${lead.company}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    dash(lead.message),
    "",
    `Open in the console: ${adminUrl}`,
  ].join("\n");

  const html = `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f5f5f7;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5ea">
    <div style="background:#003b5c;padding:20px 24px">
      <div style="color:#ffcc00;font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase">Campus Run</div>
      <div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:6px">New inquiry — ${esc(lead.company)}</div>
    </div>
    <div style="padding:20px 24px">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#003b5c">
        ${rows
          .map(
            ([k, v]) =>
              `<tr>
                 <td style="padding:7px 0;color:#6e6e73;width:150px;vertical-align:top">${esc(k)}</td>
                 <td style="padding:7px 0;font-weight:600;vertical-align:top">${esc(v)}</td>
               </tr>`,
          )
          .join("")}
      </table>
      ${
        lead.message
          ? `<div style="margin-top:18px;padding:14px 16px;background:#f5f5f7;border-radius:12px;border-left:3px solid #ffcc00">
               <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#6e6e73;margin-bottom:6px">Message</div>
               <div style="font-size:14px;line-height:1.6;color:#003b5c;white-space:pre-wrap">${esc(lead.message)}</div>
             </div>`
          : ""
      }
      <a href="${esc(adminUrl)}" style="display:inline-block;margin-top:20px;background:#ffcc00;color:#002942;font-weight:700;font-size:14px;text-decoration:none;padding:12px 20px;border-radius:12px">Open in the console</a>
      <div style="margin-top:16px;font-size:12px;color:#6e6e73">Reply to this email to answer ${esc(lead.contactName)} directly.</div>
    </div>
  </div>
</div>`.trim();

  try {
    await transport().sendMail({
      from: `"Campus Run" <${FROM}>`,
      to: TO,
      replyTo: lead.email, // hitting reply goes straight to the brand
      subject: `New inquiry — ${lead.company}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] new-lead notification failed:", err);
    return false;
  }
}
