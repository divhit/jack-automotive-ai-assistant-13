
// Types for subprime leads
export interface SubprimeLead {
  id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  chaseStatus: "Auto Chase Running" | "Paused" | "Completed" | "Manual Review";
  fundingReadiness: "Not Ready" | "Partial" | "Ready";
  fundingReadinessReason: string;
  sentiment: "Warm" | "Neutral" | "Negative" | "Ghosted" | "Cold" | "Frustrated" | "Needs Human";
  lastTouchpoint: string; // ISO date string
  nextAction: {
    type: string;
    dueDate: string; // ISO date string
    isAutomated: boolean;
    isOverdue: boolean;
  };
  creditProfile?: {
    scoreRange?: string;
    knownIssues?: string[];
  };
  vehiclePreference?: string;
  scriptProgress: {
    contacted: boolean;
    screening: boolean;
    qualification: boolean;
    routing: boolean;
    submitted: boolean;
    currentStep: "contacted" | "screening" | "qualification" | "routing" | "submitted";
  };
  conversations: {
    timestamp: string; // ISO date string
    type: "sms" | "voice" | "system" | "note";
    content: string;
    sentBy?: "lead" | "system" | "agent";
  }[];
  assignedAgent?: string;
  notes?: string[];
}

// Subprime leads mock data
export const subprimeLeads: SubprimeLead[] = [
  {
    id: "SP001",
    customerName: "Marcus Johnson",
    phoneNumber: "(555) 123-9876",
    email: "mjohnson@example.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Partial",
    fundingReadinessReason: "Income verification incomplete",
    sentiment: "Neutral",
    lastTouchpoint: "2025-04-23T10:15:00",
    nextAction: {
      type: "Follow-up via SMS",
      dueDate: "2025-04-23T13:15:00",
      isAutomated: true,
      isOverdue: false
    },
    creditProfile: {
      scoreRange: "520-580",
      knownIssues: ["Late payments", "High utilization"]
    },
    vehiclePreference: "Used SUV under $15k",
    scriptProgress: {
      contacted: true,
      screening: true,
      qualification: false,
      routing: false,
      submitted: false,
      currentStep: "screening"
    },
    conversations: [
      {
        timestamp: "2025-04-22T14:30:00",
        type: "sms",
        content: "Hi Marcus, this is Jack from Prestige Motors. I understand you're looking for an affordable SUV. We have several options that might work with your situation. Would you like to discuss financing options?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-22T15:45:00",
        type: "sms",
        content: "Yes, I'm interested but I've had credit issues in the past.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-22T15:50:00",
        type: "sms",
        content: "No problem Marcus, we work with many lenders who specialize in helping customers with past credit challenges. Could I ask about your current employment status to help find the right financing options?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-22T16:15:00",
        type: "sms",
        content: "Been at my job for about 8 months, making around $3,200/month.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-23T10:15:00",
        type: "sms",
        content: "That's helpful information, Marcus. Would you be able to provide proof of income like a recent pay stub? This would help us match you with the best financing options.",
        sentBy: "system"
      }
    ],
    assignedAgent: "Auto-Jack",
    notes: ["Customer seems hesitant about credit check", "Looking for low down payment options"]
  },
  {
    id: "SP002",
    customerName: "Tasha Williams",
    phoneNumber: "(555) 234-8765",
    chaseStatus: "Paused",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "Disengaged after income questions",
    sentiment: "Ghosted",
    lastTouchpoint: "2025-04-21T09:45:00",
    nextAction: {
      type: "Manual call required",
      dueDate: "2025-04-23T14:00:00",
      isAutomated: false,
      isOverdue: true
    },
    creditProfile: {
      scoreRange: "Below 520",
      knownIssues: ["Recent bankruptcy", "Collections"]
    },
    vehiclePreference: "Economy car with low payments",
    scriptProgress: {
      contacted: true,
      screening: true,
      qualification: false,
      routing: false,
      submitted: false,
      currentStep: "screening"
    },
    conversations: [
      {
        timestamp: "2025-04-20T11:30:00",
        type: "sms",
        content: "Hi Tasha, this is Jack from Prestige Motors. I see you're interested in affordable vehicle options. We have several programs specifically designed for customers rebuilding their credit. Would you like to explore these options?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-20T12:15:00",
        type: "sms",
        content: "Yes, I need a car ASAP but my credit is bad because of my bankruptcy last year.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-20T12:20:00",
        type: "sms",
        content: "I understand, Tasha. Many of our customers have successfully gotten financing after bankruptcy. To help find the right program, could you share your current employment details and approximate monthly income?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-20T13:45:00",
        type: "sms",
        content: "I work part-time at two jobs, making about $2,400 total each month.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-20T13:50:00",
        type: "sms",
        content: "Thank you for sharing that information. For our special financing programs, we'd need to verify your income. Would you be able to provide recent pay stubs from both jobs?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-21T09:45:00",
        type: "system",
        content: "Lead has not responded for 24+ hours. Script paused."
      }
    ],
    assignedAgent: "Sarah J.",
    notes: ["Customer expressed urgency", "Seems sensitive about bankruptcy discussion"]
  },
  {
    id: "SP003",
    customerName: "Derek Rodriguez",
    phoneNumber: "(555) 345-7654",
    email: "drodriguez@example.com",
    chaseStatus: "Completed",
    fundingReadiness: "Ready",
    fundingReadinessReason: "All docs received, pre-qualified",
    sentiment: "Warm",
    lastTouchpoint: "2025-04-22T16:30:00",
    nextAction: {
      type: "Schedule dealership visit",
      dueDate: "2025-04-24T10:00:00",
      isAutomated: false,
      isOverdue: false
    },
    creditProfile: {
      scoreRange: "580-620",
      knownIssues: ["Previous auto loan default", "Improving payment history"]
    },
    vehiclePreference: "Pickup truck, max $25k",
    scriptProgress: {
      contacted: true,
      screening: true,
      qualification: true,
      routing: true,
      submitted: true,
      currentStep: "submitted"
    },
    conversations: [
      {
        timestamp: "2025-04-20T09:15:00",
        type: "sms",
        content: "Hi Derek, this is Jack from Prestige Motors. I understand you're looking for a pickup truck. We have several options that might work with your credit situation. Would you like to discuss financing options?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-20T09:30:00",
        type: "sms",
        content: "Yes, I've had some credit problems but I've been working on fixing them. I need a reliable truck for work.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-20T09:35:00",
        type: "sms",
        content: "Great to hear you're working on improving your credit, Derek. That's an important step. To help find the best financing options for your truck, could you share details about your current employment and income?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-20T10:00:00",
        type: "sms",
        content: "I'm a contractor, been self-employed for 3 years. Make about $5,000 a month, can prove it with tax returns.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-21T14:15:00",
        type: "note",
        content: "Customer uploaded two years of tax returns showing stable income as self-employed contractor."
      },
      {
        timestamp: "2025-04-22T16:30:00",
        type: "sms",
        content: "Great news, Derek! Based on the documentation you've provided, you're pre-qualified for financing on several truck options in your price range. Would you like to schedule a time to visit the dealership to see them in person?",
        sentBy: "agent"
      }
    ],
    assignedAgent: "Michael T.",
    notes: ["Self-employed with good documentation", "Has $3,000 for down payment", "Prefers Ford F-150 or similar"]
  },
  {
    id: "SP004",
    customerName: "Alisha Carter",
    phoneNumber: "(555) 456-5432",
    chaseStatus: "Manual Review",
    fundingReadiness: "Partial",
    fundingReadinessReason: "Needs co-signer information",
    sentiment: "Frustrated",
    lastTouchpoint: "2025-04-23T09:15:00",
    nextAction: {
      type: "Critical follow-up call",
      dueDate: "2025-04-23T12:00:00",
      isAutomated: false,
      isOverdue: false
    },
    vehiclePreference: "Reliable sedan under $18k",
    scriptProgress: {
      contacted: true,
      screening: true,
      qualification: true,
      routing: false,
      submitted: false,
      currentStep: "qualification"
    },
    conversations: [
      {
        timestamp: "2025-04-21T13:45:00",
        type: "sms",
        content: "Hi Alisha, this is Jack from Prestige Motors. I understand you're looking for an affordable and reliable sedan. We have several options that might work with your situation. Would you like to discuss financing options?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-21T14:15:00",
        type: "sms",
        content: "Yes, but every dealer says they can help then makes me wait forever just to tell me no. Will this be different?",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-21T14:20:00",
        type: "sms",
        content: "I understand your frustration, Alisha. What makes us different is our transparent process and multiple financing partners who specialize in various credit situations. To give you an honest assessment, could I ask about your credit and income situation?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-22T08:30:00",
        type: "sms",
        content: "I have a 540 credit score, make $2,800/month at my job (2 years there), and have $1,200 for down payment.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-22T08:40:00",
        type: "sms",
        content: "Thank you for that information. Based on what you've shared, you may qualify for our special financing programs, but a co-signer could help secure better terms. Would you have someone willing to co-sign?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-22T09:15:00",
        type: "sms",
        content: "Maybe my mom but she's tired of co-signing for me. Why can't I just get approved on my own? My job is stable.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-22T11:30:00",
        type: "system",
        content: "Lead showing signs of frustration. Escalated to manual review."
      },
      {
        timestamp: "2025-04-23T09:15:00",
        type: "sms",
        content: "Alisha, this is Tom, a finance specialist at Prestige Motors. I've personally reviewed your situation and have a few options we might be able to work with using just your information. Could we schedule a quick call today to discuss these specific programs?",
        sentBy: "agent"
      }
    ],
    assignedAgent: "Tom B.",
    notes: ["Customer has had negative experiences with other dealerships", "Sensitive about co-signer requirement", "May qualify for first-time buyer program"]
  },
  {
    id: "SP005",
    customerName: "James Wilson",
    phoneNumber: "(555) 567-4321",
    email: "jwilson@example.com",
    chaseStatus: "Auto Chase Running",
    fundingReadiness: "Not Ready",
    fundingReadinessReason: "Unrealistic expectations",
    sentiment: "Negative",
    lastTouchpoint: "2025-04-23T08:30:00",
    nextAction: {
      type: "Follow-up call",
      dueDate: "2025-04-24T11:00:00",
      isAutomated: false,
      isOverdue: false
    },
    creditProfile: {
      scoreRange: "Below 520",
      knownIssues: ["Multiple recent delinquencies", "High debt-to-income"]
    },
    vehiclePreference: "Luxury sedan, nearly new",
    scriptProgress: {
      contacted: true,
      screening: true,
      qualification: false,
      routing: false,
      submitted: false,
      currentStep: "screening"
    },
    conversations: [
      {
        timestamp: "2025-04-22T10:15:00",
        type: "sms",
        content: "Hi James, this is Jack from Prestige Motors. I understand you're interested in a luxury vehicle. We have several options that might work with your situation. Would you like to discuss financing options?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-22T11:00:00",
        type: "sms",
        content: "I want a BMW 5 series, 2023 or newer, and I don't want to put more than $1000 down.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-22T11:15:00",
        type: "sms",
        content: "I understand you're interested in a premium vehicle. To match you with appropriate financing options for a newer BMW, could I ask about your current credit situation and income?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-22T12:30:00",
        type: "sms",
        content: "Credit isn't great right now but I make good money. About $3,500/month. Should be enough for what I want.",
        sentBy: "lead"
      },
      {
        timestamp: "2025-04-22T12:45:00",
        type: "sms",
        content: "Thank you for sharing that information. For a 2023 BMW 5 series, financing requirements would typically include a stronger credit profile or a substantial down payment. Would you be open to discussing alternatives that might better fit your current situation?",
        sentBy: "system"
      },
      {
        timestamp: "2025-04-23T08:30:00",
        type: "sms",
        content: "That's what every dealer says. I'm not interested in driving some cheap car just because of a few credit problems. Either help me get what I want or I'll go somewhere else.",
        sentBy: "lead"
      }
    ],
    assignedAgent: "Auto-Jack",
    notes: ["Customer has unrealistic expectations", "May need education on credit requirements for luxury vehicles"]
  }
];
