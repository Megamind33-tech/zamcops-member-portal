// The society's email letterhead.
//
// Every message used to render the same way: a heading, one paragraph of
// escaped text, a footer. A verification code arrived as a sentence you had to
// read to find the digits in; an admission to the society looked exactly like a
// notice that a support ticket had been updated. This gives a message the shape
// of what it actually is — a code to type, a fact sheet, something to click.
//
// Two rules shape the markup, and both come from how mail clients behave rather
// than from taste:
//
//   * Tables and inline styles only. Outlook renders with Word's engine, which
//     has no flexbox, no grid, and drops a <style> block.
//   * Nothing important may depend on an image. Most clients block remote
//     images until the reader allows them, so the letterhead is set in type and
//     the society's flag rule is drawn with table cells. A blocked image would
//     otherwise leave the society's name as an empty box.
//
// Every message also carries a plain-text alternative. Without one, spam
// filters score a message worse and a text-only client shows nothing at all.

const INK = "#1C1917";
const MUTED = "#6B6158";
const LINE = "#E6DDD0";
const CANVAS = "#F3EEE6";
const ORANGE = "#F26C21";

const SOCIETY = "Zambian Music Copyright Protection Society";
const SOCIETY_EMAIL = "zamcops1@gmail.com";

/** Absolute base URL for links, from the domain the portal is served on. */
export function portalUrl(path = "/"): string {
  const domain = (process.env.PORTAL_DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return domain ? `https://${domain}${suffix}` : suffix;
}

export interface EmailContent {
  /** The subject line, as the reader sees it — no prefix is added. */
  subject: string;
  /** The grey line an inbox shows after the subject. Worth writing. */
  preheader?: string;
  heading?: string;
  greeting?: string;
  paragraphs?: string[];
  /** A code to be read and typed, set large and spaced so it can be. */
  code?: { value: string; caption?: string };
  /** Label/value rows — a reference, a work title, an amount. */
  facts?: { label: string; value: string }[];
  action?: { label: string; href: string };
  footnote?: string;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// The Zambian flag rule under the letterhead, as four table cells.
const flagRule = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
    <tr>
      <td height="4" width="28%" style="background:${ORANGE};font-size:0;line-height:0">&nbsp;</td>
      <td height="4" width="24%" style="background:#E2342B;font-size:0;line-height:0">&nbsp;</td>
      <td height="4" width="22%" style="background:#C9CEDA;font-size:0;line-height:0">&nbsp;</td>
      <td height="4" width="26%" style="background:#2BA45A;font-size:0;line-height:0">&nbsp;</td>
    </tr>
  </table>`;

function button(label: string, href: string): string {
  // Table-wrapped so Outlook gives it a real box rather than a bare link.
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px">
    <tr>
      <td align="center" bgcolor="${ORANGE}" style="border-radius:10px">
        <a href="${escapeHtml(href)}"
           style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                  font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const href = c.action ? (c.action.href.startsWith("http") ? c.action.href : portalUrl(c.action.href)) : "";

  const parts: string[] = [];
  if (c.heading) {
    parts.push(
      `<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;font-weight:bold;color:${INK}">${escapeHtml(c.heading)}</h1>`,
    );
  }
  if (c.greeting) {
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK}">${escapeHtml(c.greeting)}</p>`);
  }
  for (const p of c.paragraphs ?? []) {
    parts.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3A4149">${escapeHtml(p)}</p>`);
  }

  if (c.code) {
    parts.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0">
      <tr>
        <td align="center" style="background:${CANVAS};border:1px solid ${LINE};border-radius:12px;padding:22px 16px">
          <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;
                      letter-spacing:9px;color:${INK}">${escapeHtml(c.code.value)}</div>
          ${
            c.code.caption
              ? `<div style="margin-top:9px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED}">${escapeHtml(c.code.caption)}</div>`
              : ""
          }
        </td>
      </tr>
    </table>`);
  }

  if (c.facts?.length) {
    const rows = c.facts
      .map(
        (f, i) => `
      <tr>
        <td style="padding:9px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-size:13px;color:${MUTED};width:42%;vertical-align:top">${escapeHtml(f.label)}</td>
        <td style="padding:9px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-size:14px;color:${INK};font-weight:bold">${escapeHtml(f.value)}</td>
      </tr>`,
      )
      .join("");
    parts.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:20px 0;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif">${rows}</table>`);
  }

  if (c.action) parts.push(button(c.action.label, href));

  if (c.footnote) {
    parts.push(
      `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:${MUTED}">${escapeHtml(c.footnote)}</p>`,
    );
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(c.preheader ?? "")}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS}">
    <tr>
      <td align="center" style="padding:28px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden">
          <tr>
            <td style="padding:22px 28px 16px;background:${INK}">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:23px;font-weight:bold;
                          letter-spacing:1.5px;color:${ORANGE}">ZAMCOPS</div>
              <div style="margin-top:5px;font-family:Arial,Helvetica,sans-serif;font-size:10px;
                          letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.6)">${SOCIETY}</div>
            </td>
          </tr>
          <tr><td>${flagRule}</td></tr>
          <tr>
            <td style="padding:28px;font-family:Arial,Helvetica,sans-serif">${parts.join("\n")}</td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid ${LINE};background:#FCFAF7;
                       font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED}">
              <div>${SOCIETY} · Anchor House, 3rd Floor, P.O. Box 51259, Lusaka</div>
              <div style="margin-top:3px">
                <a href="mailto:${SOCIETY_EMAIL}" style="color:${MUTED}">${SOCIETY_EMAIL}</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(portalUrl("/settings"))}" style="color:${MUTED}">Notification settings</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // The plain-text alternative. Not a stripped copy of the HTML — it is written
  // to be read on its own.
  const t: string[] = [`ZAMCOPS — ${SOCIETY}`, ""];
  if (c.heading) t.push(c.heading.toUpperCase(), "");
  if (c.greeting) t.push(c.greeting, "");
  for (const p of c.paragraphs ?? []) t.push(p, "");
  if (c.code) t.push(`    ${c.code.value}`, c.code.caption ? `    ${c.code.caption}` : "", "");
  for (const f of c.facts ?? []) t.push(`${f.label}: ${f.value}`);
  if (c.facts?.length) t.push("");
  if (c.action) t.push(`${c.action.label}: ${href}`, "");
  if (c.footnote) t.push(c.footnote, "");
  t.push("—", `${SOCIETY}`, "Anchor House, 3rd Floor, P.O. Box 51259, Lusaka", SOCIETY_EMAIL);

  return { html, text: t.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") };
}
