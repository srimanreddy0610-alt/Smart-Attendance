import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { AIChat } from "@/components/student/ai-chat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar userRole={user.role} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader userName={userName} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      {user.role === "student" && <AIChat />}
    </SidebarProvider>
  );
}
