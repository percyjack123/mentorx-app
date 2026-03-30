import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { GraduationCap, Loader2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { authApi, type RegisterPayload } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

type Role = "mentee" | "mentor" | "parent";

export default function Register() {
  const navigate = useNavigate();

  // shared
  const [role, setRole]         = useState<Role>("mentee");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [department, setDep]    = useState("");
  const [loading, setLoading]   = useState(false);

  // mentee-only
  const [semester, setSemester]       = useState("1");
  const [mentorEmail, setMentorEmail] = useState("");

  // parent-only
  const [childEmail, setChildEmail]       = useState("");
  const [relationship, setRelationship]   = useState("Parent");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;

    setLoading(true);
    try {
      const payload: RegisterPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        department: department.trim() || undefined,
      };

      if (role === "mentee") {
        payload.semester    = parseInt(semester, 10);
        payload.mentorEmail = mentorEmail.trim() || undefined;
      }

      if (role === "parent") {
        if (!childEmail.trim()) {
          toast({ title: "Child email required", description: "Enter your child's registered email.", variant: "destructive" });
          setLoading(false);
          return;
        }
        payload.childEmail    = childEmail.trim().toLowerCase();
        payload.relationship  = relationship;
      }

      const res = await authApi.register(payload);

      const toastMessages: Record<Role, string> = {
        mentor : "Registration submitted! Check your email for an OTP, then await admin approval.",
        mentee : "Account created! Check your email for an OTP to verify, then a mentor must accept you.",
        parent : "Account created! Check your email for an OTP to verify your address.",
      };

      toast({ title: "Almost there!", description: toastMessages[role] });

      // Always redirect to OTP page
      navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}&role=${role}`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<Role, string> = {
    mentee : "Student / Mentee",
    mentor : "Mentor / Faculty",
    parent : "Parent / Guardian",
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
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          <h2 className="text-xl font-semibold font-display mb-6">Sign Up</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Role picker */}
            <div className="space-y-2">
              <Label>I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(roleLabels) as [Role, string][]).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Common fields */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Your full name"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required minLength={6}
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
              <Label htmlFor="department">Department</Label>
              <Input id="department" placeholder="e.g. Computer Science"
                value={department} onChange={e => setDep(e.target.value)} />
            </div>

            {/* ── MENTEE extras ── */}
            {role === "mentee" && (
              <>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map(s => (
                        <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mentorEmail">Preferred Mentor Email <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="mentorEmail" type="email" placeholder="mentor@university.edu"
                    value={mentorEmail} onChange={e => setMentorEmail(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    If provided, a connection request will be sent to this mentor automatically.
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    After email verification, a mentor must accept your request before you can log in.
                  </p>
                </div>
              </>
            )}

            {/* ── MENTOR extras ── */}
            {role === "mentor" && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Mentor accounts require admin approval after email verification before you can log in.
                </p>
              </div>
            )}

            {/* ── PARENT extras ── */}
            {role === "parent" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="childEmail">Child's Registered Email <span className="text-destructive">*</span></Label>
                  <Input id="childEmail" type="email" placeholder="child@university.edu"
                    value={childEmail} onChange={e => setChildEmail(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">
                    Your child must have already registered and verified their email.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Father","Mother","Guardian","Sibling","Other"].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account...</>
                : <><span>Create Account</span><ChevronRight className="h-4 w-4 ml-1" /></>
              }
            </Button>
          </form>

          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">Already have an account? </span>
            <button onClick={() => navigate("/login")} className="text-sm text-primary hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}