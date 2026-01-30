"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemberRow } from "@/app/actions/hooks/b2b/useMember";
import {
  useAllocateQuota,
  useRevokeQuota,
} from "@/app/actions/hooks/b2b/useQuota";
import { useB2BOrgStore } from "@/store/useB2BOrgStore";

type ExamAvailableQuota = {
  IELTS: {
    Reading: number;
    Listening: number;
    Writing: number;
    Speaking: number;
    Complete: number;
  };
  TOEFL: {
    Reading: number;
    Listening: number;
    "Structure & Written Expression": number;
    Complete: number;
  };
};

type Props = {
  orgId: number;
  student: MemberRow;
  availableQuotas: ExamAvailableQuota;
  onClose: () => void;
};

const IELTS_TYPE_ID: Record<string, number> = {
  Listening: 1,
  Reading: 2,
  Writing: 3,
  Speaking: 4,
  Complete: 5,
};

const TOEFL_TYPE_ID: Record<string, number> = {
  Listening: 1,
  "Structure & Written Expression": 2,
  Reading: 3,
  Complete: 4,
};

export function QuotaAllocationModal({
  orgId,
  student,
  availableQuotas,
  onClose,
}: Props) {
  const [quotas, setQuotas] = useState(student.quotas);
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: allocate } = useAllocateQuota(orgId);
  const { mutateAsync: revoke } = useRevokeQuota(orgId);

  const ieltTypes = [
    "Reading",
    "Listening",
    "Writing",
    "Speaking",
    "Complete",
  ] as const;
  const toeflTypes = [
    "Reading",
    "Listening",
    "Structure & Written Expression",
    "Complete",
  ] as const;

  // ===== Helper untuk hitung quota asli & available org =====
  const getOriginalStudentQuota = (
    exam: "IELTS" | "TOEFL",
    testType: string
  ) => {
    const examQuotas = (student.quotas as any)?.[exam] ?? {};
    return (examQuotas[testType] as number | undefined) ?? 0;
  };

  const getBaseAvailableQuota = (exam: "IELTS" | "TOEFL", testType: string) => {
    const examQuotas = (availableQuotas as any)?.[exam] ?? {};
    return (examQuotas[testType] as number | undefined) ?? 0;
  };

  // Maksimal quota yang bisa di-set untuk siswa ini = quota siswa sekarang + quota org yang available
  const getMaxQuotaForStudent = (exam: "IELTS" | "TOEFL", testType: string) => {
    return (
      getOriginalStudentQuota(exam, testType) +
      getBaseAvailableQuota(exam, testType)
    );
  };

  // Sisa available quota org setelah perubahan (realtime)
  const getRemainingAvailable = (exam: "IELTS" | "TOEFL", testType: string) => {
    const baseAvailable = getBaseAvailableQuota(exam, testType);
    const originalStudent = getOriginalStudentQuota(exam, testType);
    const current =
      ((quotas as any)?.[exam]?.[testType] as number | undefined) ?? 0;

    const delta = current - originalStudent; // + berarti menambah ke siswa, - berarti mengurangi
    const remaining = baseAvailable - delta;
    return remaining < 0 ? 0 : remaining;
  };

  const handleQuotaChange = (
    examType: "IELTS" | "TOEFL",
    testType: string,
    value: number
  ) => {
    const maxForStudent = getMaxQuotaForStudent(examType, testType);
    const safeValue = Math.min(Math.max(0, value), maxForStudent);

    setQuotas((prev: any) => ({
      ...prev,
      [examType]: {
        ...prev[examType],
        [testType]: safeValue,
      },
    }));
  };

  const { user } = useB2BOrgStore.getState();

  console.log(user, "USER");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const original = student.quotas;

      const ops: {
        exam: "IELTS" | "TOEFL";
        testType: string;
        diff: number;
      }[] = [];

      for (const t of ieltTypes) {
        const oldVal = original.IELTS[t] ?? 0;
        const newVal = quotas.IELTS[t] ?? 0;
        const diff = newVal - oldVal;
        if (diff !== 0) {
          ops.push({ exam: "IELTS", testType: t, diff });
        }
      }

      for (const t of toeflTypes) {
        const oldVal = original.TOEFL[t] ?? 0;
        const newVal = quotas.TOEFL[t] ?? 0;
        const diff = newVal - oldVal;
        if (diff !== 0) {
          ops.push({ exam: "TOEFL", testType: t, diff });
        }
      }

      const userId = student.user_id;
      const adminId = undefined; // TODO: inject dari JWT

      for (const op of ops) {
        if (op.exam === "IELTS") {
          const typeId = IELTS_TYPE_ID[op.testType];
          if (!typeId) continue;

          if (op.diff > 0) {
            await allocate({
              test: "IELTS",
              user_id: userId,
              test_type_id: typeId,
              amount: op.diff,
              admin_id: user?.id,
            });
          } else {
            await revoke({
              test: "IELTS",
              user_id: userId,
              test_type_id: typeId,
              amount: Math.abs(op.diff),
              admin_id: user?.id,
            });
          }
        } else {
          const typeId = TOEFL_TYPE_ID[op.testType];
          if (!typeId) continue;

          if (op.diff > 0) {
            await allocate({
              test: "TOEFL",
              user_id: userId,
              test_type_id: typeId,
              amount: op.diff,
              admin_id: user?.id,
            });
          } else {
            await revoke({
              test: "TOEFL",
              user_id: userId,
              test_type_id: typeId,
              amount: Math.abs(op.diff),
              admin_id: user?.id,
            });
          }
        }
      }

      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to update quota. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalIELTS = ieltTypes.reduce(
    (sum, type) => sum + (quotas.IELTS[type] ?? 0),
    0
  );
  const totalTOEFL = toeflTypes.reduce(
    (sum, type) => sum + (quotas.TOEFL[type] ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {student.users?.name ?? "-"}
        </h2>
        <p className="text-sm text-muted-foreground ">
          Allocate test quotas
        </p>

        <div className="space-y-8">
          {/* IELTS Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              IELTS Quotas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ieltTypes.map((testType) => {
                const remaining = getRemainingAvailable("IELTS", testType);
                const baseAvailable = getBaseAvailableQuota("IELTS", testType);
                const isDisabled =
                  baseAvailable === 0 &&
                  getOriginalStudentQuota("IELTS", testType) === 0;
                console.log(baseAvailable);
                return (
                  <div key={testType}>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {testType}
                    </label>
                    <div className="flex flex-col items-start gap-2">
                      <input
                        type="number"
                        min={0}
                        max={
                          getMaxQuotaForStudent("IELTS", testType) || undefined
                        }
                        disabled={isDisabled}
                        value={quotas.IELTS[testType] || ""}
                        onChange={(e) =>
                          handleQuotaChange(
                            "IELTS",
                            testType,
                            e.target.value === "" ? 0 : parseInt(e.target.value, 10)
                          )
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {/* sisa available org (realtime) */}
                        Remaining: {remaining}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOEFL Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              TOEFL Quotas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toeflTypes.map((testType) => {
                const remaining = getRemainingAvailable("TOEFL", testType);
                const baseAvailable = getBaseAvailableQuota("TOEFL", testType);
                const isDisabled =
                  baseAvailable === 0 &&
                  getOriginalStudentQuota("TOEFL", testType) === 0;

                return (
                  <div key={testType}>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {testType}
                    </label>
                    <div className="flex flex-col items-start gap-2">
                      <input
                        type="number"
                        min={0}
                        max={
                          getMaxQuotaForStudent("TOEFL", testType) || undefined
                        }
                        disabled={isDisabled}
                        value={quotas.TOEFL[testType] || ""}
                        onChange={(e) =>
                          handleQuotaChange(
                            "TOEFL",
                            testType,
                            e.target.value === "" ? 0 : parseInt(e.target.value, 10)
                          )
                        }
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Remaining: {remaining}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Total IELTS Quota:</span>{" "}
              {totalIELTS} tests
            </p>
            <p className="text-sm text-blue-900 mt-2">
              <span className="font-semibold">Total TOEFL Quota:</span>{" "}
              {totalTOEFL} tests
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-transparent"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Quotas"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
