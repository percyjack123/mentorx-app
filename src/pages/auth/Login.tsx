import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await authApi.login(email, password);

      // Verify selected role matches actual role from DB
      if (role && user.role !== role) {
        toast({
          title: "Wrong role selected",
          description: `Your account is registered as ${user.role}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({ title: "Welcome back!", description: `Signed in as ${user.name}` });
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "mentor") navigate("/mentor");
      else navigate("/mentee");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold font-display gradient-text">MentorX</h1>
          <p className="text-muted-foreground mt-2">AI-Powered Mentor-Mentee Platform</p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-lg">
          <h2 className="text-xl font-semibold font-display mb-6">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="mentee">Mentee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground"
              disabled={!role || loading}
            >
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
                : "Sign In"
              }
            </Button>
          </form>
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-primary hover:underline">Forgot password?</a>
          </div>
          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">Don't have an account? </span>
            <button onClick={() => navigate("/register")} className="text-sm text-primary hover:underline">Register</button>
          </div>
        </div>
      </div>
    </div>
  );
}