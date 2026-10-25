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
  /** Available redeemable loyalty points */
  pointsBalance?: number;
};

export type RegisterResult = {
  member: PublicMember;
  /** false when the email/phone already belonged to a member */
  created: boolean;
};

export type LoyaltyRewardCategory = "MERCHANDISE" | "BOTTLE" | "EXPERIENCE" | "COURTESY";

export type LoyaltyReward = {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  category: LoyaltyRewardCategory;
  imageUrl?: string | null;
  stock?: number;
  active: boolean;
  terms?: string | null;
  createdAt?: string;
};

export type LoyaltyTransactionType =
  | "WELCOME_BONUS"
  | "EVENT_ATTENDANCE"
  | "REFERRAL"
  | "BENEFIT_REDEEM"
  | "MANUAL_ADJUSTMENT"
  | "PURCHASE_REWARD";

export type LoyaltyTransaction = {
  id: string;
  memberId: string;
  amount: number;
  balanceAfter: number;
  type: LoyaltyTransactionType;
  description: string;
  createdAt: string;
  createdBy?: string;
};

export type LoyaltyRedemptionStatus = "PENDING" | "FULFILLED" | "CANCELLED";

export type LoyaltyRedemption = {
  id: string;
  memberId: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  status: LoyaltyRedemptionStatus;
  redemptionCode: string;
  notes?: string | null;
  fulfilledAt?: string | null;
  fulfilledBy?: string | null;
  createdAt: string;
};

