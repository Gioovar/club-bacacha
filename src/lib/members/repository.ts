import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Attribution, RegistrationData } from "./schema";
import type { MemberStatus, MemberTier, PublicMember, RegisterResult } from "./types";

export interface MemberRepository {
  register(data: RegistrationData, meta: RegistrationMeta): Promise<RegisterResult>;
  findByQrToken(token: string): Promise<PublicMember | null>;
  findByEmail(email: string): Promise<PublicMember | null>;
  listAll(options?: { limit?: number; search?: string; city?: string; status?: string }): Promise<PublicMember[]>;
}

export type RegistrationMeta = {
  userAgent?: string | null;
  registeredAt: Date;
};

type StoredMember = {
  id: string; // UUID (internal)
  memberNumber: number; // public
  qrToken: string;
  status: MemberStatus;
  tier: MemberTier;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  city: string;
  instagram?: string;
  acceptMarketing: boolean;
  referredByNumber?: number;
  attribution?: Attribution;
  userAgent?: string | null;
  createdAt: string;
};

const toPublic = (m: StoredMember): PublicMember => ({
  memberNumber: m.memberNumber,
  firstName: m.firstName,
  lastName: m.lastName,
  city: m.city,
  since: new Date(m.createdAt).getFullYear(),
  tier: m.tier,
  qrToken: m.qrToken,
});

/* --------------------------------------------------------------------------
   Real Supabase Repository
   -------------------------------------------------------------------------- */
class SupabaseMemberRepository implements MemberRepository {
  constructor(private readonly supabase: ReturnType<typeof createAdminClient>) {}

  async register(data: RegistrationData, meta: RegistrationMeta): Promise<RegisterResult> {
    if (!this.supabase) {
      throw new Error("Supabase client is not configured.");
    }

    // 1. Check if member already exists by email or phone
    const { data: existing, error: checkError } = await this.supabase
      .from("members")
      .select("id, member_number, first_name, last_name, city, created_at, membership_level, qr_token, status")
      .or(`email.eq.${data.email},phone.eq.${data.phone}`)
      .maybeSingle();

    if (checkError) {
      console.error("Supabase check existing member error:", checkError);
    }

    if (existing) {
      return {
        created: false,
        member: {
          memberNumber: parseInt(existing.member_number, 10),
          firstName: existing.first_name,
          lastName: existing.last_name,
          city: existing.city,
          since: new Date(existing.created_at).getFullYear(),
          tier: existing.membership_level as MemberTier,
          qrToken: existing.qr_token,
        },
      };
    }

    // 2. Resolve referrer by member_number if ref param was passed
    let referrerId: string | null = null;
    let referrerNumber: string | null = null;
    if (data.attribution?.ref) {
      const { data: refMember } = await this.supabase
        .from("members")
        .select("id, member_number")
        .eq("member_number", data.attribution.ref.padStart(6, "0"))
        .maybeSingle();

      if (refMember) {
        referrerId = refMember.id;
        referrerNumber = refMember.member_number;
      }
    }

    // 3. Insert new member into Supabase
    const { data: inserted, error: insertError } = await this.supabase
      .from("members")
      .insert({
        relationship_status: data.relationshipStatus || "PREFIERO_NO_DECIR",
        first_name: data.firstName,
        last_name: data.lastName,
        birth_date: data.birthDate,
        phone: data.phone,
        email: data.email,
        city: data.city,
        instagram: data.instagram || null,
        privacy_consent: data.acceptPrivacy,
        marketing_consent: data.acceptMarketing,
        utm_source: data.attribution?.utm_source || null,
        utm_medium: data.attribution?.utm_medium || null,
        utm_campaign: data.attribution?.utm_campaign || data.attribution?.qr_code || null,
        utm_content: data.attribution?.utm_content || null,
        utm_term: data.attribution?.utm_term || null,
        referrer_url: data.attribution?.landing_url || null,
        referred_by: referrerId,
        referred_by_number: referrerNumber,
        source: data.attribution?.utm_source || (referrerId ? "referral" : "direct"),
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("Failed to insert member into Supabase:", insertError);
      throw new Error(insertError?.message || "Error al crear el miembro en base de datos.");
    }

    // 4. Save audit consents
    await this.supabase.from("member_consents").insert([
      {
        member_id: inserted.id,
        consent_type: "PRIVACY_POLICY",
        accepted: true,
        user_agent: meta.userAgent,
      },
      {
        member_id: inserted.id,
        consent_type: "MARKETING_WHATSAPP_EMAIL",
        accepted: data.acceptMarketing,
        user_agent: meta.userAgent,
      },
    ]);

    // 5. If referred, record the relationship
    if (referrerId) {
      await this.supabase.from("member_referrals").insert({
        referrer_member_id: referrerId,
        referred_member_id: inserted.id,
        campaign: data.attribution?.utm_campaign || null,
        status: "REGISTERED",
      });
    }

    // 6. Record registration activity and initialize engagement score (5 points)
    await this.supabase.from("member_activity").insert({
      member_id: inserted.id,
      activity_type: "REGISTERED",
      metadata: {
        device: data.attribution?.device_type,
        landing_url: data.attribution?.landing_url,
      },
    });

    await this.supabase.from("member_engagement_scores").upsert({
      member_id: inserted.id,
      total_score: 5,
      score_30d: 5,
      score_60d: 5,
      score_90d: 5,
      category: "NUEVO_MIEMBRO",
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id" });

    const publicMember: PublicMember = {
      memberNumber: parseInt(inserted.member_number, 10),
      firstName: inserted.first_name,
      lastName: inserted.last_name,
      city: inserted.city,
      since: new Date(inserted.created_at).getFullYear(),
      tier: inserted.membership_level as MemberTier,
      qrToken: inserted.qr_token,
    };

    return { member: publicMember, created: true };
  }

  async findByQrToken(token: string): Promise<PublicMember | null> {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from("members")
      .select("member_number, first_name, last_name, city, created_at, membership_level, qr_token, status")
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !data) return null;

    return {
      memberNumber: parseInt(data.member_number, 10),
      firstName: data.first_name,
      lastName: data.last_name,
      city: data.city,
      since: new Date(data.created_at).getFullYear(),
      tier: data.membership_level as MemberTier,
      qrToken: data.qr_token,
    };
  }

  async findByEmail(email: string): Promise<PublicMember | null> {
    if (!this.supabase) return null;
    const { data, error } = await this.supabase
      .from("members")
      .select("member_number, first_name, last_name, city, created_at, membership_level, qr_token, status")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (error || !data) return null;

    return {
      memberNumber: parseInt(data.member_number, 10),
      firstName: data.first_name,
      lastName: data.last_name,
      city: data.city,
      since: new Date(data.created_at).getFullYear(),
      tier: data.membership_level as MemberTier,
      qrToken: data.qr_token,
    };
  }

  async listAll(): Promise<PublicMember[]> {
    if (!this.supabase) return [];
    const { data, error } = await this.supabase
      .from("members")
      .select("member_number, first_name, last_name, city, created_at, membership_level, qr_token, status")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((m) => ({
      memberNumber: parseInt(m.member_number, 10),
      firstName: m.first_name,
      lastName: m.last_name,
      city: m.city,
      since: new Date(m.created_at).getFullYear(),
      tier: m.membership_level as MemberTier,
      qrToken: m.qr_token,
    }));
  }
}

/* --------------------------------------------------------------------------
   Local Fallback Repository (when Supabase credentials are pending in .env)
   -------------------------------------------------------------------------- */
class InMemoryMemberRepository implements MemberRepository {
  private seq = 1000;
  private byId = new Map<string, StoredMember>();

  async register(data: RegistrationData, meta: RegistrationMeta): Promise<RegisterResult> {
    const existing = [...this.byId.values()].find(
      (m) => m.email === data.email || m.phone === data.phone,
    );
    if (existing) return { member: toPublic(existing), created: false };

    const referredBy = data.attribution?.ref ? Number(data.attribution.ref) : undefined;

    const member: StoredMember = {
      id: randomUUID(),
      memberNumber: ++this.seq,
      qrToken: randomBytes(16).toString("base64url"),
      status: "ACTIVE",
      tier: "MEMBER",
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate,
      city: data.city,
      instagram: data.instagram || undefined,
      acceptMarketing: data.acceptMarketing,
      referredByNumber: Number.isFinite(referredBy) ? referredBy : undefined,
      attribution: data.attribution,
      userAgent: meta.userAgent,
      createdAt: meta.registeredAt.toISOString(),
    };
    this.byId.set(member.id, member);
    return { member: toPublic(member), created: true };
  }

  async findByQrToken(token: string): Promise<PublicMember | null> {
    const m = [...this.byId.values()].find((item) => item.qrToken === token);
    return m ? toPublic(m) : null;
  }

  async findByEmail(email: string): Promise<PublicMember | null> {
    const m = [...this.byId.values()].find((item) => item.email === email.toLowerCase().trim());
    return m ? toPublic(m) : null;
  }

  async listAll(): Promise<PublicMember[]> {
    return [...this.byId.values()].map(toPublic);
  }
}

const globalForRepo = globalThis as unknown as { __bacachaMembers?: MemberRepository };

export function getMemberRepository(): MemberRepository {
  const adminClient = createAdminClient();
  if (adminClient) {
    return new SupabaseMemberRepository(adminClient);
  }

  globalForRepo.__bacachaMembers ??= new InMemoryMemberRepository();
  return globalForRepo.__bacachaMembers;
}
