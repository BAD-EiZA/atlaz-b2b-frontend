import {
  OrgPackagesResponse,
  PaymentHistoryResponse,
  QuotaSummary,
  UiExamPackages,
  UiPackage,
  UiTransaction,
} from "@/lib/zod-b2b";

export const dashboardKeys = {
  quotaSummary: (orgId: number) =>
    ["b2b", "dashboard", "quotaSummary", orgId] as const,
  packages: (orgId: number) => ["b2b", "dashboard", "packages", orgId] as const,
  payments: (params: {
    orgId: number;
    page: number;
    pageSize: number;
    status?: string;
  }) => ["b2b", "dashboard", "payments", params] as const,
};

/* ============================
 *  HELPERS: order & mapping
 * ============================ */

const IELTS_ORDER = ["Complete", "Reading", "Listening", "Writing", "Speaking"];
const TOEFL_ORDER = ["Complete", "Reading", "Listening", "Structure"];

const IELTS_TYPE_ID_BY_NAME: Record<string, number> = {
  Listening: 1,
  Reading: 2,
  Writing: 3,
  Speaking: 4,
  Complete: 5,
};

const TOEFL_TYPE_ID_BY_NAME: Record<string, number> = {
  Listening: 1,
  Structure: 2,
  Reading: 3,
  Complete: 4,
};

function markPopular(packages: UiPackage[]): UiPackage[] {
  if (!packages.length) return packages;
  if (packages.length === 1) {
    return [{ ...packages[0], popular: true }];
  }

  const sorted = [...packages].sort((a, b) => b.quotaAmount - a.quotaAmount);
  const popularId = sorted[0].id;

  return packages.map((p) => ({
    ...p,
    popular: p.id === popularId,
  }));
}

/* ============================
 *  BUILD examPackages dari DB
 * ============================ */

export function buildExamPackages(data: OrgPackagesResponse): UiExamPackages {
  const result: UiExamPackages = {
    ielts: { name: "IELTS", testTypes: [], packagesByType: {} },
    toefl: { name: "TOEFL", testTypes: [], packagesByType: {} },
  };

  // IELTS
  const iTypes = data.ielts.test_types;
  const iLabelSet = new Set<string>();

  Object.values(iTypes).forEach((group) => {
    const label = group.label; // "Complete", "Listening", ...
    iLabelSet.add(label);

    const uiPackages: UiPackage[] = group.packages.map((pkg) => ({
      id: pkg.id,
      name: `${label} Tests`,
      price: Number(pkg.priceInt ?? pkg.price ?? 0),
      quotaAmount: pkg.attempt_quota,
      features: [
        "Instant access",
        "Automatic scoring",
        "Report available instantly",
        "Score prediction + analysis",
      ],
    }));

    result.ielts.packagesByType[label] = markPopular(uiPackages);
  });

  result.ielts.testTypes = IELTS_ORDER.filter((t) => iLabelSet.has(t));

  // TOEFL
  const tTypes = data.toefl.test_types;
  const tLabelSet = new Set<string>();

  Object.values(tTypes).forEach((group) => {
    const label = group.label;
    tLabelSet.add(label);

    const uiPackages: UiPackage[] = group.packages.map((pkg) => ({
      id: pkg.id,
      name: `${label} Tests`,
      price: Number(pkg.priceInt ?? pkg.price ?? 0),
      quotaAmount: pkg.attempt_quota,
      features: [
        "Instant access",
        "Automatic scoring",
        "Report available instantly",
        "Score prediction + analysis",
      ],
    }));

    result.toefl.packagesByType[label] = markPopular(uiPackages);
  });

  result.toefl.testTypes = TOEFL_ORDER.filter((t) => tLabelSet.has(t));

  return result;
}

/* ============================
 *  QUOTA HELPER
 * ============================ */

export function getRemainingQuota(
  summary: QuotaSummary | undefined,
  exam: "ielts" | "toefl",
  testTypeName: string
): number {
  if (!summary) return 0;

  const examSummary = summary[exam];
  const map = exam === "ielts" ? IELTS_TYPE_ID_BY_NAME : TOEFL_TYPE_ID_BY_NAME;

  const typeId = map[testTypeName] ?? undefined;
  if (!typeId) {
    return examSummary.totalRemaining;
  }

  const key = String(typeId);
  const item = examSummary.perType[key];
  if (!item) return 0;

  return item.remaining;
}

export function getExamQuotaPercent(
  summary: QuotaSummary | undefined,
  exam: "ielts" | "toefl"
) {
  if (!summary) return 0;
  const s = summary[exam];
  if (!s.totalTopup) return 0;
  return Math.max(0, Math.min(100, (s.totalRemaining / s.totalTopup) * 100));
}

/* ============================
 *  PAYMENT HISTORY → UI
 * ============================ */

export function mapPaymentHistoryToTransactions(
  res: PaymentHistoryResponse
): UiTransaction[] {
  return res.data.map((row) => {
    const created = new Date(row.created_at);
    const dateStr = created.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });

    let packageTitle = "Package";
    let tests: number | null = null;

    if (row.rawPayload && typeof row.rawPayload === "object") {
      const payload: any = row.rawPayload;
      if (payload.packageTitle) packageTitle = String(payload.packageTitle);
      if (payload.tests != null) tests = Number(payload.tests);
    }

    return {
      id: row.id,
      date: dateStr,
      package: row.rawPayload?.pkg?.title! ?? row.rawPayload?.purpose!,
      tests,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
    };
  });
}
