"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { dashboardKeys } from "@/helper/query";
import { memberKeys } from "./useMember";

const allocateQuotaSchema = z.object({
  test: z.enum(["IELTS", "TOEFL"]),
  user_id: z.number().int(),
  test_type_id: z.number().int(),
  amount: z.number().int().positive(),
  admin_id: z.number().int().optional(),
});

const revokeQuotaSchema = z.object({
  test: z.enum(["IELTS", "TOEFL"]),
  user_id: z.number().int(),
  test_type_id: z.number().int(),
  amount: z.number().int().positive(),
  admin_id: z.number().int().optional(),
});

export type AllocateQuotaInput = z.infer<typeof allocateQuotaSchema>;
export type RevokeQuotaInput = z.infer<typeof revokeQuotaSchema>;

export function useAllocateQuota(orgId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocateQuotaInput) => {
      const body = allocateQuotaSchema.parse(payload);
      const res = await api.post(`/v1/b2b/orgs/${orgId}/quotas/allocate`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.quotaSummary(orgId) });
      qc.invalidateQueries({ queryKey: memberKeys.list(orgId), exact: false });
    },
  });
}

export function useRevokeQuota(orgId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RevokeQuotaInput) => {
      const body = revokeQuotaSchema.parse(payload);
      const res = await api.post(`/v1/b2b/orgs/${orgId}/quotas/revoke`, body);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.quotaSummary(orgId) });
      qc.invalidateQueries({ queryKey: memberKeys.list(orgId), exact: false });
    },
  });
}
