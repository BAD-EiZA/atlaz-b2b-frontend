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
import { Minus, Plus } from "lucide-react"; // Asumsi project menggunakan lucide-react (standar shadcn)

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

// Konstanta untuk step allocation
const ALLOCATION_STEP = 5;

export function QuotaBatchAllocationModal({
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

  const { user } = useB2BOrgStore.getState();

  // ===== Helper Logic =====

  const getOriginalStudentQuota = (
    exam: "IELTS" | "TOEFL",
    testType: string,
  ) => {
    const examQuotas = (student.quotas as any)?.[exam] ?? {};
    return (examQuotas[testType] as number | undefined) ?? 0;
  };

  const getBaseAvailableQuota = (exam: "IELTS" | "TOEFL", testType: string) => {
    const examQuotas = (availableQuotas as any)?.[exam] ?? {};
    return (examQuotas[testType] as number | undefined) ?? 0;
  };

  // Menghitung sisa kuota organisasi secara realtime berdasarkan perubahan state lokal
  const getRemainingAvailable = (exam: "IELTS" | "TOEFL", testType: string) => {
    const baseAvailable = getBaseAvailableQuota(exam, testType);
    const originalStudent = getOriginalStudentQuota(exam, testType);
    const currentStudent =
      ((quotas as any)?.[exam]?.[testType] as number | undefined) ?? 0;

    const delta = currentStudent - originalStudent;
    const remaining = baseAvailable - delta;
    return remaining < 0 ? 0 : remaining;
  };

  const handleAdjustQuota = (
    examType: "IELTS" | "TOEFL",
    testType: string,
    operation: "increment" | "decrement",
  ) => {
    setQuotas((prev: any) => {
      const currentVal = prev[examType][testType] ?? 0;

      let newVal = currentVal;
      if (operation === "increment") {
        newVal = currentVal + ALLOCATION_STEP;
      } else {
        newVal = currentVal - ALLOCATION_STEP;
      }

      // Safety check agar tidak minus
      if (newVal < 0) newVal = 0;

      return {
        ...prev,
        [examType]: {
          ...prev[examType],
          [testType]: newVal,
        },
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const original = student.quotas;
      const ops: {
        exam: "IELTS" | "TOEFL";
        testType: string;
        diff: number;
      }[] = [];

      // Calculate Diff IELTS
      for (const t of ieltTypes) {
        const oldVal = original.IELTS[t] ?? 0;
        const newVal = quotas.IELTS[t] ?? 0;
        const diff = newVal - oldVal;
        if (diff !== 0) ops.push({ exam: "IELTS", testType: t, diff });
      }

      // Calculate Diff TOEFL
      for (const t of toeflTypes) {
        const oldVal = original.TOEFL[t] ?? 0;
        const newVal = quotas.TOEFL[t] ?? 0;
        const diff = newVal - oldVal;
        if (diff !== 0) ops.push({ exam: "TOEFL", testType: t, diff });
      }

      const userId = student.user_id;

      for (const op of ops) {
        const typeMap = op.exam === "IELTS" ? IELTS_TYPE_ID : TOEFL_TYPE_ID;
        const typeId = typeMap[op.testType];

        if (!typeId) continue;

        if (op.diff > 0) {
          await allocate({
            test: op.exam,
            user_id: userId,
            test_type_id: typeId,
            amount: op.diff,
            admin_id: user?.id,
          });
        } else {
          await revoke({
            test: op.exam,
            user_id: userId,
            test_type_id: typeId,
            amount: Math.abs(op.diff),
            admin_id: user?.id,
          });
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

  // Helper untuk me-render baris kontrol stepper
  const renderQuotaControl = (exam: "IELTS" | "TOEFL", testType: string) => {
    const currentVal =
      ((quotas as any)?.[exam]?.[testType] as number | undefined) ?? 0;
    const remainingOrgQuota = getRemainingAvailable(exam, testType);

    // Disabled Minus jika nilai sekarang 0
    const isMinusDisabled = currentVal === 0;

    // Disabled Plus jika sisa kuota org < 5 (tidak cukup untuk 1 batch)
    // ATAU jika kita mencapai batas aman logika (meski jarang terjadi di batch logic)
    const isPlusDisabled = remainingOrgQuota < ALLOCATION_STEP;

    return (
      <div key={testType}>
        <label className="block text-sm font-medium text-foreground mb-2">
          {testType}
        </label>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => handleAdjustQuota(exam, testType, "decrement")}
              disabled={isMinusDisabled || isSaving}
            >
              <Minus className="h-4 w-4" />
              <span className="sr-only">Decrease</span>
            </Button>

            <div className="flex-1 text-center font-mono text-sm font-medium border rounded-md py-2 bg-background min-w-[60px]">
              {currentVal}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => handleAdjustQuota(exam, testType, "increment")}
              disabled={isPlusDisabled || isSaving}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Increase</span>
            </Button>
          </div>

          <div className="flex justify-between items-center px-1">
            <span className="text-xs text-muted-foreground">
              Org Remaining: {remainingOrgQuota}
            </span>
            {isPlusDisabled &&
              remainingOrgQuota > 0 &&
              remainingOrgQuota < 5 && (
                <span className="text-[10px] text-red-500">
                  Not enough for +5
                </span>
              )}
          </div>
        </div>
      </div>
    );
  };

  const totalIELTS = ieltTypes.reduce(
    (sum, type) => sum + (quotas.IELTS[type] ?? 0),
    0,
  );
  const totalTOEFL = toeflTypes.reduce(
    (sum, type) => sum + (quotas.TOEFL[type] ?? 0),
    0,
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {student.users?.name ?? "-"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Batch Allocation (Per 5 Quotas)
        </p>

        <div className="space-y-8">
          {/* IELTS Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b">
              IELTS Quotas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {ieltTypes.map((testType) =>
                renderQuotaControl("IELTS", testType),
              )}
            </div>
          </div>

          {/* TOEFL Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b">
              TOEFL Quotas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {toeflTypes.map((testType) =>
                renderQuotaControl("TOEFL", testType),
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Total IELTS:</span> {totalIELTS}
              </p>
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Total TOEFL:</span> {totalTOEFL}
              </p>
            </div>
            <div className="text-xs text-blue-700 italic">
              Changes are saved in batches of 5
            </div>
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
            {isSaving ? "Saving..." : "Save Batch Quotas"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
