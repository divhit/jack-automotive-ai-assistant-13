import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { UserPlus, Phone, Mail, CreditCard, Car, Calendar, User, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SubprimeAddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadAdded: (lead: SubprimeLead) => void;
}

export const SubprimeAddLeadDialog = ({ open, onOpenChange, onLeadAdded }: SubprimeAddLeadDialogProps) => {
  const [formData, setFormData] = useState({
    customerName: "",
    phoneNumber: "",
    email: "",
    fundingReadiness: "Not Ready" as SubprimeLead['fundingReadiness'],
    fundingReadinessReason: "",
    sentiment: "Neutral" as SubprimeLead['sentiment'],
    chaseStatus: "Auto Chase Running" as SubprimeLead['chaseStatus'],
    creditScoreRange: "",
    knownIssues: [] as string[],
    vehiclePreference: "",
    assignedAgent: "",
    assignedSpecialist: undefined as SubprimeLead['assignedSpecialist'],
    nextActionType: "",
    nextActionDays: "1"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [knownIssueInput, setKnownIssueInput] = useState("");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required (used for dynamic variable: customer_name)";
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required (used for conversation routing and context)";
    } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Phone format must be (555) 123-4567 for Twilio integration";
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.fundingReadinessReason.trim()) {
      newErrors.fundingReadinessReason = "Funding readiness reason is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddKnownIssue = () => {
    if (knownIssueInput.trim() && !formData.knownIssues.includes(knownIssueInput.trim())) {
      setFormData(prev => ({
        ...prev,
        knownIssues: [...prev.knownIssues, knownIssueInput.trim()]
      }));
      setKnownIssueInput("");
    }
  };

  const handleRemoveKnownIssue = (issue: string) => {
    setFormData(prev => ({
      ...prev,
      knownIssues: prev.knownIssues.filter(i => i !== issue)
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please correct the form errors before submitting");
      return;
    }

    // Generate unique ID
    const leadId = `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate next action due date
    const nextActionDate = new Date();
    nextActionDate.setDate(nextActionDate.getDate() + parseInt(formData.nextActionDays));

    // Create the lead object that matches SubprimeLead interface exactly
    const newLead: SubprimeLead = {
      id: leadId,
      customerName: formData.customerName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      email: formData.email.trim() || undefined,
      chaseStatus: formData.chaseStatus,
      fundingReadiness: formData.fundingReadiness,
      fundingReadinessReason: formData.fundingReadinessReason.trim(),
      sentiment: formData.sentiment,
      lastTouchpoint: new Date().toISOString(),
      nextAction: {
        type: formData.nextActionType || "Initial contact and screening",
        dueDate: nextActionDate.toISOString(),
        isAutomated: formData.chaseStatus === "Auto Chase Running",
        isOverdue: false
      },
      scriptProgress: {
        currentStep: "contacted" as const,
        completedSteps: ["contacted"]
      },
      creditProfile: formData.creditScoreRange || formData.knownIssues.length > 0 ? {
        scoreRange: formData.creditScoreRange || "Unknown",
        knownIssues: formData.knownIssues
      } : undefined,
      vehiclePreference: formData.vehiclePreference.trim() || undefined,
      conversations: [{
        type: "message",
        content: `New lead created: ${formData.fundingReadinessReason}`,
        timestamp: new Date().toISOString(),
        sentBy: "system" as const
      }],
      assignedAgent: formData.assignedAgent.trim() || undefined,
      assignedSpecialist: formData.assignedSpecialist
    };

    console.log('🎯 Creating new lead with data for dynamic variables:', {
      id: newLead.id,
      customerName: newLead.customerName, // Used in customer_name variable
      phoneNumber: newLead.phoneNumber, // Used for conversation routing
      sentiment: newLead.sentiment, // Affects lead_status variable
      fundingReadiness: newLead.fundingReadiness, // Affects lead_status variable
      hasConversationHistory: newLead.conversations.length > 0 // Affects conversation_context variable
    });

    try {
      // Send lead data to server for telephony integration
      const response = await fetch('/api/subprime/create-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLead)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create lead on server');
      }

      const result = await response.json();
      console.log('✅ Lead created on server with dynamic variables:', result.dynamicVariables);

      // Add to UI
      onLeadAdded(newLead);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        customerName: "",
        phoneNumber: "",
        email: "",
        fundingReadiness: "Not Ready",
        fundingReadinessReason: "",
        sentiment: "Neutral",
        chaseStatus: "Auto Chase Running",
        creditScoreRange: "",
        knownIssues: [],
        vehiclePreference: "",
        assignedAgent: "",
        assignedSpecialist: undefined,
        nextActionType: "",
        nextActionDays: "1"
      });

      toast.success(`Lead created successfully`, {
        description: `${newLead.customerName} has been added to the subprime pipeline and is ready for telephony integration`
      });

    } catch (error) {
      console.error('❌ Error creating lead:', error);
      toast.error("Failed to create lead", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Subprime Lead
          </DialogTitle>
          <DialogDescription>
            Create a new lead entry with all required information for telephony integration.
            All fields correspond to dynamic variables used in ElevenLabs and Twilio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    Customer Name <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground ml-1">(Used in: customer_name)</span>
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    placeholder="John Smith"
                    className={errors.customerName ? "border-red-500" : ""}
                  />
                  {errors.customerName && (
                    <div className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.customerName}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground ml-1">(Used for: conversation routing)</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    placeholder="(555) 123-4567"
                    className={errors.phoneNumber ? "border-red-500" : ""}
                  />
                  {errors.phoneNumber && (
                    <div className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errors.phoneNumber}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address
                  <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="john@example.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <div className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.email}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lead Status & Process */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Lead Status & Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>
                    Funding Readiness <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground ml-1">(Affects: lead_status)</span>
                  </Label>
                  <Select value={formData.fundingReadiness} onValueChange={(value) => handleInputChange("fundingReadiness", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Not Ready">Not Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Sentiment <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground ml-1">(Affects: lead_status)</span>
                  </Label>
                  <Select value={formData.sentiment} onValueChange={(value) => handleInputChange("sentiment", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warm">Warm</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Cold">Cold</SelectItem>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Frustrated">Frustrated</SelectItem>
                      <SelectItem value="Ghosted">Ghosted</SelectItem>
                      <SelectItem value="Needs Human">Needs Human</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chase Status</Label>
                  <Select value={formData.chaseStatus} onValueChange={(value) => handleInputChange("chaseStatus", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto Chase Running">Auto Chase Running</SelectItem>
                      <SelectItem value="Paused">Paused</SelectItem>
                      <SelectItem value="Manual Review">Manual Review</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundingReadinessReason">
                  Funding Readiness Reason <span className="text-red-500">*</span>
                  <span className="text-xs text-muted-foreground ml-1">(Used in: conversation_context)</span>
                </Label>
                <Textarea
                  id="fundingReadinessReason"
                  value={formData.fundingReadinessReason}
                  onChange={(e) => handleInputChange("fundingReadinessReason", e.target.value)}
                  placeholder="e.g., Waiting on proof of income, Credit needs improvement, Ready for pre-approval..."
                  className={errors.fundingReadinessReason ? "border-red-500" : ""}
                  rows={3}
                />
                {errors.fundingReadinessReason && (
                  <div className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {errors.fundingReadinessReason}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Credit Profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Credit Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credit Score Range</Label>
                  <Select value={formData.creditScoreRange} onValueChange={(value) => handleInputChange("creditScoreRange", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300-549">300-549 (Poor)</SelectItem>
                      <SelectItem value="550-619">550-619 (Subprime)</SelectItem>
                      <SelectItem value="620-679">620-679 (Near Prime)</SelectItem>
                      <SelectItem value="680-719">680-719 (Prime)</SelectItem>
                      <SelectItem value="720-850">720-850 (Super Prime)</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vehicle Preference</Label>
                  <Input
                    value={formData.vehiclePreference}
                    onChange={(e) => handleInputChange("vehiclePreference", e.target.value)}
                    placeholder="e.g., SUV, Sedan, Truck..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Known Credit Issues</Label>
                <div className="flex gap-2">
                  <Input
                    value={knownIssueInput}
                    onChange={(e) => setKnownIssueInput(e.target.value)}
                    placeholder="Add credit issue..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKnownIssue()}
                  />
                  <Button type="button" variant="outline" onClick={handleAddKnownIssue}>
                    Add
                  </Button>
                </div>
                {formData.knownIssues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.knownIssues.map((issue, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveKnownIssue(issue)}>
                        {issue} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment & Next Action */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assignment & Next Action
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assigned Agent</Label>
                  <Input
                    value={formData.assignedAgent}
                    onChange={(e) => handleInputChange("assignedAgent", e.target.value)}
                    placeholder="Agent name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assigned Specialist</Label>
                  <Select value={formData.assignedSpecialist || ""} onValueChange={(value) => handleInputChange("assignedSpecialist", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialist" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      <SelectItem value="Andrea">Andrea</SelectItem>
                      <SelectItem value="Ian">Ian</SelectItem>
                      <SelectItem value="Kayam">Kayam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Next Action Type</Label>
                  <Input
                    value={formData.nextActionType}
                    onChange={(e) => handleInputChange("nextActionType", e.target.value)}
                    placeholder="e.g., Follow up on documents, Schedule call..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due in (days)</Label>
                  <Select value={formData.nextActionDays} onValueChange={(value) => handleInputChange("nextActionDays", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 