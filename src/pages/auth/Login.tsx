import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, Eye, EyeOff, AlertCircle, Clock } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import type { UserRole } from "@/hooks/use-auth";

// Maps the ?notice= query param to a friendly banner
const NOTICES: Record<string, { icon: React.ReactNode; title: string; body: string; color: string }> = {
  pending_mentor: {
    icon  : <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    title : "Waiting for mentor approval",
    body  : "Your email is verified. A mentor must accept your connection request before you can log in.",
    color : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  },
  pending_admin: {
    icon  : <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
    title : "Waiting for admin approval",
    body  : "Your email is verified. An admin will review your mentor registration shortly.",
    color : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  },
  verified: {
    icon  : <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />,
    title : "Email verified",
    body  : "Your email has been confirmed. You can now log in.",
    color : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  },
};

export default function Login() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const notice        = params.get("notice") ?? "";

  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [role, setRole]       = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast({ title: "Select your role", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { user } = await authApi.login(email.trim().toLowerCase(), password);

      // Role cross-check: catch accidental wrong-role selection
      if (user.role !== role) {
        toast({
          title       : "Wrong role selected",
          description : `Your account is registered as "${user.role}". Please select the correct role.`,
          variant     : "destructive",
        });
        setLoading(false);
        return;
      }

      toast({ title: `Welcome back, ${user.name}!` });

      const routes: Record<UserRole, string> = {
        admin  : "/admin",
        mentor : "/mentor",
        mentee : "/mentee",
        parent : "/parent",
      };
      navigate(routes[user.role as UserRole] ?? "/mentee");

    } catch (err) {
      const raw = err instanceof Error ? err.message : "";

      // Friendly messages for known gate errors
      if (raw.includes("not verified") || raw.includes("EMAIL_NOT_VERIFIED")) {
        toast({
          title       : "Email not verified",
          description : "Check your inbox for the OTP and verify your email first.",
          variant     : "destructive",
        });
      } else if (raw.includes("pending mentor") || raw.includes("MENTEE_PENDING_APPROVAL")) {
        toast({
          title       : "Pending mentor approval",
          description : "A mentor must accept your request before you can log in.",
          variant     : "destructive",
        });
      } else if (raw.includes("pending admin") || raw.includes("MENTOR_PENDING_APPROVAL")) {
        toast({
          title       : "Pending admin approval",
          description : "Your mentor registration is still under review.",
          variant     : "destructive",
        });
      } else {
        toast({
          title       : "Login failed",
          description : raw || "Invalid email or password",
          variant     : "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const noticeData = NOTICES[notice];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">MentorX</h1>
          <p className="text-muted-foreground mt-2">AI-Powered Mentor-Mentee Platform</p>
        </div>

        {/* Post-registration notice banners */}
        {noticeData && (
          <div className={`rounded-xl border p-4 mb-4 flex gap-3 ${noticeData.color}`}>
            {noticeData.icon}
            <div>
              <p className="text-sm font-medium">{noticeData.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{noticeData.body}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          <h2 className="text-xl font-semibold font-display mb-6">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" placeholder="you@university.edu"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPass(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={v => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="mentor">Mentor / Faculty</SelectItem>
                  <SelectItem value="mentee">Student / Mentee</SelectItem>
                  <SelectItem value="parent">Parent / Guardian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground"
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</>
                : "Sign In"
              }
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </button>
            <div>
              <span className="text-sm text-muted-foreground">No account? </span>
              <button onClick={() => navigate("/register")} className="text-sm text-primary hover:underline">
                Register
              </button>
            </div>
          </div>
        </div>

        {/* Dev credentials */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 rounded-xl border bg-muted/50 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Dev credentials (password: password123)</p>
            <p>Admin:   admin@mentorx.edu</p>
            <p>Mentor:  suresh.menon@mentorx.edu</p>
            <p>Student: student1@mentorx.edu</p>
            <p>Parent:  parent1@mentorx.edu</p>
          </div>
        )}
      </div>
    </div>
  );
}