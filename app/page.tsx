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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: ScanFace,
    title: "Face Recognition",
    description:
      "Mark attendance using advanced face recognition technology. Secure and accurate identification.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Students receive instant notifications when attendance sessions start. Never miss a class.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Comprehensive attendance reports with charts, trends, and per-student breakdowns.",
  },
  {
    icon: Clock,
    title: "Live Attendance Tracking",
    description:
      "Teachers see real-time updates as students mark attendance. Live counter and student list.",
  },
  {
    icon: Shield,
    title: "Anti-Spoofing",
    description:
      "Multi-frame capture and liveness detection prevents photo-based spoofing attempts.",
  },
  {
    icon: GraduationCap,
    title: "Course Management",
    description:
      "Create courses, manage timetables, enroll students, and track attendance all in one place.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/student/dashboard");
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <span className="font-bold text-xl">AttendAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Smart Attendance with{" "}
            <span className="text-primary">Face Recognition</span>
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            A modern attendance management system that uses face recognition
            technology for secure, fast, and accurate attendance tracking. Built
            for educational institutions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">Features</h2>
          <p className="text-muted-foreground mt-2">
            Everything you need for efficient attendance management
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">How It Works</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              1
            </div>
            <h3 className="font-semibold text-lg">Register</h3>
            <p className="text-sm text-muted-foreground">
              Sign up and register your face using your webcam or upload a photo
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              2
            </div>
            <h3 className="font-semibold text-lg">Get Notified</h3>
            <p className="text-sm text-muted-foreground">
              Receive real-time notifications when your teacher starts an
              attendance session
            </p>
          </div>
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              3
            </div>
            <h3 className="font-semibold text-lg">Mark Attendance</h3>
            <p className="text-sm text-muted-foreground">
              Simply look at your camera and your attendance is marked
              automatically
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Attendance Management System - Built with Next.js, Clerk, and face-api.js</p>
        </div>
      </footer>
    </div>
  );
}
