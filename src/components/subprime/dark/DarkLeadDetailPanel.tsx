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
            <Users className="w-8 h-8 mx-auto mb-4 text-zinc-800" />
            <p className="text-[14px] text-zinc-600">Select a lead</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950">
      {/* Lead Header Bar */}
      <div className="h-14 bg-zinc-950 border-b border-white/[0.06] px-4 flex items-center flex-shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-[15px] font-semibold text-zinc-100 tracking-tight truncate">
            {selectedLead.customerName}
          </span>
          <span className="text-[13px] text-zinc-500 ml-3 flex-shrink-0">
            {selectedLead.phoneNumber}
          </span>
          <Badge className="ml-3 flex-shrink-0 bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${selectedLead.fundingReadiness === 'Ready' ? 'bg-emerald-400' : selectedLead.fundingReadiness === 'Partial' ? 'bg-amber-400' : 'bg-red-400'}`} />
            {selectedLead.fundingReadiness}
          </Badge>
          <Badge className="ml-2 flex-shrink-0 bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${selectedLead.sentiment === 'Warm' ? 'bg-emerald-400' : selectedLead.sentiment === 'Neutral' ? 'bg-zinc-400' : selectedLead.sentiment === 'Negative' || selectedLead.sentiment === 'Frustrated' ? 'bg-red-400' : selectedLead.sentiment === 'Ghosted' || selectedLead.sentiment === 'Cold' ? 'bg-blue-400' : 'bg-amber-400'}`} />
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
              <span className="text-[12px] text-emerald-400 font-medium">
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
              <span className="text-[12px] text-amber-400 font-medium">
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
        <div className="border-b border-white/[0.06] flex-shrink-0">
          <TabsList className="bg-transparent h-11 w-full justify-start px-2 gap-1">
            <TabsTrigger
              value="conversation"
              className="text-zinc-500 data-[state=active]:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Conversation
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-zinc-500 data-[state=active]:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-zinc-500 data-[state=active]:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-zinc-500 data-[state=active]:text-zinc-100 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-100 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
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
