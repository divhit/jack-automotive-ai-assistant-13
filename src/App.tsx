
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SalesDashboard from "./pages/SalesDashboard";
import InventoryDashboard from "./pages/InventoryDashboard";
import ChatWithJack from "./pages/ChatWithJack";
import CustomerConversations from "./pages/CustomerConversations";
import ManualLeadEntry from "./pages/ManualLeadEntry";
import MarketInsights from "./pages/MarketInsights";
import SubprimeDashboard from "./pages/SubprimeDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/sales" element={<SalesDashboard />} />
          <Route path="/inventory" element={<InventoryDashboard />} />
          <Route path="/chat" element={<ChatWithJack />} />
          <Route path="/conversations" element={<CustomerConversations />} />
          <Route path="/leads" element={<ManualLeadEntry />} />
          <Route path="/insights" element={<MarketInsights />} />
          <Route path="/subprime" element={<SubprimeDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
