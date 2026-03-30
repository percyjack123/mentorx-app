import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, Loader2, Mail, RefreshCw } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/** 6-box OTP input */
function OtpInput({ value, onChange, disabled }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits  = value.padEnd(6, " ").split("").slice(0, 6);

  const focus = (idx: number) => inputs.current[idx]?.focus();

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.map((d, i) => (i === idx ? " " : d)).join("").trimEnd();
      onChange(next);
      if (idx > 0) focus(idx - 1);
    } else if (e.key === "ArrowLeft" && idx > 0) {
      focus(idx - 1);
    } else if (e.key === "ArrowRight" && idx < 5) {
      focus(idx + 1);
    }
  };

  const handleChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    // paste support: fill from this position
    const chars = raw.slice(0, 6 - idx).split("");
    const next  = [...digits];
    chars.forEach((ch, i) => { next[idx + i] = ch; });
    onChange(next.join("").trim());
    const jumpTo = Math.min(idx + chars.length, 5);
    setTimeout(() => focus(jumpTo), 0);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    setTimeout(() => focus(Math.min(pasted.length, 5)), 0);
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onFocus={e => e.target.select()}
          className={[
            "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-background",
            "transition-all outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            d.trim() ? "border-primary/60" : "border-border",
            "disabled:opacity-50",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export default function VerifyEmail() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const emailParam    = params.get("email") ?? "";
  const roleParam     = params.get("role")  ?? "mentee";

  const [otp, setOtp]           = useState("");
  const [email, setEmail]       = useState(emailParam);
  const [submitting, setSub]    = useState(false);
  const [resending, setResend]  = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otp.replace(/\s/g, "");
    if (clean.length !== 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }
    setSub(true);
    try {
      const res = await authApi.verifyEmail({ email: email.toLowerCase(), otp: clean });
      toast({ title: "Email verified!", description: res.message ?? "Your email has been confirmed." });

      // Route based on role-specific next step
      if (roleParam === "mentee") {
        navigate("/login?notice=pending_mentor");
      } else if (roleParam === "mentor") {
        navigate("/login?notice=pending_admin");
      } else {
        navigate("/login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast({ title: "Verification failed", description: msg, variant: "destructive" });
    } finally {
      setSub(false);
    }
  };

  const handleResend = async () => {
    if (!email) { toast({ title: "Enter your email first", variant: "destructive" }); return; }
    setResend(true);
    try {
      await authApi.resendOtp({ email: email.toLowerCase() });
      toast({ title: "OTP resent", description: "Check your inbox for the new 6-digit code." });
      setOtp("");
      setCountdown(60);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend OTP";
      toast({ title: "Resend failed", description: msg, variant: "destructive" });
    } finally {
      setResend(false);
    }
  };

  const roleHints: Record<string, string> = {
    mentee : "After verification, a mentor must accept your connection request before you can log in.",
    mentor : "After verification, an admin will review and approve your registration.",
    parent : "After verification, you can log in to view your child's progress.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">MentorX</h1>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-lg space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-semibold font-display">Verify your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{emailParam || "your email"}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {/* Email (editable if not pre-filled) */}
            {!emailParam && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* OTP boxes */}
            <OtpInput value={otp} onChange={setOtp} disabled={submitting} />

            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground"
              disabled={submitting || otp.replace(/\s/g, "").length < 6}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</>
                : "Verify Email"
              }
            </Button>
          </form>

          {/* Resend */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resending || countdown > 0}
              className="text-primary gap-1.5"
            >
              {resending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending...</>
                : countdown > 0
                  ? `Resend in ${countdown}s`
                  : <><RefreshCw className="h-3.5 w-3.5" />Resend OTP</>
              }
            </Button>
          </div>

          {/* Role-specific hint */}
          {roleHints[roleParam] && (
            <div className="rounded-lg bg-muted/50 border p-3">
              <p className="text-xs text-muted-foreground text-center">
                {roleHints[roleParam]}
              </p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-primary hover:underline"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}