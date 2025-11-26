"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type ExamType = "ielts" | "toefl";

export interface IeltsTestDetail {
  testId: number;
  type: string;
  date: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
}

export interface IeltsResultRow {
  id: number; // user_id
  studentName: string;
  email: string;
  overallBand: number | null;
  listeningBand: number | null;
  readingBand: number | null;
  writingBand: number | null;
  speakingBand: number | null;
  testDetails: IeltsTestDetail[];
}

export interface ToeflTestDetail {
  testId: number;
  type: string;
  date: string;
  listening: number | null;
  structure: number | null;
  reading: number | null;
  overall: number | null;
}

export interface ToeflResultRow {
  id: number; // user_id
  studentName: string;
  email: string;
  overallScore: number | null;
  listeningScore: number | null;
  structureScore: number | null;
  readingScore: number | null;
  testDetails: ToeflTestDetail[];
}

type ResultRow = IeltsResultRow | ToeflResultRow;

interface UseOrgResultsOptions {
  exam: ExamType;
  page: number;
  pageSize: number;
  q?: string;
  orgId: number
}

export function useOrgResults({
  exam,
  page,
  pageSize,
  q,
  orgId
}: UseOrgResultsOptions) {
  const [data, setData] = useState<ResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/v1/b2b/results/${exam}/${orgId}`, {
        params: {
          page,
          pageSize,
          q: q || undefined,
        },
      })
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[b2b] fetch results error", err);
        setError(err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exam, page, pageSize, q]);

  return { data, total, loading, error };
}

interface UseStudentHistoryOptions {
  exam: ExamType;
  userId?: number | null;
  enabled?: boolean;
}

export interface HistoryGroupAttempt {
  testId: number;
  date: string;
  type: string;
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
  structure?: number | null;
  overall: number | null;
}

export interface HistoryData {
  exam: "ielts" | "toefl";
  student: { id: number; name: string; email: string };
  groups: Record<string, HistoryGroupAttempt[]>;
}

export function useStudentHistory({
  exam,
  userId,
  enabled,
}: UseStudentHistoryOptions) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get(`/v1/b2b/results/${exam}/history/${userId}`)
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[b2b] fetch history error", err);
        setError(err);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exam, userId, enabled]);

  return { data, loading, error };
}
