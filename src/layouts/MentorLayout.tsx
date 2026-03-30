import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, AlertTriangle, CalendarDays, BookOpen, MessageCircle, BarChart3 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { title: "Dashboard",  url: "/mentor",           icon: LayoutDashboard, exact: true },
  { title: "Mentees",    url: "/mentor/mentees",   icon: Users },
  { title: "Alerts",     url: "/mentor/alerts",    icon: AlertTriangle },
  { title: "Meetings",   url: "/mentor/meetings",  icon: CalendarDays },
  { title: "Resources",  url: "/mentor/resources", icon: BookOpen },
  { title: "Forum",      url: "/mentor/forum",     icon: MessageCircle },
  { title: "Analytics",  url: "/mentor/analytics", icon: BarChart3 },
];

function MentorSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (item: typeof items[0]) => {
    if (item.exact) return location.pathname === item.url;
    return location.pathname === item.url || location.pathname.startsWith(item.url + "/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && <h2 className="text-lg font-bold gradient-text">MentorX</h2>}
          {!collapsed && <p className="text-xs text-muted-foreground">Mentor Panel</p>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item)}
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

export default function MentorLayout() {
  useAuth("mentor");
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MentorSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-4 border-b bg-card px-6">
            <SidebarTrigger />
            <Navbar role="mentor" title="Mentor Dashboard" />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}