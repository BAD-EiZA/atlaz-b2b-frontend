"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { BarChart3, Users, Settings, FileText, Building } from "lucide-react";
import { useDashboard } from "@/app/actions/hooks/b2b/useDashboard";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useB2BOrgStore } from "@/store/useB2BOrgStore";

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const { orgId, user } = useB2BOrgStore();
  useEffect(() => {
    if (!orgId || !user) {
      // kalau belum ada context di store → balik ke halaman cek
      router.replace("/b2b/check");
      return;
    }

    if (String(orgId) !== String(params.orgId)) {
      // kalau orgId di URL beda dengan orgId di store, normalkan
      router.replace(`/b2b/${orgId}/dashboard`);
    }
  }, [orgId, user, params.orgId, router]);
  const { data, isLoading, error } = useDashboard(orgId!);

  // kalau belum siap, boleh tampilkan skeleton / loading
  if (!orgId || !user || String(orgId) !== String(params.orgId)) {
    return null;
  }

  const quickMenuItems = [
    {
      href: `/b2b/${orgId}/organization`,
      icon: Building,
      label: "Organization",
      description: "Manage org profile",
    },
    {
      href: `/b2b/${orgId}/quota`,
      icon: Settings,
      label: "Quota & Purchase",
      description: "Buy test quotas",
    },
    {
      href: `/b2b/${orgId}/students`,
      icon: Users,
      label: "Students",
      description: "Manage students",
    },
    {
      href: `/b2b/${orgId}/results`,
      icon: FileText,
      label: "Test Results",
      description: "View reports",
    },
  ];

  const stats = [
    {
      label: "Active Students",
      value:
        data?.activeStudents != null
          ? data.activeStudents.toLocaleString()
          : "-",
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Tests Conducted",
      value:
        data?.testsConducted != null
          ? data.testsConducted.toLocaleString()
          : "-",
      icon: BarChart3,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Quotas Used",
      value:
        data?.quotas != null
          ? `${data.quotas.used.toLocaleString()} / ${data.quotas.total.toLocaleString()}`
          : "- / -",
      icon: Settings,
      color: "bg-orange-100 text-orange-600",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your prediction test organization
        </p>
      </div>

      {/* QUICK MENU */}
      <div className="mb-12">
        <h2 className="mb-6 text-lg font-semibold text-foreground">
          Quick Menu
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full cursor-pointer p-6 transition-all hover:border-primary hover:shadow-lg">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 rounded-lg bg-blue-50 p-4 transition-colors group-hover:bg-blue-100">
                    <item.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* STATUS */}
      {isLoading && (
        <p className="mb-4 text-sm text-muted-foreground">
          Loading dashboard...
        </p>
      )}

      {error && !isLoading && (
        <p className="mb-4 text-sm text-red-500">Failed to load dashboard</p>
      )}

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
