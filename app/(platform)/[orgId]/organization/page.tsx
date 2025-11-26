"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Save, X } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Breadcrumb } from "@/components/breadcrumb";
import Uploader from "@/components/common/Uploader";
import { useOrg, useUpdateOrg } from "@/app/actions/hooks/b2b/useOrg";
import { orgFormSchema, type OrgFormValues } from "@/lib/zod-b2b";
import { UsePostUploader } from "@/app/actions/hooks/b2b/useUploader";
import { useParams } from "next/navigation";



export default function OrganizationPage() {
    const params = useParams<{ orgId: string }>();
    const orgId = params.orgId

  /* ---------------- RHF + ZOD ---------------- */

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: "",
      logo: "",
      logoUploaded: false,
    },
  });

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;

  const logoValue = watch("logo");

  /* ---------------- REACT QUERY: ORG ---------------- */

  const { data: orgData, isLoading: loadingOrg } = useOrg(orgId);
  const { mutate: mutateUpdateOrg, isPending: savingOrg } = useUpdateOrg(orgId);

  // upload ke S3 (sama dengan CMS Create School)
  const { mutate: mutateUploadS3 } = UsePostUploader();

  // ketika data org sudah ready, sync ke form
  useEffect(() => {
    if (orgData) {
      reset({
        name: orgData.name ?? "",
        logo: orgData.logo ?? "",
        logoUploaded: !!orgData.logo,
      });
    }
  }, [orgData, reset]);

  /* ---------------- HANDLER SAVE ---------------- */

  const onSubmit = (values: OrgFormValues) => {
    mutateUpdateOrg(values, {
      onSuccess: (updated) => {
        reset({
          name: updated.name ?? "",
          logo: updated.logo ?? "",
          logoUploaded: !!updated.logo,
        });
        console.log("[Org] Saved:", updated);
      },
    });
  };

  const handleCancel = () => {
    if (orgData) {
      reset({
        name: orgData.name ?? "",
        logo: orgData.logo ?? "",
        logoUploaded: !!orgData.logo,
      });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex md:flex-row flex-col items-start md:items-center justify-between">
        <div className="flex-1">
          <Breadcrumb
            items={[
              { label: "Dashboard", href: `/${orgId}/dashboard` },
              { label: "Organization" },
            ]}
          />
          <h1 className="text-xl md:text-3xl font-bold text-foreground">
            Organization Settings
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your organization profile
          </p>
        </div>
        <Link href={`/${orgId}/dashboard`}>
          <Button variant="outline" className="gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {loadingOrg && (
        <p className="mb-4 text-sm text-muted-foreground">
          Loading organization...
        </p>
      )}

      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-8"
        >
          <Card className="p-6">
            <h2 className="mb-6 text-xl font-semibold text-foreground">
              Organization Details
            </h2>

            <div className="space-y-6">
              {/* NAME */}
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={loadingOrg || savingOrg}
                        placeholder="Organization Name"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          trigger("name");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* LOGO + UPLOADER ala Create School */}
              <FormField
                name="logo"
                render={() => (
                  <FormItem>
                    <FormLabel>Organization Logo</FormLabel>
                    <div className="flex items-center gap-4">
                      {logoValue ? (
                        <div className="relative flex h-24 w-48 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
                          <button
                            type="button"
                            onClick={() => {
                              setValue("logo", "");
                              setValue("logoUploaded", false);
                              trigger("logo");
                            }}
                            className="absolute right-1 top-1 rounded bg-white p-1 shadow"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <Image
                            src={logoValue}
                            alt="Org Logo"
                            width={160}
                            height={80}
                            className="h-20 w-40 object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <Uploader
                            maxSize={10 * 1024 * 1024}
                            Size="10MB"
                            SupportFile="PNG / WEBP"
                            Title="Upload Organization Logo"
                            Mutate={mutateUploadS3}
                            Type="logo" // akan setValue("logo", url)
                            Value={setValue}
                            FileOnDrop={["image/png", "image/webp"]}
                            isError={errors.logo as any}
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={loadingOrg || savingOrg}
                >
                  <Save className="h-4 w-4" />
                  {savingOrg ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingOrg || savingOrg}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}
