"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

/* ============ ZOD SCHEMAS ============ */

// 1. Definisikan Schema untuk Value Quota (Count + Expiry)
const quotaValueSchema = z.object({
  count: z.number().default(0),
  expiry: z.string().nullable().optional(),
});

// 2. Update Default Value agar sesuai struktur baru
const defaultQuotaValue = { count: 0, expiry: null };

const defaultQuotas = {
  IELTS: {
    Reading: defaultQuotaValue,
    Listening: defaultQuotaValue,
    Writing: defaultQuotaValue,
    Speaking: defaultQuotaValue,
    Complete: defaultQuotaValue,
  },
  TOEFL: {
    Reading: defaultQuotaValue,
    Listening: defaultQuotaValue,
    "Structure & Written Expression": defaultQuotaValue,
    Complete: defaultQuotaValue,
  },
};

// 3. Update Quota Schema utama
const quotaSchema = z.object({
  IELTS: z.object({
    Reading: quotaValueSchema,
    Listening: quotaValueSchema,
    Writing: quotaValueSchema,
    Speaking: quotaValueSchema,
    Complete: quotaValueSchema,
  }),
  TOEFL: z.object({
    Reading: quotaValueSchema,
    Listening: quotaValueSchema,
    "Structure & Written Expression": quotaValueSchema,
    Complete: quotaValueSchema,
  }),
});

const memberRowSchema = z.object({
  id: z.number(),
  b2b_org_id: z.number(),
  user_id: z.number(),
  role: z.string(),
  status: z.boolean(),
  created_at: z.string(),
  users: z.object({
    id: z.number(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable().optional(), // Tambahkan nullable/optional jaga-jaga user terhapus
  
  // ⬇⬇⬇ Gunakan schema baru & default value baru
  quotas: quotaSchema.optional().default(defaultQuotas), 
});

const memberListSchema = z.object({
  data: z.array(memberRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// Export Type otomatis mengikuti perubahan Zod
export type MemberRow = z.infer<typeof memberRowSchema>; 
export type MemberListResponse = z.infer<typeof memberListSchema>;

// Tambahan helper type jika diperlukan di komponen
export type QuotaValue = z.infer<typeof quotaValueSchema>;

export const memberKeys = {
  list: (orgId: number) => ["b2b", "members", orgId] as const,
  listWithParams: (
    orgId: number,
    params: { page: number; pageSize: number; q?: string }
  ) => ["b2b", "members", orgId, params] as const,
};

/* ============ LIST MEMBERS ============ */

type UseMembersParams = {
  page: number;
  pageSize: number;
  q?: string;
  role?: string;
  status?: boolean;
};

export function useMembers(orgId: number, params: UseMembersParams) {
  return useQuery({
    queryKey: memberKeys.listWithParams(orgId, params),
    enabled: !!orgId,
    queryFn: async () => {
      const res = await api.get(`/v1/b2b/orgs/${orgId}/members`, {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          q: params.q,
          role: params.role,
          status: params.status,
        },
      });
      // Parse response dengan schema baru
      return memberListSchema.parse(res.data);
    },
  });
}

/* ============ ADD MEMBER ============ */

// Schema input tetap sama (biasanya input hanya kirim jumlah quota, expiry diurus backend/default)
const quotaItemSchema = z.object({
  test_name: z.enum(["IELTS", "TOEFL"]),
  test_type_id: z.number().int().positive(),
  quota: z.number().int().positive(),
});

export const addMemberInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().optional().nullable(),

  nationality: z.string().optional().nullable(),
  country_origin: z.string().optional().nullable(),
  first_language: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),

  quotas: z.array(quotaItemSchema).min(1, "Minimal 1 quota skill"),
});

export type AddMemberInput = z.infer<typeof addMemberInputSchema>;

export function useAddMember(orgId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddMemberInput) => {
      const body = addMemberInputSchema.parse(payload);
      const res = await api.post(`/v1/b2b/orgs/${orgId}/members`, body);
      // Validasi respon create member (pastikan backend return format yang cocok atau gunakan any sementara jika beda)
      return memberRowSchema.parse(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(orgId), exact: false });
    },
  });
}

/* ============ UPDATE STATUS ============ */

type UpdateStatusInput = {
  memberId: number;
  status: boolean;
};

export function useUpdateMemberStatus(orgId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateStatusInput) => {
      const res = await api.patch(
        `/v1/b2b/orgs/${orgId}/members/${payload.memberId}/status`,
        { status: payload.status }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(orgId), exact: false });
    },
  });
}