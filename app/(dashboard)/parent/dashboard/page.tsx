import { requireParent } from "@/lib/auth";
import { User, Bell, Search, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { LinkStudentModal } from "@/components/parent/link-student-modal";
import { getDb } from "@/lib/db";
import { Parent } from "@/lib/db/schema";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function ParentDashboardPage() {
  const user = await requireParent();
  await getDb();

  const parentData = await Parent.findOne({ user: user._id })
    .populate({
      path: "linkedStudents",
      populate: { path: "user", select: "firstName lastName email" }
    });

  const linkedStudents = parentData?.linkedStudents || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your children&apos;s attendance and academic progress
          </p>
        </div>
        <LinkStudentModal 
          trigger={
            <Button className="w-full md:w-auto">
              <User className="mr-2 h-4 w-4" />
              Link New Child
            </Button>
          } 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Linked Students
            </CardTitle>
            <CardDescription>
              {linkedStudents.length > 0 
                ? `You have ${linkedStudents.length} linked student account(s).`
                : "No student accounts linked yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkedStudents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {linkedStudents.map((student: any) => (
                  <Card key={student._id.toString()} className="overflow-hidden border-muted/60 bg-muted/20">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="bg-background">
                          {student.rollNumber}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg">
                        {student.user.firstName} {student.user.lastName}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        {student.department} • Semester {student.semester}
                      </p>
                      <Link href={`/parent/student/${student._id}`}>
                        <Button variant="secondary" size="sm" className="w-full">
                          View Progress
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">No children linked yet</p>
                <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                  Link an account using your child&apos;s roll number and verify via OTP.
                </p>
                <LinkStudentModal />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-600" />
              Recent Notifications
            </CardTitle>
            <CardDescription>
              Real-time class entry/exit alerts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <p className="text-xs italic">No new notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

