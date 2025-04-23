import { SubprimeLead } from './types';

export const subprimeLeads: SubprimeLead[] = [
  {
    id: "sl1",
    customerName: "John Smith",
    phoneNumber: "(555) 123-4567",
    email: "john.123@example.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Ready",
    fundingReadinessReason: "All documents submitted and verified",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-23T10:00:00Z",
    nextAction: {
      type: "Schedule test drive",
      dueDate: "2025-04-24T14:00:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "routing",
      completedSteps: ["contacted", "screening", "qualification"]
    },
    creditProfile: {
      scoreRange: "680-720",
      knownIssues: []
    },
    vehiclePreference: "SUV",
    conversations: [
      {
        type: "message",
        content: "Hi John, just confirming your test drive appointment for tomorrow.",
        timestamp: "2025-04-23T10:00:00Z",
        sentBy: "system"
      },
      {
        type: "message",
        content: "Yes, I'll be there!",
        timestamp: "2025-04-23T10:05:00Z",
        sentBy: "lead"
      }
    ],
    assignedAgent: "Alice Johnson"
  },
  {
    id: "sl2",
    customerName: "Emily White",
    phoneNumber: "(555) 987-6543",
    email: "emily.white@example.com",
    chaseStatus: "Paused",
    fundingReadiness: "Partial",
    fundingReadinessReason: "Waiting on proof of income",
    sentiment: "Neutral",
    lastTouchpoint: "2025-04-22T16:30:00Z",
    nextAction: {
      type: "Request pay stubs",
      dueDate: "2025-04-25T10:00:00Z",
      isAutomated: true,
      isOverdue: false
    },
    scriptProgress: {
      currentStep: "qualification",
      completedSteps: ["contacted", "screening"]
    },
    creditProfile: {
      scoreRange: "620-680",
      knownIssues: ["Short credit history"]
    },
    vehiclePreference: "Sedan",
    conversations: [
      {
        type: "message",
        content: "Hi Emily, please upload your latest pay stubs to continue your application.",
        timestamp: "2025-04-22T16:30:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Bob Williams"
  },
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
    conversations: [
      {
        type: "message",
        content: "Hi Carlos, your truck will be delivered on Thursday at 3 PM.",
        timestamp: "2025-04-21T12:00:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Alice Johnson"
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
    assignedAgent: "Bob Williams"
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
    assignedAgent: "Alice Johnson"
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
    assignedAgent: "Bob Williams"
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
    conversations: [
      {
        type: "message",
        content: "Hi Michael, your application is under review. We'll update you soon.",
        timestamp: "2025-04-23T08:00:00Z",
        sentBy: "system"
      }
    ],
    assignedAgent: "Alice Johnson"
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
    assignedAgent: "Sarah Wilson"
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
    assignedAgent: "Mike Thompson"
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
    assignedAgent: "Lisa Chen"
  }
];
