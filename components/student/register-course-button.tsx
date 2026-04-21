"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";

interface RegisterCourseButtonProps {
  courseId: string;
}

export function RegisterCourseButton({ courseId }: RegisterCourseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleRegister() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/students/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register");
      }

      toast.success("Successfully registered for course!");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleRegister} disabled={isLoading} size="sm">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <PlusCircle className="h-4 w-4 mr-2" />
      )}
      Register
    </Button>
  );
}
