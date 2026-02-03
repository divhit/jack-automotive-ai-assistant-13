import { useState } from "react";
import PrimeDashboard from "@/pages/PrimeDashboard";
import SubprimeDashboard from "@/pages/SubprimeDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  CircleDollarSign,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { id: "prime", label: "Prime Leads", icon: Users },
  { id: "subprime", label: "Subprime Leads", icon: CircleDollarSign },
];

const Layout = () => {
  const [activeTab, setActiveTab] = useState("prime");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, profile, organization, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || "User";
  };

  const renderContent = () => {
    switch (activeTab) {
      case "prime":
        return <PrimeDashboard />;
      case "subprime":
        return <SubprimeDashboard />;
      default:
        return <PrimeDashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-sidebar border-r border-sidebar-border
          transition-all duration-200 ease-in-out flex-shrink-0
          ${sidebarCollapsed ? "w-[60px]" : "w-[220px]"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-14 px-4 border-b border-sidebar-border ${sidebarCollapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white tracking-tight">J</span>
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-[13px] font-semibold text-sidebar-accent-foreground tracking-tight truncate">
                {organization?.name || "Jack AI"}
              </h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center gap-2.5 rounded-md transition-colors duration-100
                  ${sidebarCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"}
                  ${isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground nav-item-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                {!sidebarCollapsed && (
                  <span className="text-[13px] truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse */}
        <div className="px-2 py-1.5 border-t border-sidebar-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* User */}
        <div className={`px-2 pb-3 border-t border-sidebar-border pt-2 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-2 rounded-md w-full transition-colors
                  hover:bg-sidebar-accent/50
                  ${sidebarCollapsed ? "justify-center p-2" : "px-3 py-1.5"}
                `}
              >
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-sidebar-primary text-[10px] font-medium text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="text-left overflow-hidden">
                    <p className="text-[12px] font-medium text-sidebar-accent-foreground truncate leading-tight">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-[10px] text-sidebar-foreground truncate leading-tight">
                      {profile?.role || "agent"}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{getUserDisplayName()}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center px-6 flex-shrink-0">
          <h2 className="text-sm font-medium text-foreground">
            {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
          </h2>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-5 page-enter">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
