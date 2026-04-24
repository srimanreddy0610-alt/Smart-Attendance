"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { GraduationCap, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      toast.success("Welcome back!");
      router.push(data.redirect || "/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-950 overflow-hidden">
      {/* Brand Side - Hidden on mobile */}
      <div className="relative hidden lg:flex flex-col bg-zinc-900 p-12 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        
        {/* Animated background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl" />

        <Link href="/" className="relative z-10 flex items-center gap-2.5 mb-24">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight">Smart Attend</span>
        </Link>

        <div className="relative z-10 mt-auto">
          <blockquote className="space-y-4">
            <p className="text-3xl font-medium leading-tight tracking-tight">
              &quot;The most advanced and secure way to manage academic attendance with AI.&quot;
            </p>
            <footer className="text-zinc-400 text-lg">
              Trusted by 100+ Educational Institutions
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent_50%)] lg:hidden" />
        
        <div className="w-full max-w-sm space-y-8 relative z-10">
          <div className="space-y-2 text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
                 <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <GraduationCap className="h-7 w-7 text-primary" />
                </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Sign In</h1>
            <p className="text-zinc-400">
              Welcome back! Please enter your details.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Email Address</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-500 transition-colors group-focus-within:text-primary" />
                          <Input 
                            placeholder="name@university.com" 
                            {...field} 
                            className="h-11 pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:ring-primary focus:border-primary transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Password</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-500 transition-colors group-focus-within:text-primary" />
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            {...field} 
                            className="h-11 pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:ring-primary focus:border-primary transition-all"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold transition-all shadow-lg shadow-primary/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                {isLoading ? "Signing in..." : "Continue"}
              </Button>
            </form>
          </Form>

          <footer className="text-center text-sm">
            <span className="text-zinc-500">Need help accessing your account? </span>
            <Link href="/" className="text-primary hover:underline font-medium ml-1">
              Contact Support
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

