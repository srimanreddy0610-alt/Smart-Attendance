import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { User, Course } from "@/lib/db/schema";
import { 
  Search,
  MoreVertical,
  Plus,
  ArrowLeft,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminTeachersPage() {
  await requireAdmin();
  await getDb();

  const teachers = await User.find({ role: "teacher" }).sort({ createdAt: -1 }).lean();
  
  interface TeacherDoc {
    _id: any;
    firstName: string;
    lastName: string;
    email: string;
  }

  // For each teacher, count how many courses they have
  const teachersWithCourses = await Promise.all((teachers as unknown as TeacherDoc[]).map(async (t) => {
    const courseCount = await Course.countDocuments({ teacherId: t._id });
    return {
      ...t,
      id: t._id.toString(),
      courseCount
    };
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Teacher Management</h1>
            <p className="text-muted-foreground text-sm">
              Overview and assignment of teaching staff
            </p>
          </div>
        </div>
        <Button className="rounded-xl shadow-xs">
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search teachers by name or email..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <Button variant="outline" className="rounded-xl">
          Filter
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teacher</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Courses</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachersWithCourses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <ShieldCheck className="h-10 w-10 mb-2 opacity-20" />
                      <p>No teachers found in the system</p>
                    </div>
                  </td>
                </tr>
              ) : (
                teachersWithCourses.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {teacher.firstName?.[0]?.toUpperCase() || "T"}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {teacher.firstName} {teacher.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {teacher.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none px-2 py-0">
                        Active
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{teacher.courseCount}</span>
                        <span className="text-xs text-muted-foreground">courses</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 rounded-xl border bg-linear-to-br from-primary/5 to-transparent flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Unassigned Teachers</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Teachers who aren&apos;t currently managing any courses or sections.
            </p>
            <Button size="sm" variant="outline" className="rounded-lg shadow-xs">
              View List
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

