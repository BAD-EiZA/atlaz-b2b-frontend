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
      .find((row) => row.startsWith("refreshToken="))
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
       setCookie("refreshToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzOTQsIm5hbWUiOiJFcnphIEIyQiIsInVzZXJuYW1lIjoiZXJ6YS5hZG1pbkBiMmIuY29tIiwiZW1haWwiOiJlcnphLmFkbWluQGIyYi5jb20iLCJyb2xlX2lkIjoyLCJzdGF0dXMiOnRydWUsInJlZmVycmFsX2NvZGUiOiJCQThDR1FLIiwiaXNCb29rQWN0aXZlIjpmYWxzZSwicmVtZW1iZXIiOmZhbHNlLCJpYXQiOjE3NjU0Mzg0MDYsImV4cCI6MTc2NTUyNDgwNn0.h2QX6zaSuSkBSTL5sj2LOea7ttbkNc1i5z320pB3XKE")
      // tidak login → balik ke homepage
      // router.replace("https://academy.hiatlaz.com/");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(
          `https://api-academy.hiatlaz.com/b2b-admin/v1/b2b/me/org`,
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
          setCookie("refreshToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzOTQsIm5hbWUiOiJFcnphIEIyQiIsInVzZXJuYW1lIjoiZXJ6YS5hZG1pbkBiMmIuY29tIiwiZW1haWwiOiJlcnphLmFkbWluQGIyYi5jb20iLCJyb2xlX2lkIjoyLCJzdGF0dXMiOnRydWUsInJlZmVycmFsX2NvZGUiOiJCQThDR1FLIiwiaXNCb29rQWN0aXZlIjpmYWxzZSwicmVtZW1iZXIiOmZhbHNlLCJpYXQiOjE3NjU0Mzg0MDYsImV4cCI6MTc2NTUyNDgwNn0.h2QX6zaSuSkBSTL5sj2LOea7ttbkNc1i5z320pB3XKE")
          // router.replace("https://academy.hiatlaz.com/");
          return;
        }

        const data = await res.json();

        if (!data?.inOrg || !data?.orgId || !data?.user) {
          // tidak punya org di B2B
          // router.replace("https://academy.hiatlaz.com/");
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
        router.replace(`https://academy.hiatlaz.com/b2b/${data.orgId}/dashboard/`);
      } catch (err) {
        console.error("Failed to load B2B org context", err);
        router.replace("https://academy.hiatlaz.com/");
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
