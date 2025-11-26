"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useB2BOrgStore } from "@/store/useB2BOrgStore";
import { deleteCookie } from "cookies-next";

export function Header() {
  const router = useRouter();
  const { org, user, clear } = useB2BOrgStore();

  const handleLogout = () => {
    // hapus cookies seperti di academy
    deleteCookie("accessToken");
    deleteCookie("refreshToken");
    if (typeof window !== "undefined") {
      localStorage.removeItem("latestLoginTime");
    }

    clear?.();
    router.push("/login");
  };

  const displayName = user?.name || "User";
  const displaySub = user?.email || user?.username || "";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-8">
      {/* KIRI: Logo + info org */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo besar (desktop) */}
          <div className="hidden sm:block">
            <Image
              src="/b2b/images/logo.webp"
              alt="Atlaz English Test"
              width={160}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          {/* Logo simple (mobile) */}
          <div className="sm:hidden">
            <Image
              src="/b2b/images/logo.webp"
              alt="Atlaz"
              width={28}
              height={28}
              className="h-9 w-9"
            />
          </div>
        </Link>

        <div className="hidden md:block">
          <p className="text-xs text-muted-foreground leading-tight">
            Admin Dashboard
          </p>
          <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[260px]">
            {org?.name || "B2B Organisation"}
          </p>
        </div>
      </div>

      {/* KANAN: Notif + user dropdown */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="link"
              className="gap-2 px-2 py-1 h-auto rounded-full"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {/* Kalau nanti ada avatar URL, ganti ini */}
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium leading-tight truncate">
                  {displayName}
                </p>
                {displaySub && (
                  <p className="text-xs text-muted-foreground leading-tight truncate">
                    {displaySub}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
