"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  orgSchema,
  orgFormSchema,
  type OrgFormValues,
  orgPackagesSchema,
  quotaSummarySchema,
  paymentHistorySchema,
} from "@/lib/zod-b2b";
import {
  buildExamPackages,
  dashboardKeys,
  mapPaymentHistoryToTransactions,
} from "@/helper/query";

export const useOrg = (orgId: string | number) => {
  return useQuery({
    queryKey: ["b2b-org", String(orgId)],
    queryFn: async () => {
      const res = await api.get(`/v1/b2b/orgs/${orgId}`);
      // validasi response backend
      return orgSchema.parse(res.data);
    },
    enabled: !!orgId,
  });
};

export const useUpdateOrg = (orgId: string | number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: OrgFormValues) => {
      // validasi data form sebelum kirim
      const payload = orgFormSchema.parse(values);

      const res = await api.patch(`/v1/b2b/orgs/${orgId}`, {
        name: payload.name,
        logo: payload.logo || null,
      });

      return orgSchema.parse(res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-org", String(orgId)] });
    },
  });
};

export function useOrgQuotaSummary(orgId: number, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.quotaSummary(orgId),
    enabled: !!orgId && enabled,
    queryFn: async () => {
      const res = await api.get(`/v1/b2b/orgs/${orgId}/quotas/summary`);
      return quotaSummarySchema.parse(res.data);
    },
  });
}

export function useOrgPackages(orgId: number, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.packages(orgId),
    enabled: !!orgId && enabled,
    queryFn: async () => {
      const res = await api.get(`/v1/b2b/orgs/${orgId}/packages`);
      const parsed = orgPackagesSchema.parse(res.data);
      const examPackages = buildExamPackages(parsed);
      return { raw: parsed, examPackages };
    },
  });
}

type PaymentHistoryParams = {
  orgId: number;
  page: number;
  pageSize: number;
  status?: string;
  method?: string;
  channel?: string;
  currency?: string;
};

export function useOrgPaymentHistory(
  params: PaymentHistoryParams,
  enabled = true
) {
  return useQuery({
    queryKey: dashboardKeys.payments(params),
    enabled: !!params.orgId && enabled,
    queryFn: async () => {
      const res = await api.get(`/v1/b2b/payments/history`, {
        params: {
          orgId: params.orgId,
          page: params.page,
          pageSize: params.pageSize,
          status: params.status,
          method: params.method,
          channel: params.channel,
          currency: params.currency,
        },
      });

      const parsed = paymentHistorySchema.parse(res.data);
      const transactions = mapPaymentHistoryToTransactions(parsed);

      return { raw: parsed, transactions };
    },
  });
}
