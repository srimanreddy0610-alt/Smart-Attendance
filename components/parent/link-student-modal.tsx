"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot, 
  InputOTPSeparator 
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { UserPlus, Mail, Loader2, Key } from "lucide-react";
import { useRouter } from "next/navigation";

export function LinkStudentModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [identifier, setIdentifier] = useState("");
  const [studentId, setStudentId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [obfuscatedEmail, setObfuscatedEmail] = useState("");
  const router = useRouter();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;

    setLoading(true);
    try {
      const res = await fetch("/api/parent/link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request OTP");
      }

      setStudentId(data.studentId);
      setObfuscatedEmail(data.email);
      setStep("verify");
      toast.success("OTP sent successfully to " + data.email);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const res = await fetch("/api/parent/link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      toast.success("Student linked successfully!");
      setOpen(false);
      router.refresh();
      // Reset state for next time
      setStep("request");
      setIdentifier("");
      setOtp("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Link Student Account</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Link Your Child
          </DialogTitle>
          <DialogDescription>
            {step === "request" 
              ? "Enter your child's roll number or student email to request a link."
              : `Enter the 6-digit code sent to ${obfuscatedEmail}`}
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Roll Number (e.g. 123456) or Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                We'll send a verification code to the student's email address.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !identifier}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Verification Code
            </Button>
          </form>
        ) : (
          <div className="space-y-6 py-4 flex flex-col items-center">
            <div className="space-y-2 text-center">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  onComplete={handleVerifyOtp}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The code expires in 10 minutes.
              </p>
            </div>
            
            <div className="flex flex-col w-full gap-2">
              <Button 
                onClick={handleVerifyOtp} 
                className="w-full" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Verify & Link Account
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep("request")} 
                disabled={loading}
              >
                Back to search
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
