
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import InventoryDashboard from "@/pages/InventoryDashboard";
import ChatWithJack from "@/pages/ChatWithJack";
import CustomerConversations from "@/pages/CustomerConversations";
import MarketInsights from "@/pages/MarketInsights";
import SubprimeDashboard from "@/pages/SubprimeDashboard";
import { Car, Users, MessageSquare, Phone, BarChart3, CircleDollarSign } from "lucide-react";

const Layout = () => {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-automotive-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Car className="h-8 w-8" />
            <h1 className="text-2xl font-semibold">Jack Automotive AI Assistant</h1>
          </div>
          <div className="text-sm">
            <p className="text-gray-200">Prestige Motors Dealership</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger 
              value="inventory" 
              className="flex items-center gap-2 py-3"
              data-state={activeTab === "inventory" ? "active" : "inactive"}
            >
              <Car className="h-4 w-4" />
              <span>Inventory Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="chat" 
              className="flex items-center gap-2 py-3"
              data-state={activeTab === "chat" ? "active" : "inactive"}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Chat with Jack</span>
            </TabsTrigger>
            <TabsTrigger 
              value="conversations" 
              className="flex items-center gap-2 py-3"
              data-state={activeTab === "conversations" ? "active" : "inactive"}
            >
              <Phone className="h-4 w-4" />
              <span>Customer Conversations</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="flex items-center gap-2 py-3"
              data-state={activeTab === "insights" ? "active" : "inactive"}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Market Insights</span>
            </TabsTrigger>
            <TabsTrigger 
              value="subprime" 
              className="flex items-center gap-2 py-3"
              data-state={activeTab === "subprime" ? "active" : "inactive"}
            >
              <CircleDollarSign className="h-4 w-4" />
              <span>Subprime Leads</span>
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto">
            <TabsContent value="inventory" className="mt-0">
              <InventoryDashboard />
            </TabsContent>

            <TabsContent value="chat" className="mt-0">
              <ChatWithJack />
            </TabsContent>

            <TabsContent value="conversations" className="mt-0">
              <CustomerConversations />
            </TabsContent>

            <TabsContent value="insights" className="mt-0">
              <MarketInsights />
            </TabsContent>

            <TabsContent value="subprime" className="mt-0">
              <SubprimeDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-4 text-center text-gray-500 text-sm">
        <div className="container mx-auto">
          <p>Jack Automotive AI Assistant - Demo Version</p>
          <p className="text-xs mt-1">© 2025 Prestige Motors. This is a prototype for demonstration purposes only.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
