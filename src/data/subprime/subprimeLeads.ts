// Define the SubprimeLead type directly in this file
export interface SubprimeLead {
  id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  organizationId?: string; // SECURITY: Organization context for multi-tenant data isolation
  agent_phone?: string; // Agent phone number for manual calls
  agent_name?: string; // Agent name for manual calls
  chaseStatus: "Auto Chase Running" | "Paused" | "Completed" | "Manual Review";
  fundingReadiness: "Ready" | "Partial" | "Not Ready";
  fundingReadinessReason: string;
  sentiment: "Warm" | "Neutral" | "Negative" | "Ghosted" | "Cold" | "Frustrated" | "Needs Human";
  lastTouchpoint: string;
  nextAction: {
    type: string;
    dueDate: string;
    isAutomated: boolean;
    isOverdue: boolean;
  };
  scriptProgress: {
    currentStep: "contacted" | "screening" | "qualification" | "routing" | "submitted";
    completedSteps: string[];
  };
  creditProfile?: {
    scoreRange: string;
    knownIssues: string[];
  };
  vehiclePreference?: string;
  vehicleInterest?: {
    type: string;
    budget: {
      min: number;
      max: number;
    };
    downPayment: number;
    features?: string[];
  };
  conversations: {
    type: string;
    content: string;
    timestamp: string;
    sentBy?: "system" | "lead" | "agent";
  }[];
  assignedAgent?: string;
  assignedSpecialist?: "Andrea" | "Ian" | "Kayam";
}

export const subprimeLeads: SubprimeLead[] = [
  // Memory array is now empty by default
  // Real leads will be populated from the database via API calls
  // This prevents old test data from showing up during fallback scenarios
];


