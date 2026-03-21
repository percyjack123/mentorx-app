import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Bell, LogOut } from "lucide-react";
import { notifications } from "@/data/mockData";
import type { Notification } from "@/data/mockData";

interface NavbarProps {
  role: "admin" | "mentor" | "mentee";
  title: string;
}

export function Navbar({ role, title }: NavbarProps) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showNotifs, setShowNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = notifications.filter(n => n.role === role);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <h1 className="text-sm font-semibold font-display">{title}</h1>
      <div className="flex items-center gap-1">
        <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Toggle theme">
          {isDark ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setShowNotifs(!showNotifs)} className="p-2 rounded-lg hover:bg-accent transition-colors relative" title="Notifications">
            <Bell className="h-4 w-4 text-foreground" />
            {filtered.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-danger-foreground text-[10px] flex items-center justify-center font-bold">
                {filtered.length}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b">
                <h3 className="text-sm font-semibold">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.length > 0 ? filtered.map(n => (
                  <div key={n.id} className="p-3 border-b last:border-0 hover:bg-accent/50 transition-colors">
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                )) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={() => navigate("/login")} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Logout">
          <LogOut className="h-4 w-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}
