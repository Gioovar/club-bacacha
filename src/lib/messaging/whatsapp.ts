import { formatMemberNumber } from "@/lib/site";
import type { PublicMember } from "@/lib/members/types";

/**
 * WhatsApp service abstraction (Fase 3: Meta WhatsApp Cloud API).
 *
 * No fake integration: if credentials are missing the provider is `disabled`
 * and every send resolves with `{ ok: false, reason: "not_configured" }`.
 * Production messages outside the 24 h window MUST use approved templates.
 */

export type WhatsAppTemplate = "welcome" | "promotion" | "birthday" | "event" | "benefit";

export type SendResult = { ok: true; id?: string } | { ok: false; reason: string };

export interface WhatsAppProvider {
  readonly enabled: boolean;
  sendTemplate(params: {
    to: string; // E.164 digits, e.g. 5217441234567
    template: WhatsAppTemplate;
    language?: string;
    variables: string[];
  }): Promise<SendResult>;
}

/** Template names as registered in Meta Business Manager. */
const META_TEMPLATE_NAMES: Record<WhatsAppTemplate, string> = {
  welcome: "bacacha_bienvenida",
  promotion: "bacacha_promocion",
  birthday: "bacacha_cumpleanos",
  event: "bacacha_evento",
  benefit: "bacacha_beneficio",
};

class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  readonly enabled = true;
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
    private readonly apiVersion = "v21.0",
  ) {}

  async sendTemplate({ to, template, language = "es_MX", variables }: Parameters<WhatsAppProvider["sendTemplate"]>[0]): Promise<SendResult> {
    const res = await fetch(`https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: META_TEMPLATE_NAMES[template],
          language: { code: language },
          components: [{ type: "body", parameters: variables.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    if (!res.ok) return { ok: false, reason: `meta_${res.status}` };
    const json = (await res.json()) as { messages?: { id: string }[] };
    return { ok: true, id: json.messages?.[0]?.id };
  }
}

class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly enabled = false;
  async sendTemplate(): Promise<SendResult> {
    return { ok: false, reason: "not_configured" };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  return id && token ? new MetaCloudWhatsAppProvider(id, token) : new DisabledWhatsAppProvider();
}

/** Mexican numbers: 10 digits → 52 + number. */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `52${digits}` : digits;
}

/** Copy used for the approved "welcome" template ({{1}} = member number). */
export function welcomeCopy(member: Pick<PublicMember, "memberNumber">): string {
  return [
    "Bienvenido al Club Bacachá.",
    `Tu número de miembro es #${formatMemberNumber(member.memberNumber)}.`,
    "Guarda este contacto.",
    "Por aquí te contaremos cosas que no publicamos.",
  ].join("\n");
}
