"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

/* ============ ZOD SCHEMAS ============ */

const quotaSchema = z.object({
  IELTS: z.object({
    Reading: z.number(),
    Listening: z.number(),
    Writing: z.number(),
    Speaking: z.number(),
    Complete: z.number(),
  }),
  TOEFL: z.object({
    Reading: z.number(),
    Listening: z.number(),
    "Structure & Written Expression": z.number(),
    Complete: z.number(),
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
  }),
  quotas: quotaSchema,
});

const memberListSchema = z.object({
  data: z.array(memberRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type MemberRow = z.infer<typeof memberRowSchema>;
export type MemberListResponse = z.infer<typeof memberListSchema>;

export const memberKeys = {
  list: (orgId: number) => ["b2b", "members", orgId] as const,
  listWithParams: (orgId: number, params: { page: number; pageSize: number; q?: string }) =>
    ["b2b", "members", orgId, params] as const,
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
      return memberListSchema.parse(res.data);
    },
  });
}

/* ============ ADD MEMBER ============ */

const addMemberInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().optional().nullable(),
  test_name: z.enum(["IELTS", "TOEFL"]),
  test_type_id: z.number().int().positive(),
  quota: z.number().int().positive(),
});

export type AddMemberInput = z.infer<typeof addMemberInputSchema>;

export function useAddMember(orgId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddMemberInput) => {
      const body = addMemberInputSchema.parse(payload);
      const res = await api.post(`/v1/b2b/orgs/${orgId}/members`, body);
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
        { status: payload.status },
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(orgId), exact: false });
    },
  });
}
