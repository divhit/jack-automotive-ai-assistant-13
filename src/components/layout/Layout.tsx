
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import InventoryDashboard from "@/pages/InventoryDashboard";
import ChatWithJack from "@/pages/ChatWithJack";
import CustomerConversations from "@/pages/CustomerConversations";
import MarketInsights from "@/pages/MarketInsights";
import SubprimeDashboard from "@/pages/SubprimeDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Car,
  MessageSquare,
  Phone,
  BarChart3,
  CircleDollarSign,
  LogOut,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { id: "subprime", label: "Leads", icon: CircleDollarSign, badge: null },
  { id: "inventory", label: "Inventory", icon: Car, badge: null },
  { id: "chat", label: "Chat", icon: MessageSquare, badge: null },
  { id: "conversations", label: "SMS", icon: Phone, badge: null },
  { id: "insights", label: "Insights", icon: BarChart3, badge: null },
];

const Layout = () => {
  const [activeTab, setActiveTab] = useState("subprime");
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
      case "inventory":
        return <InventoryDashboard />;
      case "chat":
        return <ChatWithJack />;
      case "conversations":
        return <CustomerConversations />;
      case "insights":
        return <MarketInsights />;
      case "subprime":
        return <SubprimeDashboard />;
      default:
        return <SubprimeDashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-sidebar border-r border-sidebar-border
          transition-all duration-300 ease-in-out flex-shrink-0
          ${sidebarCollapsed ? "w-[68px]" : "w-[240px]"}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-sidebar-border ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-sidebar-accent-foreground tracking-tight truncate">
                AutoAI
              </h1>
              <p className="text-[11px] text-sidebar-foreground truncate">
                {organization?.name || "Dashboard"}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  w-full flex items-center gap-3 rounded-lg transition-all duration-150
                  ${sidebarCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
                  ${isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium nav-item-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                {!sidebarCollapsed && (
                  <span className="text-[13px] truncate">{item.label}</span>
                )}
                {!sidebarCollapsed && item.badge && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 bg-sidebar-primary/10 text-sidebar-primary border-0">
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="px-2 py-2 border-t border-sidebar-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* User section */}
        <div className={`px-2 pb-3 border-t border-sidebar-border pt-3 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-2.5 rounded-lg w-full transition-colors
                  hover:bg-sidebar-accent/50
                  ${sidebarCollapsed ? "justify-center p-2" : "px-3 py-2"}
                `}
              >
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-sidebar-primary text-[11px] font-medium text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="text-left overflow-hidden">
                    <p className="text-[12px] font-medium text-sidebar-accent-foreground truncate leading-tight">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-[11px] text-sidebar-foreground truncate leading-tight">
                      {profile?.role || "agent"}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {navItems.find((n) => n.id === activeTab)?.label || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500"></span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 page-enter">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
