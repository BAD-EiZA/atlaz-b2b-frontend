import { z } from "zod";

/* ---------- ORGANIZATION ---------- */

export const orgSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  logo: z.string().nullable(),
  // tambahkan field lain kalau backend nanti ada tambahan
});

export const orgFormSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(255, "Organization name is too long"),
  logo: z
    .string()
    .url("Logo must be a valid URL")
    .or(z.literal("")) // allow empty string (no logo)
    .optional(),
  // dipakai untuk integrasi dengan Uploader (opsional)
  logoUploaded: z.boolean().optional(),
});

export type OrgFormValues = z.infer<typeof orgFormSchema>;

/* ---------- DASHBOARD SUMMARY ---------- */

export const dashboardSummarySchema = z.object({
  activeStudents: z.number().int().nonnegative(),
  testsConducted: z.number().int().nonnegative(),
  quotas: z.object({
    used: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

const quotaPerTypeItemSchema = z.object({
  test_type_id: z.number(),
  label: z.string(),
  topup: z.number(),
  used: z.number(),
  remaining: z.number(),
});

const quotaPerTypeMapSchema = z.record(
  z.string(),
  z.object({
    topup: z.number(),
    used: z.number(),
    remaining: z.number(),
  }),
);

const quotaExamSummarySchema = z.object({
  totalTopup: z.number(),
  totalUsed: z.number(),
  totalRemaining: z.number(),
  perType: quotaPerTypeMapSchema,
  perTypeArray: z.array(quotaPerTypeItemSchema),
});

export const quotaSummarySchema = z.object({
  orgId: z.number(),
  ielts: quotaExamSummarySchema,
  toefl: quotaExamSummarySchema,
  updatedAt: z.string(),
});

export type QuotaSummary = z.infer<typeof quotaSummarySchema>;



/* ============================
 *  PACKAGES (b2b_org_package)
 * ============================ */

const packageSchema = z.object({
  id: z.number(),
  title: z.string(),
  attempt_quota: z.number(),
  price: z.string(),
  priceInt: z.number(),
});

const testTypeGroupSchema = z.object({
  test_type_id: z.number(),
  label: z.string(),
  packages: z.array(packageSchema),
});

const categorySchema = z.object({
  test_category: z.string(), // "IELTS" / "TOEFL"
  test_types: z.record(z.string(), testTypeGroupSchema),
});

export const orgPackagesSchema = z.object({
  ielts: categorySchema,
  toefl: categorySchema,
});

export type OrgPackagesResponse = z.infer<typeof orgPackagesSchema>;

/* ============================
 *  PAYMENT HISTORY
 * ============================ */

const paymentHistoryItemSchema = z.object({
  id: z.number(),
  userId: z.number(),
  orgId: z.number(),
  externalId: z.string(),
  status: z.string(),
  method: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()]),
  currency: z.string(),
  paidAt: z.string().nullable().optional(),
  payerEmail: z.string().nullable().optional(),
  created_at: z.string(),
   rawPayload: z.object({
    pkg: z.object({
      title: z.string(),
    }).optional(), // Dibuat optional untuk keamanan jika response tidak memiliki pkg
  }).passthrough().optional().nullable(), 
});

export const paymentHistorySchema = z.object({
  data: z.array(paymentHistoryItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type PaymentHistoryResponse = z.infer<typeof paymentHistorySchema>;

/* ============================
 *  UI TYPES
 * ============================ */

export type UiPackage = {
  id: number;
  name: string;          // "10 Tests"
  price: number;         // 150000
  quotaAmount: number;   // 10
  features: string[];    // bullet points
  popular?: boolean;
};

export type UiExamPackages = {
  ielts: {
    name: "IELTS";
    testTypes: string[]; // ["Complete", "Reading", ...]
    packagesByType: Record<string, UiPackage[]>;
  };
  toefl: {
    name: "TOEFL";
    testTypes: string[];
    packagesByType: Record<string, UiPackage[]>;
  };
};

export type UiTransaction = {
  id: number;
  date: string;     // "Dec 15, 2024"
  package: string;  // "25 Tests (Complete)" - dari rawPayload
  tests: number | null;
  amount: number;
  currency: string;
  status: string;
};
