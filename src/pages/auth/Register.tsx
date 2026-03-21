import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
          <GraduationCap className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold font-display gradient-text mb-2">MentorX</h1>
        <div className="rounded-2xl border bg-card p-8 shadow-lg mt-6">
          <h2 className="text-xl font-semibold font-display mb-4">Registration</h2>
          <p className="text-muted-foreground">Users are created by Admin.</p>
          <p className="text-muted-foreground mt-2 text-sm">Please contact your institution's administrator for account creation.</p>
          <Button onClick={() => navigate("/login")} variant="outline" className="mt-6">
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
