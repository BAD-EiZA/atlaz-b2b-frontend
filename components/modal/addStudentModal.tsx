"use client";

import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddMember } from "@/app/actions/hooks/b2b/useMember";

const testTypeMapping = {
  IELTS: {
    Complete: 5,
    Reading: 2,
    Listening: 1,
    Writing: 3,
    Speaking: 4,
  },
  TOEFL: {
    Complete: 4,
    Listening: 1,
    Reading: 3,
    Structure: 2,
  },
} as const;

const addStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  test_name: z.enum(["IELTS", "TOEFL"]),
  test_type: z.string().min(1),
  quota: z
    .string()
    .min(1, "Quota is required")
    .transform((v) => Number(v))
    .refine((v) => v > 0, "Quota must be greater than 0"),
});

type AddStudentFormValues = z.infer<typeof addStudentSchema>;

type Props = {
  orgId: number;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddStudentForm({ orgId, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AddStudentFormValues>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      test_name: "IELTS",
      test_type: "Listening",
    },
  });

  const test_name = watch("test_name") || "IELTS";

  const { mutateAsync: addMember, isPending } = useAddMember(orgId);

  const onSubmit = async (values: AddStudentFormValues) => {
    const mapping =
      testTypeMapping[values.test_name as "IELTS" | "TOEFL"] ?? {};
    const test_type_id = (mapping as any)[values.test_type];

    if (!test_type_id) {
      alert("Invalid test type selection");
      return;
    }

    await addMember({
      name: values.name,
      email: values.email,
      username: values.username,
      password: values.password || undefined,
      test_name: values.test_name,
      test_type_id,
      quota: values.quota,
    });

    onSuccess();
  };

  const getTestTypes = () => {
    const map = testTypeMapping[test_name as "IELTS" | "TOEFL"];
    return Object.keys(map);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* User Information Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          User Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
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

      {/* Quota Information Section */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Test Quota Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Test Type *
            </label>
            <select
              {...register("test_name")}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="IELTS">IELTS</option>
              <option value="TOEFL">TOEFL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Test Section *
            </label>
            <select
              {...register("test_type")}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {getTestTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Quota (Number of Attempts) *
            </label>
            <input
              type="number"
              min={1}
              placeholder="Enter number of test attempts"
              {...register("quota")}
              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.quota && (
              <p className="mt-1 text-xs text-red-500">
                {errors.quota.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-border pt-6 flex gap-3">
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          className="flex-1 bg-transparent"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Adding..." : "Add Student"}
        </Button>
      </div>
    </form>
  );
}
