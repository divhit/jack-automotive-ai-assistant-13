
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Car, 
  Calendar, 
  BarChart3,
  Settings,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign
} from 'lucide-react';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { TelephonyInterface } from './TelephonyInterface-fixed';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState('conversation');
  const [isUpdating, setIsUpdating] = useState(false);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleReassignSpecialist = async () => {
    if (!lead) return;
    setIsUpdating(true);
    
    // Cycle through specialists
    const specialists = ['Andrea', 'Ian', 'Kayam'] as const;
    const currentIndex = specialists.indexOf(lead.assignedSpecialist || 'Andrea');
    const nextSpecialist = specialists[(currentIndex + 1) % specialists.length];
    
    try {
      await onLeadUpdate?.(lead.id, { assignedSpecialist: nextSpecialist });
      toast.success(`Reassigned to ${nextSpecialist}`);
    } catch (error) {
      toast.error('Failed to reassign specialist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleFollowUp = async () => {
    if (!lead) return;
    setIsUpdating(true);
    
    // Set follow-up for tomorrow
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 1);
    
    try {
      await onLeadUpdate?.(lead.id, {
        nextAction: {
          ...lead.nextAction,
          type: 'Scheduled follow-up call',
          dueDate: followUpDate.toISOString(),
          isOverdue: false
        }
      });
      toast.success('Follow-up scheduled for tomorrow');
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!lead) return;
    setIsUpdating(true);
    
    // Cycle through funding readiness statuses
    const statuses = ['Not Ready', 'Partial', 'Ready'] as const;
    const currentIndex = statuses.indexOf(lead.fundingReadiness);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    const reasons = {
      'Not Ready': 'Status manually updated - requires assessment',
      'Partial': 'Status manually updated - documentation in progress',
      'Ready': 'Status manually updated - ready for financing'
    };
    
    try {
      await onLeadUpdate?.(lead.id, {
        fundingReadiness: nextStatus,
        fundingReadinessReason: reasons[nextStatus]
      });
      toast.success(`Status updated to ${nextStatus}`);
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFlagForReview = async () => {
    if (!lead) return;
    setIsUpdating(true);
    
    try {
      await onLeadUpdate?.(lead.id, {
        chaseStatus: 'Manual Review',
        nextAction: {
          ...lead.nextAction,
          type: 'Manual review required',
          dueDate: new Date().toISOString(),
          isAutomated: false,
          isOverdue: true
        }
      });
      toast.success('Lead flagged for manual review');
    } catch (error) {
      toast.error('Failed to flag for review');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleContactMethodChange = async (method: 'Voice' | 'SMS' | 'Email') => {
    if (!lead) return;
    setIsUpdating(true);
    
    try {
      // This would normally update a contact preferences field
      // For now, we'll add a conversation entry to track the preference
      const newConversation = {
        type: 'system',
        content: `Contact method preference updated to ${method}`,
        timestamp: new Date().toISOString(),
        sentBy: 'system' as const
      };
      
      await onLeadUpdate?.(lead.id, {
        conversations: [...lead.conversations, newConversation]
      });
      toast.success(`Contact method set to ${method}`);
    } catch (error) {
      toast.error('Failed to update contact method');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleContactTimeChange = async (time: 'Morning' | 'Afternoon' | 'Evening') => {
    if (!lead) return;
    setIsUpdating(true);
    
    try {
      const newConversation = {
        type: 'system',
        content: `Best contact time updated to ${time}`,
        timestamp: new Date().toISOString(),
        sentBy: 'system' as const
      };
      
      await onLeadUpdate?.(lead.id, {
        conversations: [...lead.conversations, newConversation]
      });
      toast.success(`Contact time set to ${time}`);
    } catch (error) {
      toast.error('Failed to update contact time');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6" />
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

        <div className="flex-1 flex flex-col px-6 pb-6 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0 mb-4">
            <TabsTrigger value="conversation" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telephony
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

            <TabsContent value="conversation" className="flex-1 overflow-hidden" style={{ marginTop: 0 }}>
              <TelephonyInterface
                selectedLead={lead}
                onLeadUpdate={onLeadUpdate}
                className="h-full"
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{lead.phoneNumber}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Last Activity: {new Date(lead.lastTouchpoint).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Profile */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Credit Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.creditProfile && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Score Range:</span>
                        <span className="text-sm font-medium">{lead.creditProfile.scoreRange || 'Unknown'}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Known Issues:</span>
                        <div className="mt-1 space-y-1">
                          {lead.creditProfile.knownIssues.map((issue, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Interest */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Vehicle Interest
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.vehicleInterest ? (
                    <>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                        <span className="text-sm font-medium">{lead.vehicleInterest.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Budget:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(lead.vehicleInterest.budget.min)} - {formatCurrency(lead.vehicleInterest.budget.max)}
                        </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Down Payment:</span>
                        <span className="text-sm font-medium">{formatCurrency(lead.vehicleInterest.downPayment)}</span>
                      </div>
                      {lead.vehicleInterest.features && lead.vehicleInterest.features.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Desired Features:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {lead.vehicleInterest.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Vehicle preferences not specified
                  </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Script Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Script Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Step:</span>
                    <Badge variant="outline">{lead.scriptProgress?.currentStep || 'Unknown'}</Badge>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Completed Steps:</span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(lead.scriptProgress?.completedSteps || []).map((step, index) => (
                        <Badge key={index} className="text-xs bg-green-100 text-green-700">
                          {step}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Action */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Next Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Action:</span>
                    <span className="text-sm font-medium">{lead.nextAction.type}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Due Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(lead.nextAction.dueDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={lead.nextAction.isOverdue ? "destructive" : "default"}>
                      {lead.nextAction.isOverdue ? "Overdue" : "Pending"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Automated:</span>
                    <Badge variant="outline">
                      {lead.nextAction.isAutomated ? "Yes" : "Manual"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Engagement Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Conversations:</span>
                      <span className="text-sm font-medium">{lead.conversations?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sentiment:</span>
                      <Badge variant="outline" className="text-xs">
                        {getSentimentIcon(lead.sentiment)} {lead.sentiment}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Chase Status:</span>
                      <Badge variant={lead.chaseStatus === "Auto Chase Running" ? "default" : "secondary"} className="text-xs">
                        {lead.chaseStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Funding Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Readiness:</span>
                      <Badge className={getStatusColor(lead.fundingReadiness)} variant="outline">
                        {lead.fundingReadiness}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Current Step:</span>
                      <Badge variant="outline" className="text-xs">
                        {lead.scriptProgress?.currentStep || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Progress:</span>
                      <span className="text-sm font-medium">
                        {lead.scriptProgress?.completedSteps?.length || 0}/5 steps
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Credit Range:</span>
                      <Badge variant="outline" className="text-xs">
                        {lead.creditProfile?.scoreRange || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Known Issues:</span>
                      <span className="text-sm font-medium">
                        {lead.creditProfile?.knownIssues?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Action Status:</span>
                      <Badge variant={lead.nextAction?.isOverdue ? "destructive" : "default"} className="text-xs">
                        {lead.nextAction?.isOverdue ? "Overdue" : "On Track"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Lead Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2" 
                      onClick={handleReassignSpecialist}
                      disabled={isUpdating}
                    >
                      <User className="w-4 h-4" />
                      Reassign Specialist
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={handleScheduleFollowUp}
                      disabled={isUpdating}
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule Follow-up
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={handleUpdateStatus}
                      disabled={isUpdating}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Update Status
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={handleFlagForReview}
                      disabled={isUpdating}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Flag for Review
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Communication Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preferred Contact Method</label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleContactMethodChange('Voice')}
                        disabled={isUpdating}
                      >
                        Voice
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleContactMethodChange('SMS')}
                        disabled={isUpdating}
                      >
                        SMS
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleContactMethodChange('Email')}
                        disabled={isUpdating}
                      >
                        Email
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Best Contact Time</label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleContactTimeChange('Morning')}
                        disabled={isUpdating}
                      >
                        Morning
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleContactTimeChange('Afternoon')}
                        disabled={isUpdating}
                      >
                        Afternoon
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleContactTimeChange('Evening')}
                        disabled={isUpdating}
                      >
                        Evening
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubprimeLeadDetailModal;
