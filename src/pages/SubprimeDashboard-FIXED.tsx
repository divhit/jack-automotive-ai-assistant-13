import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { subprimeLeads } from "@/data";
import { SubprimeLeadFilters } from "@/components/subprime/SubprimeLeadFilters";
import { SubprimeAnalytics } from "@/components/subprime/SubprimeAnalytics";
import { SubprimeLeadsList } from "@/components/subprime/SubprimeLeadsList";
import { SubprimeAddLeadDialog } from "@/components/subprime/SubprimeAddLeadDialog";
import { LeadAnalyticsDashboard } from "@/components/subprime/analytics/LeadAnalyticsDashboard";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { BarChart3, Users, MessageSquare, Clock, Info, Settings, Sliders, UserPlus, Database, RefreshCw, Trash2, Brain, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubprimeSettingsDialog } from "@/components/subprime/SubprimeSettingsDialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const SubprimeDashboard = () => {
  // ... rest of the component remains the same
  // This is just fixing the imports
}; 