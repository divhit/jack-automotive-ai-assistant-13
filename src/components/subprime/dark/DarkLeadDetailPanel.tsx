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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Partial':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Not Ready':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Neutral':
        return 'bg-stone-100 text-stone-600 border-stone-200';
      case 'Negative':
      case 'Frustrated':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Ghosted':
      case 'Cold':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Needs Human':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-stone-100 text-stone-600 border-stone-200';
    }
  };

  // Empty state when no lead is selected
  if (!selectedLead) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-4 text-stone-300" />
            <p className="text-[14px] text-stone-500">Select a lead</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Lead Header Bar */}
      <div className="h-14 bg-white border-b border-stone-200 px-4 flex items-center flex-shrink-0">
        <div className="flex items-center flex-1 min-w-0">
          <span className="text-[15px] font-semibold text-stone-900 tracking-tight truncate">
            {selectedLead.customerName}
          </span>
          <span className="text-[13px] text-stone-500 ml-3 flex-shrink-0">
            {selectedLead.phoneNumber}
          </span>
          <Badge className="ml-3 flex-shrink-0 bg-stone-100 text-stone-700 border border-stone-200">
            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${selectedLead.fundingReadiness === 'Ready' ? 'bg-emerald-500' : selectedLead.fundingReadiness === 'Partial' ? 'bg-amber-500' : 'bg-red-500'}`} />
            {selectedLead.fundingReadiness}
          </Badge>
          <Badge className="ml-2 flex-shrink-0 bg-stone-100 text-stone-700 border border-stone-200">
            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${selectedLead.sentiment === 'Warm' ? 'bg-emerald-500' : selectedLead.sentiment === 'Neutral' ? 'bg-stone-400' : selectedLead.sentiment === 'Negative' || selectedLead.sentiment === 'Frustrated' ? 'bg-red-500' : selectedLead.sentiment === 'Ghosted' || selectedLead.sentiment === 'Cold' ? 'bg-blue-500' : 'bg-amber-500'}`} />
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
              <span className="text-[12px] text-emerald-600 font-medium">
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
              <span className="text-[12px] text-amber-600 font-medium">
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
        <div className="border-b border-stone-200 flex-shrink-0">
          <TabsList className="bg-transparent h-11 w-full justify-start px-2 gap-1">
            <TabsTrigger
              value="conversation"
              className="text-stone-400 data-[state=active]:text-stone-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Conversation
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="text-stone-400 data-[state=active]:text-stone-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="text-stone-400 data-[state=active]:text-stone-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-stone-400 data-[state=active]:text-stone-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors duration-150 gap-1.5"
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
