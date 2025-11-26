"use client";

import { useState } from "react";
import * as XLSX from "xlsx-js-style";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api"; // sesuaikan dengan axios instance-mu
import { AlertTriangle, Loader2, Upload } from "lucide-react";

type RawRow = {
  name?: string;
  username?: string;
  email?: string;
  phone?: string | number;
  category?: string;
  type?: string;
  quota?: number;
};

type CreateMemberPayload = {
  name: string;
  username: string;
  email: string;
  phone?: string;
  test_name: "IELTS" | "TOEFL";
  test_type_id: number;
  quota: number;
  currency?: string;
};

type Props = {
  orgId: number;
  onClose: () => void;
  onSuccess: () => void;
};

function mapCategoryToTestName(category: string): "IELTS" | "TOEFL" {
  const c = category.trim().toUpperCase();
  if (c.startsWith("IELTS")) return "IELTS";
  if (c.startsWith("TOEFL")) return "TOEFL";
  throw new Error(`Unknown category: ${category}`);
}

function mapTypeToTestTypeId(testName: "IELTS" | "TOEFL", typeLabel: string) {
  const t = typeLabel.trim().toLowerCase();

  if (testName === "IELTS") {
    if (t === "listening") return 1;
    if (t === "reading") return 2;
    if (t === "writing") return 3;
    if (t === "speaking") return 4;
    if (t === "complete") return 5;
  } else {
    // TOEFL
    if (t === "listening") return 1;
    if (t.startsWith("structure")) return 2; // "Structure & Written Expression"
    if (t === "reading") return 3;
    if (t === "complete") return 4;
  }

  throw new Error(`Unknown type "${typeLabel}" for ${testName}`);
}

export const BulkImportStudentsModal = ({ orgId, onClose, onSuccess }: Props) => {
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

      let workbook;
      if (typeof data === "string") {
        workbook = XLSX.read(data, { type: "binary" });
      } else {
        workbook = XLSX.read(data, { type: "array" });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: RawRow[] = XLSX.utils.sheet_to_json(worksheet);

      const mapped: CreateMemberPayload[] = [];
      const errorList: string[] = [];

      json.forEach((row, idx) => {
        try {
          if (!row.name || !row.username || !row.email) {
            throw new Error("name, username, email wajib diisi");
          }
          if (!row.category || !row.type || row.quota == null) {
            throw new Error("category, type, dan Quota wajib diisi");
          }

          const test_name = mapCategoryToTestName(String(row.category));
          const test_type_id = mapTypeToTestTypeId(
            test_name,
            String(row.type)
          );
          const quota = Number(row.quota);

          if (!Number.isFinite(quota) || quota <= 0) {
            throw new Error("Quota harus > 0");
          }

          mapped.push({
            name: String(row.name).trim(),
            username: String(row.username).trim(),
            email: String(row.email).trim(),
            phone: row.phone ? String(row.phone).trim() : undefined,
            test_name,
            test_type_id,
            quota,
            currency: "IDR",
          });
        } catch (err: any) {
          errorList.push(`Row ${idx + 2}: ${err.message}`); // +2 karena header + index 0
        }
      });

      setRows(mapped);
      setErrors(errorList);

      if (!mapped.length) {
        console.log("Tidak ada yang bisa di import")
      }
    };

    if (file.type.includes("csv") || file.type === "") {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSubmit = async () => {
    if (!rows.length) {
      
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        users: rows.map((r) => ({
          name: r.name,
          username: r.username,
          email: r.email,
          phone: r.phone,
          test_name: r.test_name,
          test_type_id: r.test_type_id,
          quota: r.quota,
          currency: r.currency ?? "IDR",
        })),
      };

      const res = await api.post(
        `/v1/b2b/orgs/${orgId}/members/bulk`,
        payload
      );

      const data = res.data;
      if (data.failed > 0) {
      
      } else {
       
      }

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
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
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
            Kolom yang dibaca: <b>name, username, email, phone, category, type, quota</b>.
            <br />
            <b>category</b> = IELTS / TOEFL, <b>type</b> = Listening / Reading / Writing / Speaking / Complete.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-md p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Beberapa baris tidak valid:</span>
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
              Preview <b>{rows.length}</b> row yang akan di-import:
            </p>
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left py-1 px-2">Name</th>
                  <th className="text-left py-1 px-2">Email</th>
                  <th className="text-left py-1 px-2">Username</th>
                  <th className="text-left py-1 px-2">Category</th>
                  <th className="text-left py-1 px-2">Type</th>
                  <th className="text-left py-1 px-2">Quota</th>
                  <th className="text-left py-1 px-2">Phone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-1 px-2">{r.name}</td>
                    <td className="py-1 px-2">{r.email}</td>
                    <td className="py-1 px-2">{r.username}</td>
                    <td className="py-1 px-2">{r.test_name}</td>
                    <td className="py-1 px-2">{r.test_type_id}</td>
                    <td className="py-1 px-2">{r.quota}</td>
                    <td className="py-1 px-2">{r.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Batal
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
