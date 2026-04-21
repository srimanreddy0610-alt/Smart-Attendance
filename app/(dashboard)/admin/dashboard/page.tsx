import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, Student, Course, AttendanceSession } from "@/lib/db/schema";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Activity,
  UserCheck,
  ShieldCheck,
  LayoutGrid
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  await requireAdmin();
  await getDb();

  const [
    totalUsers,
    totalStudents,
    totalTeachers,
    totalCourses,
    activeSessions
  ] = await Promise.all([
    User.countDocuments(),
    Student.countDocuments(),
    User.countDocuments({ role: "teacher" }),
    Course.countDocuments(),
    AttendanceSession.countDocuments({ status: "active" })
  ]);

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Teachers",
      value: totalTeachers,
      icon: ShieldCheck,
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      title: "Students",
      value: totalStudents,
      icon: GraduationCap,
      color: "bg-purple-500/10 text-purple-600",
    },
    {
      title: "Courses",
      value: totalCourses,
      icon: BookOpen,
      color: "bg-orange-500/10 text-orange-600",
    },
    {
      title: "Live Sessions",
      value: activeSessions,
      icon: Activity,
      color: "bg-pink-500/10 text-pink-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground mt-2">
          System-wide performance and user statistics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/admin/teachers" className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Manage Teachers</span>
            </Link>
            <Link href="/admin/streams" className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Manage Streams</span>
            </Link>
            <button className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">Manage Courses</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">System Settings</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-xl font-bold mb-4">Pending Approvals</h2>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <UserCheck className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">No pending approvals at the moment</p>
          </div>
        </div>
      </div>
    </div>
  );
}

