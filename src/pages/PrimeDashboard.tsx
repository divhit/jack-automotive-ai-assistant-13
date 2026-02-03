import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessageSquare, Car, TrendingUp, Bot } from "lucide-react";
import CustomerConversations from "./CustomerConversations";
import InventoryDashboard from "./InventoryDashboard";
import MarketInsights from "./MarketInsights";
import ChatWithJack from "./ChatWithJack";

const PrimeDashboard = () => {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="conversations" className="flex flex-col h-full">
        <TabsList className="w-fit bg-muted/60 border border-border">
          <TabsTrigger value="conversations" className="gap-1.5 text-xs px-3">
            <MessageSquare className="h-3.5 w-3.5" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 text-xs px-3">
            <Car className="h-3.5 w-3.5" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5 text-xs px-3">
            <TrendingUp className="h-3.5 w-3.5" />
            Market Insights
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1.5 text-xs px-3">
            <Bot className="h-3.5 w-3.5" />
            Chat with Jack
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversations" className="flex-1 mt-4">
          <CustomerConversations />
        </TabsContent>

        <TabsContent value="inventory" className="flex-1 mt-4">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="insights" className="flex-1 mt-4">
          <MarketInsights />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 mt-4 h-[calc(100vh-12rem)]">
          <ChatWithJack mode="prime" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrimeDashboard;
