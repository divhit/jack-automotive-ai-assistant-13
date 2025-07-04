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
import { useAuth } from '@/contexts/AuthContext';

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
  // SECURITY: Get organization context from auth
  const { organization, loading, user } = useAuth();
  
  // DEBUG: Log organization context
  console.log('🏢 SubprimeLeadDetailModal - Auth Context Debug:', {
    organization: organization,
    organizationId: organization?.id,
    organizationName: organization?.name,
    loading: loading,
    user: user,
    hasOrganization: !!organization,
    leadId: lead?.id
  });
  
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
              {organization && (
                <>
                  <span>•</span>
                  <span>Org: {organization.name}</span>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* SECURITY: Only render TelephonyInterface when we have organization context */}
          {loading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading authentication...</p>
                <p className="text-sm mt-2">Please wait while we authenticate your session.</p>
              </div>
            </div>
          ) : organization?.id ? (
          <TelephonyInterface
            selectedLead={lead}
            onLeadUpdate={onLeadUpdate}
            className="h-full w-full"
              organizationId={organization.id} // SECURITY: Pass organization ID from auth context
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>⚠️ Organization context not available</p>
                <p className="text-sm mt-2">Your account may not be properly associated with an organization.</p>
                <p className="text-xs mt-1 text-red-500">Please contact support if this issue persists.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubprimeLeadDetailModal;
