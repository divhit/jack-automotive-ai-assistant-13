import React from 'react';
import { Users, MessageSquare, User, BarChart3, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';

interface DarkLeadDetailPanelProps {
  selectedLead: SubprimeLead | null;
  activeMainTab: string;
  onTabChange: (tab: string) => void;
  isCallActive: boolean;
  callDuration: number;
  isManualCallActive: boolean;
  isUnderHumanControl: boolean;
  humanControlAgent: string | null;
  formatDuration: (seconds: number) => string;
  children: React.ReactNode;
}

const DarkLeadDetailPanel: React.FC<DarkLeadDetailPanelProps> = ({
  selectedLead,
  activeMainTab,
  onTabChange,
  isCallActive,
  callDuration,
  isManualCallActive,
  isUnderHumanControl,
  humanControlAgent,
  formatDuration,
  children,
}) => {
  const getFundingReadinessColor = (status: string) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
      case 'Partial':
        return 'bg-amber-900/50 text-amber-400 border-amber-700';
      case 'Not Ready':
        return 'bg-red-900/50 text-red-400 border-red-700';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'Warm':
        return '😊';
      case 'Neutral':
        return '😐';
      case 'Negative':
        return '😕';
      case 'Frustrated':
        return '😤';
      case 'Ghosted':
        return '👻';
      case 'Cold':
        return '🥶';
      case 'Needs Human':
        return '🙋';
      default:
        return '🤔';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Warm':
        return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
      case 'Neutral':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'Negative':
      case 'Frustrated':
        return 'bg-red-900/50 text-red-400 border-red-700';
      case 'Ghosted':
      case 'Cold':
        return 'bg-blue-900/50 text-blue-400 border-blue-700';
      case 'Needs Human':
        return 'bg-amber-900/50 text-amber-400 border-amber-700';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  // Empty state when no lead is selected
  if (!selectedLead) {
    return (
      <div className="flex-1 flex flex-col h-full bg-zinc-950">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-zinc-500 opacity-50" />
            <p className="text-lg font-medium text-zinc-500">Select a lead</p>
            <p className="text-sm text-zinc-600 mt-1">
              Choose a lead from the list to view their details and conversation history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950">
      {/* Lead Header Bar */}
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center flex-shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-lg font-semibold text-zinc-100 truncate">
            {selectedLead.customerName}
          </span>
          <span className="text-sm text-zinc-400 ml-3 flex-shrink-0">
            {selectedLead.phoneNumber}
          </span>
          <Badge className={`ml-3 flex-shrink-0 ${getFundingReadinessColor(selectedLead.fundingReadiness)}`}>
            {selectedLead.fundingReadiness}
          </Badge>
          <Badge className={`ml-2 flex-shrink-0 ${getSentimentColor(selectedLead.sentiment)}`}>
            {getSentimentEmoji(selectedLead.sentiment)} {selectedLead.sentiment}
          </Badge>
        </div>

        {/* Right side indicators */}
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {isCallActive && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-sm text-emerald-400 font-medium">
                {formatDuration(callDuration)}
              </span>
            </div>
          )}
          {isUnderHumanControl && (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-sm text-amber-400 font-medium">
                {humanControlAgent || 'Human'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status bar - conditionally rendered */}
      {(isCallActive || isManualCallActive) && (
        <div
          className={`h-1 flex-shrink-0 ${
            isCallActive
              ? 'bg-emerald-500'
              : isManualCallActive
              ? 'bg-amber-500'
              : ''
          }`}
        />
      )}

      {/* Tabs */}
      <Tabs
        value={activeMainTab}
        onValueChange={onTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
          <TabsList className="bg-transparent h-11 w-full justify-start px-2 gap-1">
            <TabsTrigger
              value="conversation"
              className="text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md px-3 py-1.5 text-sm font-medium gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              Conversation
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md px-3 py-1.5 text-sm font-medium gap-1.5"
            >
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md px-3 py-1.5 text-sm font-medium gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-zinc-400 data-[state=active]:text-zinc-100 data-[state=active]:bg-zinc-800 data-[state=active]:shadow-none rounded-md px-3 py-1.5 text-sm font-medium gap-1.5"
            >
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </Tabs>
    </div>
  );
};

export default DarkLeadDetailPanel;
