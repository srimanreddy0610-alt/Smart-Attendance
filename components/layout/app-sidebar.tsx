"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ScanFace,
  History,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const studentNavItems = [
  {
    title: "Dashboard",
    href: "/student/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Courses",
    href: "/student/courses",
    icon: BookOpen,
  },
  {
    title: "Attendance History",
    href: "/student/attendance",
    icon: History,
  },
  {
    title: "Face Enrollment",
    href: "/student/face-enrollment",
    icon: ScanFace,
  },
];

const teacherNavItems = [
  {
    title: "Dashboard",
    href: "/teacher/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Courses",
    href: "/teacher/courses",
    icon: BookOpen,
  },
  {
    title: "Reports",
    href: "/teacher/reports",
    icon: BarChart3,
  },
];

interface AppSidebarProps {
  userRole: string;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = userRole === "teacher" ? teacherNavItems : studentNavItems;
  const roleLabel = userRole === "teacher" ? "Teacher" : "Student";

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight">AttendAI</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">
              {roleLabel} Portal
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70 px-3 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.href}
                        className="group/nav-item relative"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t px-5 py-3">
        <p className="text-[11px] text-muted-foreground/60 font-medium">
          Attendance Management v1.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
