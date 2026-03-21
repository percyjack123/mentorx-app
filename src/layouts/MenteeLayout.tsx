import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, CheckCircle, Upload, CalendarDays, Target, Award, BookOpen, MessageSquare, Heart, AlertOctagon } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const items = [
  { title: "Dashboard", url: "/mentee", icon: LayoutDashboard },
  { title: "Daily Check-in", url: "/mentee/checkin", icon: CheckCircle },
  { title: "Upload Documents", url: "/mentee/documents", icon: Upload },
  { title: "Leave Application", url: "/mentee/leave", icon: CalendarDays },
  { title: "Goals", url: "/mentee/goals", icon: Target },
  { title: "Skill Log", url: "/mentee/skills", icon: Award },
  { title: "Resources", url: "/mentee/resources", icon: BookOpen },
  { title: "Raise Concern", url: "/mentee/concern", icon: MessageSquare },
  { title: "Health Info", url: "/mentee/health", icon: Heart },
  { title: "Emergency SOS", url: "/mentee/sos", icon: AlertOctagon },
];

function MenteeSidebar() {
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
          {!collapsed && <h2 className="text-lg font-bold font-display gradient-text">MentorX</h2>}
          {collapsed && <h2 className="text-lg font-bold font-display gradient-text text-center">M</h2>}
          {!collapsed && <p className="text-xs text-muted-foreground">Student Portal</p>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton isActive={location.pathname === item.url} onClick={() => handleNavigation(item.url)}>
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

export default function MenteeLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MenteeSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-4 border-b border-border bg-card px-6">
            <SidebarTrigger />
            <Navbar role="mentee" title="Student Portal" />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
