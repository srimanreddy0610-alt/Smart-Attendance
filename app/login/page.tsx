import Link from "next/link";
import { GraduationCap, Shield, Users, BookOpen } from "lucide-react";

const roles = [
  {
    id: "admin",
    name: "Administrator",
    icon: Shield,
    description: "Manage system settings, users, and overall administration.",
    href: "/sign-in",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  {
    id: "teacher",
    name: "Teacher",
    icon: BookOpen,
    description: "Manage courses, start attendance sessions, and view reports.",
    href: "/sign-in",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    id: "parent",
    name: "Parent",
    icon: Users,
    description: "View your child's attendance records and progress.",
    href: "/sign-in",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  {
    id: "student",
    name: "Student",
    icon: GraduationCap,
    description: "Mark your attendance and view your course statistics.",
    href: "/sign-in",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Select your role</h1>
          <p className="text-muted-foreground text-lg">
            Choose your portal to continue to the system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Link
              key={role.id}
              href={role.href}
              className={`group relative flex items-start gap-4 p-6 rounded-2xl border bg-card transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${role.color}`}
            >
              <div className={`p-3 rounded-xl bg-background ${role.color}`}>
                <role.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  {role.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
