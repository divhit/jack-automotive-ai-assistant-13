import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { TelephonyInterface } from './TelephonyInterface-fixed';

interface SubprimeLeadDetailModalProps {
  lead: SubprimeLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
}

const SubprimeLeadDetailModal: React.FC<SubprimeLeadDetailModalProps> = ({
  lead,
  open,
  onOpenChange,
  onLeadUpdate
}) => {
  if (!lead) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-green-100 text-green-700 border-green-200';
      case 'Partial': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Not Ready': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '😊';
      case 'Neutral': return '😐';
      case 'Negative': return '😕';
      case 'Frustrated': return '😤';
      case 'Ghosted': return '👻';
      default: return '🤔';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 p-4 pb-2 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5" />
              {lead.customerName}
              <Badge className={getStatusColor(lead.fundingReadiness)}>
                {lead.fundingReadiness}
              </Badge>
              <Badge variant="outline">
                {getSentimentIcon(lead.sentiment)} {lead.sentiment}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>ID: {lead.id}</span>
              <span>•</span>
              <span>Specialist: {lead.assignedSpecialist}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <TelephonyInterface
            selectedLead={lead}
            onLeadUpdate={onLeadUpdate}
            className="h-full w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubprimeLeadDetailModal;
