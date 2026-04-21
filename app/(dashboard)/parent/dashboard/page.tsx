import { requireParent } from "@/lib/auth";
import { User, UserPlus, Bell, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export default async function ParentDashboardPage() {
  await requireParent();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parent Portal</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your children's attendance and academic progress
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Link Your Child
            </CardTitle>
            <CardDescription>
              Enter your child's roll number and date of birth to link their account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-8 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">No children linked yet</p>
                <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
                  Link an account to start receiving attendance notifications.
                </p>
                <Button size="sm">Link Student Account</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-600" />
              Recent Notifications
            </CardTitle>
            <CardDescription>
              Stay updated with real-time class entry/exit.
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
