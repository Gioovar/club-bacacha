import { SITE, formatMemberNumber } from "@/lib/site";
import type { PublicMember } from "@/lib/members/types";

/**
 * Email service abstraction (Fase 3: Resend). Disabled unless RESEND_API_KEY
 * and EMAIL_FROM are set. Templates are plain functions → { subject, html, text }.
 */

export type EmailTemplateId = "welcome" | "confirmation" | "birthday" | "event" | "benefit" | "invitation";

export type RenderedEmail = { subject: string; html: string; text: string };

export interface EmailProvider {
  readonly enabled: boolean;
  send(params: { to: string; email: RenderedEmail }): Promise<{ ok: boolean; id?: string; reason?: string }>;
}

class ResendEmailProvider implements EmailProvider {
  readonly enabled = true;
  constructor(private readonly apiKey: string, private readonly from: string) {}
  async send({ to, email }: { to: string; email: RenderedEmail }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!res.ok) return { ok: false, reason: `resend_${res.status}` };
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id };
  }
}

class DisabledEmailProvider implements EmailProvider {
  readonly enabled = false;
  async send() {
    return { ok: false, reason: "not_configured" };
  }
}

export function getEmailProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM; // e.g. "Club Bacachá <club@bacacha.com>"
  return key && from ? new ResendEmailProvider(key, from) : new DisabledEmailProvider();
}

/* ---------------- Templates (minimal, on-brand, dark) ---------------- */

const shell = (title: string, body: string) => `<!doctype html><html lang="es"><body style="margin:0;background:#050505;color:#ece8e1;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:48px 24px">
<table role="presentation" width="100%" style="max-width:520px"><tr><td>
<p style="letter-spacing:.32em;font-size:11px;color:#8c8a85;margin:0 0 32px">CLUB BACACHÁ</p>
<h1 style="font-size:40px;line-height:1;margin:0 0 24px;text-transform:uppercase;letter-spacing:-.01em">${title}</h1>
${body}
<p style="font-size:11px;color:#8c8a85;margin-top:48px">Recibes este correo porque eres miembro de ${SITE.name}.</p>
</td></tr></table></td></tr></table></body></html>`;

export const emailTemplates = {
  welcome(member: PublicMember): RenderedEmail {
    const n = formatMemberNumber(member.memberNumber);
    return {
      subject: `Ya estás dentro, ${member.firstName}.`,
      text: `Bienvenido al Club Bacachá. Tu número de miembro es #${n}. ${SITE.url}/mi-membresia`,
      html: shell(
        "Ya estás dentro.",
        `<p style="font-size:16px;line-height:1.6;color:#b9b6b0">Bienvenido al Club Bacachá, ${member.firstName}.</p>
         <p style="font-size:13px;letter-spacing:.24em;color:#8c8a85;margin:32px 0 4px">MEMBER</p>
         <p style="font-size:44px;margin:0">#${n}</p>
         <p style="margin-top:32px"><a href="${SITE.url}/mi-membresia" style="display:inline-block;background:#ece8e1;color:#050505;padding:16px 28px;text-decoration:none;font-size:12px;letter-spacing:.22em;font-weight:bold">VER MI MEMBRESÍA</a></p>`,
      ),
    };
  },
  // TODO(Fase 3): confirmation, birthday, event, benefit, invitation — same shell.
} satisfies Partial<Record<EmailTemplateId, (...args: never[]) => RenderedEmail>>;
