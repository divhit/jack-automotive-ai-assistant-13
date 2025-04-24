
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "./lead/LeadStatusBadge";
import { formatDistanceToNow } from "date-fns";

interface AssigneeLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignee: string | null;
  leads: SubprimeLead[];
  onSendNudge: (lead: SubprimeLead) => void;
}

export const AssigneeLeadsDialog = ({
  open,
  onOpenChange,
  assignee,
  leads,
  onSendNudge
}: AssigneeLeadsDialogProps) => {
  if (!assignee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leads Assigned to {assignee}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {leads.length === 0 ? (
            <p className="text-center text-muted-foreground">No leads assigned</p>
          ) : (
            leads.map(lead => (
              <Card key={lead.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{lead.customerName}</h4>
                      <LeadStatusBadge lead={lead} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last contact: {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
                    </p>
                    <p className="text-sm">Status: {lead.fundingReadiness}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                    onClick={() => onSendNudge(lead)}
                  >
                    <Bell className="h-4 w-4" />
                    Send {lead.assignedAgent} Nudge
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
