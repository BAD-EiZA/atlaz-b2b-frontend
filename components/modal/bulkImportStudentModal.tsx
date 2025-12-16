"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { AlertTriangle, Loader2, Upload, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExamAvailableQuota,
  IELTS_KEYS,
  IELTSQuotaKey,
  TOEFL_KEYS,
  TOEFLQuotaKey,
} from "@/lib/types";

type RawRow = Record<string, any>;

type QuotaInput = {
  test_name: "IELTS" | "TOEFL";
  test_type_id: number;
  quota: number;
};

type CreateMemberPayload = {
  name: string;
  username: string;
  email: string;
  phone?: string;

  nationality?: string;
  country_origin?: string;
  first_language?: string;

  quotas: QuotaInput[];
  currency?: string;
};

type ImportRow = CreateMemberPayload & {
  _excelRow: number;
  _quotaOk: boolean;
  _quotaIssues: string[];
};

type Props = {
  orgId: number;
  availableQuotas: ExamAvailableQuota;
  isQuotaLoading?: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

/** ✅ Discriminated union: skill-nya terkunci sesuai exam */
type Bucket =
  | { exam: "IELTS"; skill: IELTSQuotaKey }
  | { exam: "TOEFL"; skill: TOEFLQuotaKey };

function normalizeKey(key: string) {
  return String(key)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseQuotaCell(v: any, fieldName: string) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${fieldName} harus angka`);
  if (n < 0) throw new Error(`${fieldName} tidak boleh negatif`);
  return Math.trunc(n);
}

function buildQuotasFromExcel(rn: Record<string, any>): QuotaInput[] {
  const mapping: Array<{
    key: string;
    test_name: "IELTS" | "TOEFL";
    test_type_id: number;
  }> = [
    // IELTS
    { key: "ielts_listening", test_name: "IELTS", test_type_id: 1 },
    { key: "ielts_reading", test_name: "IELTS", test_type_id: 2 },
    { key: "ielts_writing", test_name: "IELTS", test_type_id: 3 },
    { key: "ielts_speaking", test_name: "IELTS", test_type_id: 4 },
    // TOEFL
    { key: "toefl_listening", test_name: "TOEFL", test_type_id: 1 },
    { key: "toefl_structure", test_name: "TOEFL", test_type_id: 2 },
    { key: "toefl_reading", test_name: "TOEFL", test_type_id: 3 },
  ];

  const quotas: QuotaInput[] = [];
  for (const m of mapping) {
    const q = parseQuotaCell(rn[m.key], m.key);
    if (q > 0)
      quotas.push({
        test_name: m.test_name,
        test_type_id: m.test_type_id,
        quota: q,
      });
  }
  return quotas;
}

function quotaLabel(q: QuotaInput) {
  const skill =
    q.test_name === "IELTS"
      ? (
          { 1: "Listening", 2: "Reading", 3: "Writing", 4: "Speaking" } as const
        )[q.test_type_id as 1 | 2 | 3 | 4] ?? q.test_type_id
      : ({ 1: "Listening", 2: "Structure", 3: "Reading" } as const)[
          q.test_type_id as 1 | 2 | 3
        ] ?? q.test_type_id;

  return `${q.test_name} ${String(skill)}: ${q.quota}`;
}

/** ✅ Return Bucket yang skill-nya sesuai exam (fix TS7053) */
function getBucketKey(q: QuotaInput): Bucket | null {
  if (q.test_name === "IELTS") {
    switch (q.test_type_id) {
      case 1:
        return { exam: "IELTS", skill: "Listening" };
      case 2:
        return { exam: "IELTS", skill: "Reading" };
      case 3:
        return { exam: "IELTS", skill: "Writing" };
      case 4:
        return { exam: "IELTS", skill: "Speaking" };
      case 5:
        return { exam: "IELTS", skill: "Complete" };
      default:
        return null;
    }
  }

  switch (q.test_type_id) {
    case 1:
      return { exam: "TOEFL", skill: "Listening" };
    case 2:
      return { exam: "TOEFL", skill: "Structure & Written Expression" };
    case 3:
      return { exam: "TOEFL", skill: "Reading" };
    case 4:
      return { exam: "TOEFL", skill: "Complete" };
    default:
      return null;
  }
}

function cloneAvailable(a: ExamAvailableQuota): ExamAvailableQuota {
  return JSON.parse(JSON.stringify(a));
}

function applyOrgQuotaValidation(
  rows: ImportRow[],
  available: ExamAvailableQuota
): ImportRow[] {
  const remaining = cloneAvailable(available);

  return rows.map((r) => {
    const needMap = new Map<string, { q: QuotaInput; total: number }>();
    for (const q of r.quotas) {
      const k = `${q.test_name}:${q.test_type_id}`;
      const prev = needMap.get(k);
      needMap.set(k, { q, total: (prev?.total ?? 0) + q.quota });
    }

    const issues: string[] = [];

    for (const { q, total } of needMap.values()) {
      const bucket = getBucketKey(q);
      if (!bucket) {
        issues.push(`${q.test_name} type_id ${q.test_type_id} tidak dikenali`);
        continue;
      }

      const avail =
        bucket.exam === "IELTS"
          ? remaining.IELTS[bucket.skill]
          : remaining.TOEFL[bucket.skill];

      if (total > avail) {
        issues.push(
          `\n ${q.test_name} ${bucket.skill} requested ${total}, remaining ${avail}`
        );
      }
    }

    const ok = issues.length === 0;

    if (ok) {
      for (const { q, total } of needMap.values()) {
        const bucket = getBucketKey(q);
        if (!bucket) continue;

        if (bucket.exam === "IELTS") remaining.IELTS[bucket.skill] -= total;
        else remaining.TOEFL[bucket.skill] -= total;
      }
    }

    return { ...r, _quotaOk: ok, _quotaIssues: issues };
  });
}

function computeDemand(rows: ImportRow[]): ExamAvailableQuota {
  const base: ExamAvailableQuota = {
    IELTS: { Listening: 0, Reading: 0, Writing: 0, Speaking: 0, Complete: 0 },
    TOEFL: {
      Listening: 0,
      Reading: 0,
      "Structure & Written Expression": 0,
      Complete: 0,
    },
  };

  for (const r of rows) {
    for (const q of r.quotas) {
      const bucket = getBucketKey(q);
      if (!bucket) continue;

      if (bucket.exam === "IELTS") base.IELTS[bucket.skill] += q.quota;
      else base.TOEFL[bucket.skill] += q.quota;
    }
  }

  return base;
}

export const BulkImportStudentsModal = ({
  orgId,
  availableQuotas,
  isQuotaLoading,
  onClose,
  onSuccess,
}: Props) => {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const demand = useMemo(() => computeDemand(rows), [rows]);
  const hasOverQuota = useMemo(() => rows.some((r) => !r._quotaOk), [rows]);

  /** Tooltip lines: Total diminta vs sisa org per skill */
  const summaryLines = useMemo(() => {
    const lines: Array<{
      label: string;
      need: number;
      avail: number;
      after: number;
      isBad: boolean;
    }> = [];

    for (const k of IELTS_KEYS) {
      const need = demand.IELTS[k] ?? 0;
      const avail = availableQuotas.IELTS[k] ?? 0;
      const after = avail - need;
      lines.push({
        label: `IELTS ${k}`,
        need,
        avail,
        after,
        isBad: need > avail,
      });
    }

    for (const k of TOEFL_KEYS) {
      const need = demand.TOEFL[k] ?? 0;
      const avail = availableQuotas.TOEFL[k] ?? 0;
      const after = avail - need;
      lines.push({
        label: `TOEFL ${k}`,
        need,
        avail,
        after,
        isBad: need > avail,
      });
    }

    // biar nggak kepanjangan, tampilkan yang relevan saja
    return lines.filter((x) => x.need > 0 || x.avail > 0);
  }, [demand, availableQuotas]);

  useEffect(() => {
    if (!rows.length) return;
    if (isQuotaLoading) return;
    setRows((prev) => applyOrgQuotaValidation(prev, availableQuotas));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuotaLoading, availableQuotas]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      const workbook =
        typeof data === "string"
          ? XLSX.read(data, { type: "binary" })
          : XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const json: RawRow[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      const mapped: ImportRow[] = [];
      const errorList: string[] = [];

      json.forEach((row, idx) => {
        try {
          const rn: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) rn[normalizeKey(k)] = v;

          const name = String(rn["name"] ?? "").trim();
          const username = String(rn["username"] ?? "").trim();
          const email = String(rn["email"] ?? "").trim();
          const phone =
            rn["phone"] !== "" ? String(rn["phone"]).trim() : undefined;

          if (!name || !username || !email) {
            throw new Error("name, username, email wajib diisi");
          }

          const quotas = buildQuotasFromExcel(rn);
          if (!quotas.length) {
            throw new Error("Minimal 1 kuota harus > 0");
          }

          mapped.push({
            name,
            username,
            email,
            phone,
            nationality: rn["nationality"]
              ? String(rn["nationality"]).trim()
              : undefined,
            country_origin: rn["country_origin"]
              ? String(rn["country_origin"]).trim()
              : undefined,
            first_language: rn["first_language"]
              ? String(rn["first_language"]).trim()
              : undefined,
            quotas,
            currency: "IDR",
            _excelRow: idx + 2,
            _quotaOk: true,
            _quotaIssues: [],
          });
        } catch (err: any) {
          errorList.push(`Row ${idx + 2}: ${err.message}`);
        }
      });

      const nextRows = isQuotaLoading
        ? mapped
        : applyOrgQuotaValidation(mapped, availableQuotas);

      setRows(nextRows);
      setErrors(errorList);
    };

    if (file.type.includes("csv") || file.type === "") reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r._quotaOk);
    if (!validRows.length) return;

    setIsSubmitting(true);
    try {
      const payload = {
        users: validRows.map((r) => ({
          name: r.name,
          username: r.username,
          email: r.email,
          phone: r.phone,
          nationality: r.nationality,
          country_origin: r.country_origin,
          first_language: r.first_language,
          quotas: r.quotas,
          currency: r.currency ?? "IDR",
        })),
      };

      await api.post(`/v1/b2b/orgs/${orgId}/members/bulk`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-semibold text-foreground">
            Bulk Import Students
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
            <Button variant="outline" asChild>
              <a
                href="https://docs.google.com/spreadsheets/d/1UaktvuseXVgVd_668TaIdyU1XcZsZEiwtd7PTHzTQEk/export?format=xlsx"
                target="_blank"
                rel="noreferrer"
              >
                Download Sample
              </a>
            </Button>
          </div>

          {fileName && (
            <p className="text-xs text-muted-foreground">
              File: <span className="font-medium">{fileName}</span>
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Supported columns:{" "}
            <b>
              name, username, email, phone, nationality, country_origin,
              first_language, ielts_listening, ielts_reading, ielts_writing,
              ielts_speaking, toefl_listening, toefl_structure, toefl_reading
            </b>
            <br />
            Enter <b>0</b> if you do not want to assign a quota for that skill.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-md p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Some rows are invalid:</span>
            </div>
            <ul className="text-xs text-red-700 list-disc list-inside max-h-32 overflow-y-auto">
              {errors.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {isQuotaLoading && rows.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 rounded-md p-3 text-xs text-amber-800">
            Loading organization quotas… The Import button will be active once
            ready.
          </div>
        )}

        {!isQuotaLoading && hasOverQuota && rows.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-md p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Insufficient organization quota for some rows. Please fix the
                quotas in the red rows.
              </span>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="border rounded-md p-3 max-h-60 overflow-auto text-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-muted-foreground">
                Preview <b>{rows.length}</b> rows to be imported:
              </p>

              {/* ✅ Tooltip Summary */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:opacity-90"
                    >
                      Quota Summary <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs max-w-[440px]">
                    <div className="space-y-2">
                      <div className="font-semibold">
                        Total Requested vs. Remaining Organization Quota
                      </div>

                      <div className="grid grid-cols-4 gap-2 font-semibold border-b pb-1">
                        <div>Skill</div>
                        <div className="text-right">Requested</div>
                        <div className="text-right">Remaining</div>
                        <div className="text-right">After</div>
                      </div>

                      <div className="space-y-1">
                        {summaryLines.map((x) => (
                          <div
                            key={x.label}
                            className={`grid grid-cols-4 gap-2 ${
                              x.isBad ? "text-red-600" : ""
                            }`}
                          >
                            <div className="truncate">{x.label}</div>
                            <div className="text-right">{x.need}</div>
                            <div className="text-right">{x.avail}</div>
                            <div className="text-right">{x.after}</div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[11px] text-muted-foreground">
                        After = Remaining - Requested. Negative values indicate
                        insufficient quota.
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left py-1 px-2">Name</th>
                  <th className="text-left py-1 px-2">Email</th>
                  <th className="text-left py-1 px-2">Username</th>
                  <th className="text-left py-1 px-2">Quotas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={idx}
                    className={`border-t ${r._quotaOk ? "" : "bg-red-50"}`}
                  >
                    <td className="py-1 px-2">{r.name}</td>
                    <td className="py-1 px-2">{r.email}</td>
                    <td className="py-1 px-2">{r.username}</td>
                    <td className="py-1 px-2">
                      {r.quotas.map((q, i) => (
                        <div key={i}>{quotaLabel(q)}</div>
                      ))}

                      {!r._quotaOk && (
                        <div className="mt-1 text-[11px] text-red-600">
                          Excel row {r._excelRow}: {r._quotaIssues.join("; ")}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              rows.length === 0 ||
              Boolean(isQuotaLoading) ||
              hasOverQuota
            }
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Students
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
