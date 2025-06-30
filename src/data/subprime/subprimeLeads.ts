// Define the SubprimeLead type directly in this file
export interface SubprimeLead {
  id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
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
  {
    id: "sl3",
    customerName: "Carlos Rodriguez",
    phoneNumber: "(555) 456-7890",
    email: "carlos.rodriguez@example.com",
    chaseStatus: "Completed",
    fundingReadiness: "Ready",
    fundingReadinessReason: "Loan finalized",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-21T12:00:00Z",
    nextAction: {
      type: "Vehicle delivery",
      dueDate: "2025-04-24T15:00:00Z",
      isAutomated: false,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "submitted",
      completedSteps: ["contacted", "screening", "qualification", "routing"]
    },
    creditProfile: {
      scoreRange: "720-780",
      knownIssues: []
    },
    vehiclePreference: "Truck",
    vehicleInterest: {
      type: "Truck",
      budget: {
        min: 25000,
        max: 35000
      },
      downPayment: 5000,
      features: ["4WD", "Towing package", "Extended cab"]
    },
    conversations: [
      {
        type: "message",
        content: "Great news Carlos! Your loan has been approved and we're ready to finalize your truck purchase.",
        timestamp: "2025-04-21T12:00:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Charlie Brown",
    assignedSpecialist: "Kayam"
  },
  {
    id: "sl4",
    customerName: "Linda Nguyen",
    phoneNumber: "(555) 789-0123",
    email: "linda.nguyen@example.com",
    chaseStatus: "Manual Review",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "High debt-to-income ratio",
    sentiment: "Negative",
    lastTouchpoint: "2025-04-20T09:45:00Z",
    nextAction: {
      type: "Review credit report",
      dueDate: "2025-04-23T09:00:00Z",
      isAutomated: false,
      isOverdue: true
    },
    scriptProgress: {
      currentStep: "screening",
      completedSteps: ["contacted"]
    },
    creditProfile: {
      scoreRange: "580-620",
      knownIssues: ["Multiple credit cards", "High balances"]
    },
    vehiclePreference: "Minivan",
    conversations: [
      {
        type: "message",
        content: "Hi Linda, we need to discuss your credit situation before proceeding.",
        timestamp: "2025-04-20T09:45:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Bob Williams",
    assignedSpecialist: "Andrea"
  },
  {
    id: "sl5",
    customerName: "Robert Brown",
    phoneNumber: "(555) 234-5678",
    email: "robert.brown@example.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Partial",
    fundingReadinessReason: "Waiting on bank statements",
    sentiment: "Neutral",
    lastTouchpoint: "2025-04-22T14:00:00Z",
    nextAction: {
      type: "Request bank statements",
      dueDate: "2025-04-24T12:00:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "qualification",
      completedSteps: ["contacted", "screening"]
    },
    creditProfile: {
      scoreRange: "650-700",
      knownIssues: []
    },
    vehiclePreference: "Sports Car",
    conversations: [
      {
        type: "message",
        content: "Hi Robert, please upload your latest bank statements to continue your application.",
        timestamp: "2025-04-22T14:00:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Alice Johnson",
    assignedSpecialist: "Ian"
  },
  {
    id: "sl6",
    customerName: "Susan Davis",
    phoneNumber: "(555) 876-5432",
    email: "susan.davis@example.com",
    chaseStatus: "Paused",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "Insufficient credit history",
    sentiment: "Ghosted",
    lastTouchpoint: "2025-04-19T11:15:00Z",
    nextAction: {
      type: "Send follow-up email",
      dueDate: "2025-04-23T11:00:00Z",
      isAutomated: true,
      isOverdue: true
    },
    scriptProgress: {
      currentStep: "screening",
      completedSteps: ["contacted"]
    },
    creditProfile: {
      scoreRange: "550-600",
      knownIssues: ["No credit history"]
    },
    vehiclePreference: "Compact Car",
    conversations: [
      {
        type: "message",
        content: "Hi Susan, we haven't heard back from you. Please contact us to discuss your options.",
        timestamp: "2025-04-19T11:15:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Bob Williams",
    assignedSpecialist: "Kayam"
  },
  {
    id: "sl7",
    customerName: "Michael Johnson",
    phoneNumber: "(555) 345-6789",
    email: "michael.johnson@example.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Ready",
    fundingReadinessReason: "Awaiting final approval",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-23T08:00:00Z",
    nextAction: {
      type: "Confirm approval",
      dueDate: "2025-04-23T15:00:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "routing",
      completedSteps: ["contacted", "screening", "qualification"]
    },
    creditProfile: {
      scoreRange: "700-750",
      knownIssues: []
    },
    vehiclePreference: "Luxury Car",
    vehicleInterest: {
      type: "Luxury Car",
      budget: {
        min: 35000,
        max: 50000
      },
      downPayment: 8000,
      features: ["Leather seats", "Navigation", "Sunroof", "Premium sound"]
    },
    conversations: [
      {
        type: "message",
        content: "Hi Michael, your application is under review. We'll update you soon.",
        timestamp: "2025-04-23T08:00:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Alice Johnson",
    assignedSpecialist: "Andrea"
  },
  {
    id: "sl8",
    customerName: "Marcus Chen",
    phoneNumber: "(555) 234-5678",
    email: "mchen@email.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Partial",
    fundingReadinessReason: "Waiting on proof of residence",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-23T08:15:00Z",
    nextAction: {
      type: "Follow up on documents",
      dueDate: "2025-04-23T16:00:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "qualification",
      completedSteps: ["contacted", "screening"]
    },
    creditProfile: {
      scoreRange: "580-620",
      knownIssues: ["Recent Late Payment", "High DTI"]
    },
    conversations: [
      {
        type: "message",
        content: "Hi Marcus, following up on the proof of residence. Did you get a chance to scan those utility bills?",
        timestamp: "2025-04-23T08:15:00Z",
        sentBy: "system"
      },
      {
        type: "message",
        content: "Yes, I'll send them tonight after work",
        timestamp: "2025-04-23T08:20:00Z",
        sentBy: "lead"
      }
    ],
    assignedAgent: "Sarah Wilson",
    assignedSpecialist: "Ian"
  },
  {
    id: "sl9",
    customerName: "Rachel Martinez",
    phoneNumber: "(555) 876-5432",
    email: "rmartinez@email.com",
    chaseStatus: "Manual Review",
    fundingReadiness: "Ready",
    fundingReadinessReason: "All documents verified",
    sentiment: "Needs Human",
    lastTouchpoint: "2025-04-23T09:30:00Z",
    nextAction: {
      type: "Schedule test drive",
      dueDate: "2025-04-23T17:00:00Z",
      isAutomated: false,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "routing",
      completedSteps: ["contacted", "screening", "qualification"]
    },
    conversations: [
      {
        type: "message",
        content: "Great news! Your application has been pre-approved. Would you like to schedule a test drive?",
        timestamp: "2025-04-23T09:30:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Mike Thompson",
    assignedSpecialist: "Kayam"
  },
  {
    id: "sl10",
    customerName: "David Kim",
    phoneNumber: "(555) 345-6789",
    email: "dkim@email.com",
    chaseStatus: "Paused",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "Credit score too low",
    sentiment: "Frustrated",
    lastTouchpoint: "2025-04-22T14:20:00Z",
    nextAction: {
      type: "Review application",
      dueDate: "2025-04-23T12:00:00Z",
      isAutomated: false,
      isOverdue: true
    },
    scriptProgress: {
      currentStep: "screening",
      completedSteps: ["contacted"]
    },
    creditProfile: {
      scoreRange: "520-550",
      knownIssues: ["Multiple Collections", "Recent Bankruptcy"]
    },
    conversations: [
      {
        type: "message",
        content: "I don't understand why I can't get approved. I have a good job now.",
        timestamp: "2025-04-22T14:20:00Z",
        sentBy: "lead"
      }
    ],
    assignedAgent: "Lisa Chen",
    assignedSpecialist: "Andrea"
  },
  {
    id: "sl11",
    customerName: "Sarah Wilson",
    phoneNumber: "(555) 987-1234",
    email: "swilson@email.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Partial",
    fundingReadinessReason: "Missing proof of residence",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-23T11:30:00Z",
    nextAction: {
      type: "Document Collection",
      dueDate: "2025-04-24T11:30:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "qualification",
      completedSteps: ["contacted", "screening"]
    },
    creditProfile: {
      scoreRange: "640-680",
      knownIssues: ["Recent Hard Inquiry"]
    },
    conversations: [
      {
        type: "message",
        content: "Hi Sarah, please send your utility bill for address verification.",
        timestamp: "2025-04-23T11:30:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Mike Thompson",
    assignedSpecialist: "Ian"
  },
  {
    id: "sl12",
    customerName: "James Lee",
    phoneNumber: "(555) 456-7890",
    email: "jlee@email.com",
    chaseStatus: "Manual Review",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "Recent bankruptcy discharge",
    sentiment: "Frustrated",
    lastTouchpoint: "2025-04-22T13:45:00Z",
    nextAction: {
      type: "Credit Review",
      dueDate: "2025-04-23T13:45:00Z",
      isAutomated: false,
      isOverdue: true
    },
    scriptProgress: {
      currentStep: "screening",
      completedSteps: ["contacted"]
    },
    creditProfile: {
      scoreRange: "560-600",
      knownIssues: ["Recent Bankruptcy", "Multiple Collections"]
    },
    conversations: [
      {
        type: "message",
        content: "I've been waiting for an update on my application for days now.",
        timestamp: "2025-04-22T13:45:00Z",
        sentBy: "lead"
      }
    ],
    assignedAgent: "Lisa Chen",
    assignedSpecialist: "Kayam"
  },
  {
    id: "sl13",
    customerName: "Maria Garcia",
    phoneNumber: "(555) 789-0123",
    email: "mgarcia@email.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Ready",
    fundingReadinessReason: "All documents verified",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-23T10:15:00Z",
    nextAction: {
      type: "Schedule Signing",
      dueDate: "2025-04-24T10:15:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "submitted",
      completedSteps: ["contacted", "screening", "qualification", "routing"]
    },
    creditProfile: {
      scoreRange: "700-740",
      knownIssues: []
    },
    conversations: [
      {
        type: "message",
        content: "Great! Looking forward to finalizing everything tomorrow.",
        timestamp: "2025-04-23T10:15:00Z",
        sentBy: "lead"
      }
    ],
    assignedAgent: "Bob Williams",
    assignedSpecialist: "Andrea"
  },
  {
    id: "sl14",
    customerName: "Alex Thompson",
    phoneNumber: "(555) 234-5678",
    email: "athompson@email.com",
    chaseStatus: "Paused",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "Income verification failed",
    sentiment: "Ghosted",
    lastTouchpoint: "2025-04-20T15:00:00Z",
    nextAction: {
      type: "Follow-up call",
      dueDate: "2025-04-23T15:00:00Z",
      isAutomated: true,
      isOverdue: true
    },
    scriptProgress: {
      currentStep: "screening",
      completedSteps: ["contacted"]
    },
    creditProfile: {
      scoreRange: "600-640",
      knownIssues: ["Inconsistent Income"]
    },
    conversations: [
      {
        type: "call",
        content: "Left voicemail requesting callback",
        timestamp: "2025-04-20T15:00:00Z",
        sentBy: "agent"
      }
    ],
    assignedAgent: "Sarah Wilson",
    assignedSpecialist: "Ian"
  }
];

// Utility functions for direct in-memory data manipulation
export const deleteLeadFromMemory = (leadId: string): boolean => {
  const index = subprimeLeads.findIndex(lead => lead.id === leadId);
  if (index !== -1) {
    subprimeLeads.splice(index, 1);
    console.log(`🗑️ Deleted lead ${leadId} from memory. ${subprimeLeads.length} leads remaining.`);
    return true;
  }
  return false;
};

export const deleteAllLeadsFromMemory = (): number => {
  const deletedCount = subprimeLeads.length;
  subprimeLeads.splice(0); // Clear the entire array
  console.log(`🗑️ Deleted all ${deletedCount} leads from memory.`);
  return deletedCount;
};

export const getLeadsCount = (): number => {
  return subprimeLeads.length;
};
