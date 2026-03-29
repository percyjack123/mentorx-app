import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Bell,
  Calendar,
  BookOpen,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth"; // ✅ ADDED

const items = [
  { title: "Dashboard", url: "/parent", icon: LayoutDashboard },
  { title: "My Children", url: "/parent/children", icon: Users },
  { title: "Notifications", url: "/parent/notifications", icon: Bell },
  { title: "Meetings", url: "/parent/meetings", icon: Calendar },
  { title: "Resources", url: "/parent/resources", icon: BookOpen },
  { title: "Announcements", url: "/parent/announcements", icon: MessageCircle },
  { title: "Analytics", url: "/parent/analytics", icon: BarChart3 },
];

function ParentSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <h2 className="text-lg font-bold font-display gradient-text">
              MentorX
            </h2>
          )}
          {collapsed && (
            <h2 className="text-lg font-bold font-display gradient-text text-center">
              M
            </h2>
          )}
          {!collapsed && (
            <p className="text-xs text-muted-foreground">Parent Portal</p>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={
                      location.pathname === item.url ||
                      location.pathname.startsWith(item.url + "/")
                    }
                    onClick={() => handleNavigation(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function ParentLayout() {
  useAuth("parent"); // ✅ CRITICAL FIX

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ParentSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-4 border-b border-border bg-card px-6">
            <SidebarTrigger />
            <Navbar role="parent" title="Parent Portal" />
          </header>

          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}