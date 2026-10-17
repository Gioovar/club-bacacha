/**
 * Member domain types. Internal identity is a UUID; the public identity is the
 * sequential `memberNumber` (000001, 000002…). Never expose the UUID in UI.
 */

export const MEMBER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED", "VIP"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** Architecture-ready tiers. Only MEMBER is used in Phase 1/2. */
export const MEMBER_TIERS = ["MEMBER", "VIP", "FOUNDING_MEMBER", "BLACK_MEMBER"] as const;
export type MemberTier = (typeof MEMBER_TIERS)[number];

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MARKETING", "VIEWER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Safe-to-render member shape (what the browser receives). */
export type PublicMember = {
  memberNumber: number;
  firstName: string;
  lastName: string;
  city: string;
  since: number;
  tier: MemberTier;
  /** Opaque token used in the member QR → /m/{qrToken}. Not the UUID. */
  qrToken: string;
};

export type RegisterResult = {
  member: PublicMember;
  /** false when the email/phone already belonged to a member */
  created: boolean;
};
