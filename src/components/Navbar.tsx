import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Bell, LogOut } from "lucide-react";
import { authApi, getUser, menteeApi, mentorApi, adminApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface NavbarProps {
  role: "admin" | "mentor" | "mentee" | "parent";
  title: string;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Fetch notifications from the right endpoint per role
async function fetchNotifications(role: string): Promise<Notification[]> {
  try {
    if (role === "mentee") return await menteeApi.getNotifications() as any;
    if (role === "mentor") return await mentorApi.getNotifications() as any;
    if (role === "admin")  return await adminApi.getNotifications() as any;
    // parent: no flat list endpoint — return []
    return [];
  } catch {
    return [];
  }
}

export function Navbar({ role, title }: NavbarProps) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  useEffect(() => {
    fetchNotifications(role).then(setNotifications);
    // Poll every 60s for new notifications
    const interval = setInterval(() => {
      fetchNotifications(role).then(setNotifications);
    }, 60_000);
    return () => clearInterval(interval);
  }, [role]);

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

  const handleLogout = () => {
    authApi.logout();
    navigate("/login");
  };

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // Best-effort mark as read on server
    try {
      if (role === "mentee") await menteeApi.markNotificationRead(id);
      else if (role === "mentor") await mentorApi.markNotificationRead(id);
    } catch { /* non-critical */ }
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div>
        <h1 className="text-sm font-semibold font-display">{title}</h1>
        {user && <p className="text-xs text-muted-foreground">{user.name}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          title="Toggle theme"
        >
          {isDark ? <Sun className="h-4 w-4 text-foreground" /> : <Moon className="h-4 w-4 text-foreground" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg hover:bg-accent transition-colors relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4 text-foreground" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-danger-foreground text-[10px] flex items-center justify-center font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unread > 0 && (
                  <span className="text-xs text-muted-foreground">{unread} unread</span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-3 border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer ${!n.read ? "bg-accent/20" : ""}`}
                    >
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          title="Logout"
        >
          <LogOut className="h-4 w-4 text-foreground" />
        </button>
      </div>
    </div>
  );
}