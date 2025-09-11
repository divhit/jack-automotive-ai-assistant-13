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
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface SubprimeAddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadAdded: (lead: SubprimeLead) => void;
}

type FormDataType = {
  customerName: string;
  phoneNumber: string;
  email: string;
};

// Phone number normalization function
const normalizePhoneNumber = (input: string): string => {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Handle different cases
  if (digits.length === 10) {
    // Format: 1234567890 -> (123) 456-7890
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    // Format: 11234567890 -> (123) 456-7890 (remove leading 1)
    const without1 = digits.slice(1);
    return `(${without1.slice(0, 3)}) ${without1.slice(3, 6)}-${without1.slice(6)}`;
  } else if (digits.length === 7) {
    // Format: 4567890 -> assume area code needed, but return as entered for user to fix
    return input;
  }
  
  // If we can't normalize it, return as-is for user to fix
  return input;
};

export const SubprimeAddLeadDialog = ({ open, onOpenChange, onLeadAdded }: SubprimeAddLeadDialogProps) => {
  const { user, profile, organization } = useAuth();
  const [formData, setFormData] = useState<FormDataType>({
    customerName: "",
    phoneNumber: "",
    email: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else {
      const normalized = normalizePhoneNumber(formData.phoneNumber);
      if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(normalized)) {
        newErrors.phoneNumber = "Please enter a valid 10-digit phone number";
      }
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    // Auto-format phone number as user types
    if (field === "phoneNumber") {
      const normalized = normalizePhoneNumber(value);
      setFormData(prev => ({ ...prev, [field]: normalized }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please correct the form errors before submitting");
      return;
    }

    // SECURITY: Check for organization context
    if (!organization?.id && !profile?.organization_id) {
      toast.error("Organization context missing", {
        description: "Please contact support to set up your organization properly"
      });
      return;
    }

    // Generate unique ID
    const leadId = `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate next action due date (default 1 day)
    const nextActionDate = new Date();
    nextActionDate.setDate(nextActionDate.getDate() + 1);

    // Normalize phone number one final time
    const normalizedPhone = normalizePhoneNumber(formData.phoneNumber);

    // SECURITY: Include organization context in lead creation
    const organizationId = organization?.id || profile?.organization_id;

    // Create the lead object with sensible defaults
    const newLead: SubprimeLead = {
      id: leadId,
      customerName: formData.customerName.trim(),
      phoneNumber: normalizedPhone,
      email: formData.email.trim() || undefined,
      chaseStatus: "Auto Chase Running",
      fundingReadiness: "Not Ready",
      fundingReadinessReason: "New lead - initial assessment needed",
      sentiment: "Neutral",
      lastTouchpoint: new Date().toISOString(),
      organizationId: organizationId, // SECURITY: Include organization ID
      nextAction: {
        type: "Initial contact and screening",
        dueDate: nextActionDate.toISOString(),
        isAutomated: true,
        isOverdue: false
      },
      scriptProgress: {
        currentStep: "contacted" as const,
        completedSteps: ["contacted"]
      },
      conversations: [{
        type: "message",
        content: `New lead created - ready for initial contact`,
        timestamp: new Date().toISOString(),
        sentBy: "system" as const
      }]
    };

    console.log('🎯 Creating new lead with normalized phone:', {
      id: newLead.id,
      customerName: newLead.customerName,
      phoneNumber: newLead.phoneNumber, // Now properly normalized
      email: newLead.email,
      organizationId: organizationId // SECURITY: Log organization context
    });

    try {
      // Send lead data to server for telephony integration
      const response = await fetch('/api/subprime/create-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'organizationId': organizationId, // SECURITY: Include organization context
        },
        body: JSON.stringify(newLead)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create lead on server');
      }

      const result = await response.json();
      console.log('✅ Lead created on server:', result);

      // Add to UI
      onLeadAdded(newLead);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        customerName: "",
        phoneNumber: "",
        email: ""
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Lead
          </DialogTitle>
          <DialogDescription>
            Create a new lead entry. Additional details will be gathered through conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">
              Customer Name <span className="text-red-500">*</span>
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
            </Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              placeholder="Enter any format: 1234567890, (123) 456-7890, etc."
              className={errors.phoneNumber ? "border-red-500" : ""}
            />
            {errors.phoneNumber && (
              <div className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.phoneNumber}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Phone number will be automatically formatted as (123) 456-7890
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-muted-foreground">(Optional)</span>
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
        </div>

        <div className="flex justify-end gap-3 pt-4">
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