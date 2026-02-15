import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  GraduationCap,
  ScanFace,
  Bell,
  BarChart3,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingAnimations } from "@/components/landing/landing-animations";

const features = [
  {
    icon: ScanFace,
    title: "Face Recognition",
    description:
      "Mark attendance using advanced face recognition technology. Secure and accurate identification.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Students receive instant notifications when attendance sessions start. Never miss a class.",
    gradient: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Comprehensive attendance reports with charts, trends, and per-student breakdowns.",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: Clock,
    title: "Live Attendance Tracking",
    description:
      "Teachers see real-time updates as students mark attendance. Live counter and student list.",
    gradient: "from-orange-500/10 to-amber-500/10",
    iconColor: "text-orange-600",
  },
  {
    icon: Shield,
    title: "Anti-Spoofing",
    description:
      "Multi-frame capture and liveness detection prevents photo-based spoofing attempts.",
    gradient: "from-red-500/10 to-rose-500/10",
    iconColor: "text-red-600",
  },
  {
    icon: GraduationCap,
    title: "Course Management",
    description:
      "Create courses, manage timetables, enroll students, and track attendance all in one place.",
    gradient: "from-indigo-500/10 to-blue-500/10",
    iconColor: "text-indigo-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Register Your Face",
    description:
      "Sign up and register your face using your webcam or upload a photo. Quick one-time setup.",
    icon: ScanFace,
  },
  {
    number: "02",
    title: "Get Notified",
    description:
      "Receive real-time push notifications when your teacher starts an attendance session.",
    icon: Bell,
  },
  {
    number: "03",
    title: "Mark Attendance",
    description:
      "Simply look at your camera and your attendance is marked automatically. Done in seconds.",
    icon: CheckCircle2,
  },
];

const stats = [
  { value: "99.2%", label: "Recognition Accuracy" },
  { value: "<3s", label: "Verification Time" },
  { value: "3-Frame", label: "Anti-Spoofing" },
  { value: "Real-Time", label: "Notifications" },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">AttendAI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-chart-2/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-Powered Attendance System
            </div>

            <LandingAnimations />

            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              A modern attendance management system powered by face recognition
              for secure, fast, and accurate tracking. Built for educational
              institutions that value efficiency.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/sign-up">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/sign-in">Sign In to Dashboard</Link>
              </Button>
            </div>

            {/* Stats bar */}
            <div className="mx-auto max-w-2xl pt-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 rounded-2xl border bg-card/50 backdrop-blur-sm p-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Powerful tools for teachers and students to manage attendance
            effortlessly
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border bg-card p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}
              >
                <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Three simple steps
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-border" />
                )}
                <div className="relative text-center space-y-4 rounded-xl border bg-card p-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-2xl bg-primary p-12 text-center text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-chart-2/80" />
          <div className="relative space-y-6">
            <Users className="mx-auto h-12 w-12 opacity-80" />
            <h2 className="text-3xl sm:text-4xl font-bold">
              Ready to modernize attendance?
            </h2>
            <p className="mx-auto max-w-lg text-primary-foreground/80 text-lg">
              Join institutions using AI-powered face recognition for seamless
              attendance management.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="h-12 px-8 text-base"
              asChild
            >
              <Link href="/sign-up">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              AttendAI
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Clerk, and face-api.js
          </p>
        </div>
      </footer>
    </div>
  );
}
