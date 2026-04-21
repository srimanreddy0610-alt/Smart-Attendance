"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex-1" />
      <span className="text-sm text-muted-foreground hidden sm:inline font-medium">
        {userName}
      </span>
      {mounted ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      )}
    </header>
  );
}
