import type { PublicMember } from "@/lib/members/types";
import { emailTemplates, getEmailProvider } from "./email";
import { getWhatsAppProvider, toWhatsAppNumber } from "./whatsapp";
import { formatMemberNumber } from "@/lib/site";

/**
 * Fire-and-forget welcome notifications. Only sent when the member gave
 * marketing consent AND the provider is configured.
 */
export async function notifyWelcome(
  member: PublicMember,
  contact: { email: string; phone: string; acceptMarketing: boolean },
) {
  if (!contact.acceptMarketing) return;

  const wa = getWhatsAppProvider();
  const mail = getEmailProvider();

  await Promise.allSettled([
    wa.enabled
      ? wa.sendTemplate({
          to: toWhatsAppNumber(contact.phone),
          template: "welcome",
          variables: [formatMemberNumber(member.memberNumber)],
        })
      : Promise.resolve(),
    mail.enabled ? mail.send({ to: contact.email, email: emailTemplates.welcome(member) }) : Promise.resolve(),
  ]);
}
