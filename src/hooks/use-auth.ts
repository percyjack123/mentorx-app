import { getUser, clearToken, clearUser } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export type UserRole = "admin" | "mentor" | "mentee" | "parent";

export function useAuth(requiredRole?: UserRole) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);

    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
      navigate(`/${currentUser.role}`);
    }
  }, [navigate, requiredRole]);

  const logout = () => {
    clearToken();
    clearUser();
    navigate("/login");
  };

  return { user, logout };
}