"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddMember } from "@/app/actions/hooks/b2b/useMember";

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

const addStudentSchema = z.object({
  // Step 1: account
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),

  // Step 2: profile (opsional)
  nationality: z.string().optional(),
  country_origin: z.string().optional(),
  first_language: z.string().optional(),

  // Step 3: quotas (string → nanti di-convert ke number)
  ielts_listening: z.string().optional(),
  ielts_reading: z.string().optional(),
  ielts_writing: z.string().optional(),
  ielts_speaking: z.string().optional(),
  ielts_complete: z.string().optional(),
  toefl_listening: z.string().optional(),
  toefl_structure: z.string().optional(),
  toefl_reading: z.string().optional(),
  toefl_complete: z.string().optional(),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

type Props = {
  orgId: number;
  availableQuotas: ExamAvailableQuota;
  onClose: () => void;
  onSuccess: () => void;
};

const steps = [
  { id: 1, label: "Account" },
  { id: 2, label: "Profile" },
  { id: 3, label: "Assign Quota" },
];

export function AddStudentForm({
  orgId,
  availableQuotas,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      nationality: "Indonesian",
      country_origin: "Indonesia",
      first_language: "Indonesian",
    },
  });

  const { mutateAsync: addMember, isPending } = useAddMember(orgId);

  const handleNext = async () => {
    if (step === 1) {
      const ok = await trigger(["name", "email", "username"]);
      if (ok) setStep(2);
    } else if (step === 2) {
      // profile optional → langsung ke step 3
      setStep(3);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const allQuotaZero = (() => {
    const i = availableQuotas?.IELTS;
    const t = availableQuotas?.TOEFL;

    const nums = [
      i?.Listening,
      i?.Reading,
      i?.Writing,
      i?.Speaking,
      i?.Complete,
      t?.Listening,
      t?.["Structure & Written Expression"],
      t?.Reading,
      t?.Complete,
    ].map((n) => Number(n ?? 0));

    return nums.every((n) => n <= 0);
  })();

  const onSubmit = async (values: AddStudentFormValues) => {
    // Susun quotas[] untuk backend
    type QuotaItem = {
      test_name: "IELTS" | "TOEFL";
      test_type_id: number;
      quota: number;
    };

    if (allQuotaZero) {
      setQuotaError("Organization has no remaining quota to assign.");
      setStep(3);
      return;
    }

    const quotas: QuotaItem[] = [];
    let quotaValidationError: string | null = null;

    const addQuota = (
      test_name: "IELTS" | "TOEFL",
      test_type_id: number,
      rawValue: string | undefined,
      remaining: number,
      label: string
    ) => {
      const trimmed = (rawValue ?? "").trim();
      if (!trimmed) return;
      const qty = Number(trimmed);
      if (Number.isNaN(qty) || qty <= 0) return;

      if (qty > remaining) {
        quotaValidationError = `Quota for ${test_name} ${label} cannot exceed remaining (${remaining}).`;
        return;
      }

      quotas.push({ test_name, test_type_id, quota: qty });
    };

    // IELTS mapping: 1=Listening, 2=Reading, 3=Writing, 4=Speaking, 5=Complete
    addQuota(
      "IELTS",
      1,
      values.ielts_listening,
      availableQuotas.IELTS.Listening,
      "Listening"
    );
    addQuota(
      "IELTS",
      2,
      values.ielts_reading,
      availableQuotas.IELTS.Reading,
      "Reading"
    );
    addQuota(
      "IELTS",
      3,
      values.ielts_writing,
      availableQuotas.IELTS.Writing,
      "Writing"
    );
    addQuota(
      "IELTS",
      4,
      values.ielts_speaking,
      availableQuotas.IELTS.Speaking,
      "Speaking"
    );
    addQuota(
      "IELTS",
      5,
      values.ielts_complete,
      availableQuotas.IELTS.Complete,
      "Complete"
    );

    // TOEFL mapping: 1=Listening, 2=Structure, 3=Reading, 4=Complete
    addQuota(
      "TOEFL",
      1,
      values.toefl_listening,
      availableQuotas.TOEFL.Listening,
      "Listening"
    );
    addQuota(
      "TOEFL",
      2,
      values.toefl_structure,
      availableQuotas.TOEFL["Structure & Written Expression"],
      "Structure & Written Expression"
    );
    addQuota(
      "TOEFL",
      3,
      values.toefl_reading,
      availableQuotas.TOEFL.Reading,
      "Reading"
    );
    addQuota(
      "TOEFL",
      4,
      values.toefl_complete,
      availableQuotas.TOEFL.Complete,
      "Complete"
    );

    if (quotaValidationError) {
      setQuotaError(quotaValidationError);
      setStep(3);
      return;
    }

    if (quotas.length === 0) {
      setQuotaError("Please assign at least one quota for IELTS or TOEFL.");
      setStep(3);
      return;
    }

    setQuotaError(null);

    await addMember({
      name: values.name,
      email: values.email,
      username: values.username,
      password: values.password || undefined,
      nationality: values.nationality!,
      country_origin: values.country_origin || undefined,
      first_language: values.first_language || undefined,
      currency: "IDR",
      quotas,
    });

    onSuccess();
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter student name"
                {...register("name")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email *
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                {...register("email")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Username *
              </label>
              <input
                type="text"
                placeholder="Enter username"
                {...register("username")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Leave empty for auto-generation"
                {...register("password")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Profile Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nationality */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nationality
              </label>
              <input
                type="text"
                placeholder="e.g. Indonesian"
                {...register("nationality")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.nationality && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.nationality.message}
                </p>
              )}
            </div>

            {/* Country of Origin */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Country of Origin
              </label>
              <input
                type="text"
                placeholder="e.g. Indonesia"
                {...register("country_origin")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.country_origin && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.country_origin.message}
                </p>
              )}
            </div>

            {/* First Language */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                First Language
              </label>
              <input
                type="text"
                placeholder="e.g. Indonesian"
                {...register("first_language")}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.first_language && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.first_language.message}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // step === 3
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Assign Test Quotas
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Set how many attempts you want to allocate for each skill. Leave empty
          or 0 to skip. Inputs are disabled if the organization has no remaining
          quota for that skill.
        </p>

        {quotaError && (
          <p className="mb-4 text-xs text-red-500 font-medium">{quotaError}</p>
        )}

        <div className="space-y-6">
          {/* IELTS */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              IELTS Quotas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Listening */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Listening
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.IELTS.Listening <= 0}
                  placeholder={
                    availableQuotas.IELTS.Listening <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("ielts_listening")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.IELTS.Listening}
                </p>
              </div>

              {/* Reading */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reading
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.IELTS.Reading <= 0}
                  placeholder={
                    availableQuotas.IELTS.Reading <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("ielts_reading")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.IELTS.Reading}
                </p>
              </div>

              {/* Writing */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Writing
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.IELTS.Writing <= 0}
                  placeholder={
                    availableQuotas.IELTS.Writing <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("ielts_writing")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.IELTS.Writing}
                </p>
              </div>

              {/* Speaking */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Speaking
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.IELTS.Speaking <= 0}
                  placeholder={
                    availableQuotas.IELTS.Speaking <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("ielts_speaking")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.IELTS.Speaking}
                </p>
              </div>

              {/* Complete */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Complete
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.IELTS.Complete <= 0}
                  placeholder={
                    availableQuotas.IELTS.Complete <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("ielts_complete")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.IELTS.Complete}
                </p>
              </div>
            </div>
          </div>

          {/* TOEFL */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              TOEFL Quotas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Listening */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Listening
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.TOEFL.Listening <= 0}
                  placeholder={
                    availableQuotas.TOEFL.Listening <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("toefl_listening")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.TOEFL.Listening}
                </p>
              </div>

              {/* Structure & Written Expression */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Structure &amp; Written Expression
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={
                    availableQuotas.TOEFL["Structure & Written Expression"] <= 0
                  }
                  placeholder={
                    availableQuotas.TOEFL["Structure & Written Expression"] <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("toefl_structure")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining:{" "}
                  {availableQuotas.TOEFL["Structure & Written Expression"]}
                </p>
              </div>

              {/* Reading */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reading
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.TOEFL.Reading <= 0}
                  placeholder={
                    availableQuotas.TOEFL.Reading <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("toefl_reading")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.TOEFL.Reading}
                </p>
              </div>

              {/* Complete */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Complete
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={availableQuotas.TOEFL.Complete <= 0}
                  placeholder={
                    availableQuotas.TOEFL.Complete <= 0
                      ? "No quota available"
                      : "Enter attempts"
                  }
                  {...register("toefl_complete")}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Remaining: {availableQuotas.TOEFL.Complete}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const progressPercent = ((step - 1) / (steps.length - 1 || 1)) * 100;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Stepper */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          {steps.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <div
                key={s.id}
                className="flex-1 flex flex-col items-center text-center"
              >
                <div
                  className={[
                    "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/90 text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {s.id}
                </div>
                <p className="mt-1 text-[11px] font-medium text-foreground">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-1 bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      {renderStepContent()}

      {/* Actions */}
      <div className="border-t border-border pt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          className="bg-transparent"
        >
          Cancel
        </Button>

        <div className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              onClick={handlePrev}
            >
              Previous
            </Button>
          )}

          {step < 3 && (
            <Button type="button" onClick={handleNext}>
              Next
            </Button>
          )}

          <Button type="submit" disabled={isPending || allQuotaZero}>
            {allQuotaZero
              ? "No Quota Remaining"
              : isPending
              ? "Adding..."
              : "Add Student"}
          </Button>
        </div>
      </div>
    </form>
  );
}
