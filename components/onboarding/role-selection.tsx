"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  ShieldCheck, 
  Users, 
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { toast } from "sonner";

interface RoleSelectionProps {
  onSelectStudent: () => void;
}

export function RoleSelection({ onSelectStudent }: RoleSelectionProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleRoleSelect(role: string) {
    if (role === "student") {
      onSelectStudent();
      return;
    }

    setIsLoading(role);
    try {
      const res = await fetch("/api/auth/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error("Failed to update role");

      toast.success(`Role updated to ${role}`);
      router.push(`/${role}/dashboard`);
    } catch (error) {
      toast.error("Failed to update role. Please try again.");
    } finally {
      setIsLoading(null);
    }
  }

  const roles = [
    {
      id: "student",
      title: "Student",
      description: "Mark attendance, view your history, and enroll in courses.",
      icon: GraduationCap,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      id: "teacher",
      title: "Teacher",
      description: "Manage courses, take attendance, and view reports.",
      icon: ShieldCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      id: "parent",
      title: "Parent",
      description: "Monitor your child's attendance and academic progress.",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="max-w-4xl w-full animate-in fade-in zoom-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-linear-to-r from-primary to-blue-600">
          Welcome to AttendAI
        </h1>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          To get started, please select your role in the system.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {roles.map((role) => (
          <Card 
            key={role.id} 
            className="relative group overflow-hidden cursor-pointer hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
            onClick={() => handleRoleSelect(role.id)}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${role.bgColor} rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-150 transition-transform duration-500`} />
            <CardHeader>
              <div className={`w-12 h-12 rounded-xl ${role.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300`}>
                <role.icon className={`h-6 w-6 ${role.color}`} />
              </div>
              <CardTitle className="text-xl font-bold">{role.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {role.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="ghost" 
                className="w-full justify-between group/btn px-0 hover:bg-transparent"
                disabled={!!isLoading}
              >
                <span className="font-semibold text-primary">Get Started</span>
                {isLoading === role.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
