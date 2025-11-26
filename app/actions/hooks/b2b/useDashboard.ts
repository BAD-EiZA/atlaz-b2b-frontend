"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { dashboardSummarySchema } from "@/lib/zod-b2b";

export const useDashboard = (orgId: string | number) => {
  return useQuery({
    queryKey: ["b2b-dashboard", String(orgId)],
    queryFn: async () => {
      const res = await api.get(`/v1/b2b/dashboard/${orgId}`);
      return dashboardSummarySchema.parse(res.data);
    },
    enabled: !!orgId,
  });
};
