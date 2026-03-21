// src/hooks/use-auth.ts
import { getUser, clearToken, clearUser } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function useAuth(requiredRole?: "admin" | "mentor" | "mentee") {
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (requiredRole && user.role !== requiredRole) {
      navigate(`/${user.role}`);
    }
  }, []);

  const logout = () => {
    clearToken();
    clearUser();
    navigate("/login");
  };

  return { user, logout };
}
