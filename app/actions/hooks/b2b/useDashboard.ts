"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dashboardSummarySchema } from "@/lib/zod-b2b";
import { z } from "zod";

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type TestMode = "all" | "complete-only" | "section-only";

type UseDashboardParams = {
  orgId?: string | number | null;
  testMode?: TestMode;
  startDate?: string;
  endDate?: string;
};

export const useDashboard = ({
  orgId,
  testMode = "all",
  startDate,
  endDate,
}: UseDashboardParams) => {
  const hasOrgId =
    orgId !== null && orgId !== undefined && String(orgId).trim() !== "";

  return useQuery({
    queryKey: [
      "b2b-dashboard",
      hasOrgId ? String(orgId) : "",
      testMode,
      startDate ?? "",
      endDate ?? "",
    ],
    enabled: hasOrgId,
    queryFn: async () => {
      if (!hasOrgId) {
        throw new Error("Organization ID is required for dashboard query.");
      }

      const res = await api.get(`/v1/b2b/dashboard/${orgId}`, {
        params: {
          testMode,
          startDate,
          endDate,
        },
      });

      // ✅ Support both:
      // 1) { status, message, data: {...} }
      // 2) { activeStudents, testsConducted, ... } directly
      const raw = res.data;
      const payload =
        raw && typeof raw === "object" && "data" in raw
          ? 
            (raw as any).data
          : raw;

      // Fallback to {} so Zod defaults can kick in
      return dashboardSummarySchema.parse(payload ?? {});
    },
  });
};
