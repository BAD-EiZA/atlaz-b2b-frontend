"use client";

import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { AlertTriangle, Loader2, Upload } from "lucide-react";

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
  currency?: string; // optional (backend default IDR)
};

type Props = {
  orgId: number;
  onClose: () => void;
  onSuccess: () => void;
};

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
      ? ({ 1: "Listening", 2: "Reading", 3: "Writing", 4: "Speaking" } as any)[
          q.test_type_id
        ] ?? q.test_type_id
      : ({ 1: "Listening", 2: "Structure", 3: "Reading" } as any)[
          q.test_type_id
        ] ?? q.test_type_id;

  return `${q.test_name} ${skill}: ${q.quota}`;
}

export const BulkImportStudentsModal = ({
  orgId,
  onClose,
  onSuccess,
}: Props) => {
  const [rows, setRows] = useState<CreateMemberPayload[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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

      const mapped: CreateMemberPayload[] = [];
      const errorList: string[] = [];

      json.forEach((row, idx) => {
        try {
          const rn: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) rn[normalizeKey(k)] = v;

          const name = String(rn["name"] ?? "").trim();
          const username = String(rn["username"] ?? "").trim();
          const email = String(rn["email"] ?? "").trim();

          // NOTE: kalau mau leading zero aman, pastikan kolom phone di Excel format "Text"
          const phone =
            rn["phone"] !== "" ? String(rn["phone"]).trim() : undefined;

          if (!name || !username || !email) {
            throw new Error("name, username, email wajib diisi");
          }

          const quotas = buildQuotasFromExcel(rn);
          if (!quotas.length) {
            throw new Error(
              "Minimal 1 kuota harus > 0 (isi kolom IELTS/TOEFL quota)"
            );
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
          });
        } catch (err: any) {
          errorList.push(`Row ${idx + 2}: ${err.message}`);
        }
      });

      setRows(mapped);
      setErrors(errorList);
    };

    if (file.type.includes("csv") || file.type === "") reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (!rows.length) return;

    setIsSubmitting(true);
    try {
      // ✅ match CreateMemberDto backend kamu
      const payload = {
        users: rows.map((r) => ({
          name: r.name,
          username: r.username,
          email: r.email,
          phone: r.phone,
          nationality: r.nationality,
          country_origin: r.country_origin,
          first_language: r.first_language,
          quotas: r.quotas, // ✅ INI YANG PENTING
          currency: r.currency ?? "IDR",
        })),
      };

      const res = await api.post(`/v1/b2b/orgs/${orgId}/members/bulk`, payload);

      // optional: handle res.data.success/failed
      // console.log(res.data);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
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
                href="https://docs.google.com/spreadsheets/d/1unmMEgecHDtNknvWJZeThDNDvM3Oxa8Mo0akUoVPE-0/export?format=xlsx"
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

        {rows.length > 0 && (
          <div className="border rounded-md p-3 max-h-60 overflow-auto text-xs">
            <p className="mb-2 text-muted-foreground">
              Preview <b>{rows.length}</b> rows to be imported:
            </p>
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
                  <tr key={idx} className="border-t">
                    <td className="py-1 px-2">{r.name}</td>
                    <td className="py-1 px-2">{r.email}</td>
                    <td className="py-1 px-2">{r.username}</td>
                    <td className="py-1 px-2">
                      {r.quotas.map((q, i) => (
                        <div key={i}>{quotaLabel(q)}</div>
                      ))}
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
            disabled={isSubmitting || rows.length === 0}
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
