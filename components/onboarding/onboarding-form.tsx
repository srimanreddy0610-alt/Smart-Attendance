"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { GraduationCap, Loader2, Check, ChevronsUpDown } from "lucide-react";
import {
  studentOnboardingSchema,
  type StudentOnboardingValues,
} from "@/lib/validations/student";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxTrigger,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  useComboboxAnchor
} from "@/components/ui/combobox";

const departments = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
];

const sections = ["A", "B", "C", "D"];

export function OnboardingForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [streams, setStreams] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const anchor = useComboboxAnchor();

  const form = useForm<StudentOnboardingValues>({
    resolver: zodResolver(studentOnboardingSchema),
    defaultValues: {
      rollNumber: "",
      department: "",
      streamId: "",
      semester: 1,
      section: "",
      courseIds: [],
    },
  });

  const selectedStream = form.watch("streamId");
  const selectedSection = form.watch("section");

  useEffect(() => {
    fetch("/api/streams")
      .then((res) => res.json())
      .then(setStreams)
      .catch(() => toast.error("Failed to load streams"));
  }, []);

  useEffect(() => {
    if (selectedStream) {
      fetch(`/api/courses?streamId=${selectedStream}&section=${selectedSection}`)
        .then((res) => res.json())
        .then(setAvailableCourses)
        .catch(() => toast.error("Failed to load courses"));
    }
  }, [selectedStream, selectedSection]);

  async function onSubmit(values: StudentOnboardingValues) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create profile");
      }

      toast.success("Profile created successfully!");
      router.push("/student/face-enrollment");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-2xl border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-inner">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight">Complete Your Profile</CardTitle>
        <CardDescription className="text-base mt-2">
          Fill in your details to get started with the attendance system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="rollNumber"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Roll Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. CS2021001" className="h-11 w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="streamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stream</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Select stream" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {streams.map((stream) => (
                          <SelectItem key={stream._id} value={stream._id}>
                            {stream.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((sem) => (
                          <SelectItem key={sem} value={String(sem)}>
                            Semester {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            Section {sec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="courseIds"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Courses</FormLabel>
                    <FormControl>
                      <Combobox
                        multiple
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <ComboboxTrigger className="flex h-auto min-h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                          <ComboboxChips ref={anchor} className="border-none p-0 focus-within:ring-0">
                            {field.value.map((id) => (
                              <ComboboxChip key={id} value={id}>
                                {availableCourses.find(c => c._id === id)?.name || id}
                              </ComboboxChip>
                            ))}
                            <ComboboxChipsInput placeholder="Search courses..." className="h-7" />
                          </ComboboxChips>
                        </ComboboxTrigger>
                        <ComboboxContent anchor={anchor}>
                          <ComboboxList>
                            {availableCourses.map((course) => (
                              <ComboboxItem key={course._id} value={course._id}>
                                {course.name} ({course.code})
                              </ComboboxItem>
                            ))}
                            {availableCourses.length === 0 && (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No courses available for this Stream/Section.
                              </div>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg font-semibold mt-4 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Complete Onboarding
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
