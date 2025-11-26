// app/b2b/check/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useB2BOrgStore } from "@/store/useB2BOrgStore";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { setCookie } from "cookies-next";

const getAccessToken = () => {
  if (typeof document === "undefined") return null;
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1] || null
  );
};

export default function B2BCheckOrgPage() {
  const router = useRouter();
  const setContext = useB2BOrgStore((s) => s.setContext);

  useEffect(() => {
    const token = getAccessToken();
    console.log(token,"TOKNE")

    if (!token) {
       setCookie("accessToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzOTQsIm5hbWUiOiJFcnphIEIyQiIsInVzZXJuYW1lIjoiZXJ6YS5hZG1pbkBiMmIuY29tIiwiZW1haWwiOiJlcnphLmFkbWluQGIyYi5jb20iLCJyb2xlX2lkIjoyLCJzdGF0dXMiOnRydWUsInJlZmVycmFsX2NvZGUiOiJCQThDR1FLIiwiaXNCb29rQWN0aXZlIjpmYWxzZSwicmVtZW1iZXIiOmZhbHNlLCJpYXQiOjE3NjQxNDM3OTAsImV4cCI6MTc2NDIzMDE5MH0.22uN7E58AYBxqrgd1_TDcr11iZBEAju5ev3ECSYcKog")
      // tidak login → balik ke homepage
      router.replace("/");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `http://localhost:4002/v1/b2b/me/org`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );

        if (!res.ok) {
          // 401 / 403 / error lain
          setCookie("accessToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzOTQsIm5hbWUiOiJFcnphIEIyQiIsInVzZXJuYW1lIjoiZXJ6YS5hZG1pbkBiMmIuY29tIiwiZW1haWwiOiJlcnphLmFkbWluQGIyYi5jb20iLCJyb2xlX2lkIjoyLCJzdGF0dXMiOnRydWUsInJlZmVycmFsX2NvZGUiOiJCQThDR1FLIiwiaXNCb29rQWN0aXZlIjpmYWxzZSwicmVtZW1iZXIiOmZhbHNlLCJpYXQiOjE3NjM5NTkxMDIsImV4cCI6MTc2NDA0NTUwMn0.Pem_qogQMkeFvmRMg6sIhCc9uLC0md_gRFxWoxpkO2k")
          router.replace("/");
          return;
        }

        const data = await res.json();

        if (!data?.inOrg || !data?.orgId || !data?.user) {
          // tidak punya org di B2B
          router.replace("/");
          return;
        }

        // simpan ke zustand
        setContext({
          orgId: data.orgId,
          org: data.org,
          user: data.user,
          profile: data.profile ?? null,
        });

        // redirect ke dashboard org
        router.replace(`/b2b/${data.orgId}/dashboard`);
      } catch (err) {
        console.error("Failed to load B2B org context", err);
        router.replace("/");
      }
    };

    run();
  }, [router, setContext]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6 flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Checking your organisation access...
        </p>
      </Card>
    </div>
  );
}
