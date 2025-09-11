// Customer conversations dummy data
export const customerConversations = [
  {
    id: "C1001",
    customerName: "John Smith",
    customerPhone: "(555) 123-4567",
    vehicleInquiry: "2021 BMW X5",
    lastMessagePreview: "Thanks for the information. Would it be possible to schedule a test drive this weekend?",
    timestamp: "2025-04-13T15:30:00",
    status: "Active",
    leadSource: "Website",
    messages: [
      {
        type: "incoming",
        message: "Hi, I'm interested in the 2021 BMW X5 I saw on your website. Is it still available?",
        timestamp: "2025-04-13T14:15:00"
      },
      {
        type: "outgoing",
        message: "Hello John, this is Jack from Prestige Motors. Yes, the 2021 BMW X5 xDrive40i in Alpine White is still available. It has 15,670 miles and is priced at $62,950. Would you like more information?",
        timestamp: "2025-04-13T14:20:00"
      },
      {
        type: "incoming",
        message: "What kind of financing options do you offer?",
        timestamp: "2025-04-13T14:45:00"
      },
      {
        type: "outgoing",
        message: "We offer competitive financing through several lenders with rates starting at 4.9% APR for qualified buyers. We also have lease options available. Would you prefer financing or leasing?",
        timestamp: "2025-04-13T14:50:00"
      },
      {
        type: "incoming",
        message: "Thanks for the information. Would it be possible to schedule a test drive this weekend?",
        timestamp: "2025-04-13T15:30:00"
      }
    ]
  },
  {
    id: "C1002",
    customerName: "Sarah Johnson",
    customerPhone: "(555) 234-5678",
    vehicleInquiry: "2022 Acura MDX",
    lastMessagePreview: "Perfect, I'll see you Saturday at 2pm for the test drive.",
    timestamp: "2025-04-12T16:45:00",
    status: "Active",
    leadSource: "AutoTrader",
    messages: [
      {
        type: "incoming",
        message: "Hello, I'm looking for information on the 2022 Acura MDX you have listed.",
        timestamp: "2025-04-12T09:30:00"
      },
      {
        type: "outgoing",
        message: "Hi Sarah, Jack here from Prestige Motors. Our 2022 Acura MDX Advance Package features Majestic Black Pearl exterior, Espresso leather interior, and has only 8,920 miles. It's priced at $55,995. Would you like to know more about its features?",
        timestamp: "2025-04-12T09:45:00"
      },
      {
        type: "incoming",
        message: "Yes, could you tell me about the safety features and technology package?",
        timestamp: "2025-04-12T10:15:00"
      },
      {
        type: "outgoing",
        message: "This MDX comes with the Technology and Advance packages, which include: adaptive cruise control, collision mitigation braking, lane keeping assist, blind spot information, surround-view camera, premium ELS Studio audio, and wireless charging. Would you like to schedule a time to see it in person?",
        timestamp: "2025-04-12T10:30:00"
      },
      {
        type: "incoming",
        message: "I'd love to see it in person. Do you have availability this Saturday?",
        timestamp: "2025-04-12T11:00:00"
      },
      {
        type: "outgoing",
        message: "We have openings for test drives this Saturday at 10am, 2pm, or 4pm. Would any of those times work for you?",
        timestamp: "2025-04-12T11:15:00"
      },
      {
        type: "incoming",
        message: "Perfect, I'll see you Saturday at 2pm for the test drive.",
        timestamp: "2025-04-12T16:45:00"
      }
    ]
  },
  {
    id: "C1003",
    customerName: "Michael Brown",
    customerPhone: "(555) 345-6789",
    vehicleInquiry: "2020 Tesla Model 3",
    lastMessagePreview: "I'll be stopping by tomorrow at 3pm as planned for the test drive.",
    timestamp: "2025-04-11T14:20:00",
    status: "Test Drive Scheduled",
    leadSource: "Walk-in",
    messages: [
      {
        type: "incoming",
        message: "Hi, do you still have the 2020 Tesla Model 3 available?",
        timestamp: "2025-04-10T08:30:00"
      },
      {
        type: "outgoing",
        message: "Good morning Michael, Jack from Prestige Motors here. Yes, the 2020 Tesla Model 3 Long Range is available. It has 23,450 miles and features Pearl White exterior with Black interior. It's priced at $44,990. Are you familiar with Tesla vehicles?",
        timestamp: "2025-04-10T08:45:00"
      },
      {
        type: "incoming",
        message: "I've driven a friend's Model 3 before but never owned an EV. What's the battery range on this one?",
        timestamp: "2025-04-10T09:15:00"
      },
      {
        type: "outgoing",
        message: "This Model 3 Long Range has an EPA-estimated range of 322 miles on a full charge. The battery health is excellent, showing less than 5% degradation from new. Would you like information about charging options or setting up a test drive?",
        timestamp: "2025-04-10T09:30:00"
      },
      {
        type: "incoming",
        message: "I'd like to schedule a test drive. Is tomorrow afternoon possible?",
        timestamp: "2025-04-10T10:00:00"
      },
      {
        type: "outgoing",
        message: "We can definitely arrange a test drive for tomorrow afternoon. We have availability at 1pm, 3pm, and 5pm. Which time works best for you?",
        timestamp: "2025-04-10T10:15:00"
      },
      {
        type: "incoming",
        message: "Let's do 3pm tomorrow. Also, do you have the performance package on this Model 3?",
        timestamp: "2025-04-10T10:45:00"
      },
      {
        type: "outgoing",
        message: "Great, I've scheduled your test drive for tomorrow at 3pm. This Model 3 is the Long Range Dual Motor AWD, not the Performance version. However, it still does 0-60 in 4.2 seconds. The Long Range prioritizes extended range over the slightly quicker acceleration of the Performance model. Will that be suitable for your needs?",
        timestamp: "2025-04-10T11:00:00"
      },
      {
        type: "incoming",
        message: "I'll be stopping by tomorrow at 3pm as planned for the test drive.",
        timestamp: "2025-04-11T14:20:00"
      }
    ]
  },
  {
    id: "C1004",
    customerName: "Emily Davis",
    customerPhone: "(555) 456-7890",
    vehicleInquiry: "2019 Audi Q7",
    lastMessagePreview: "Thank you for all your help. The extended warranty gives me peace of mind. I'm very happy with my new Q7!",
    timestamp: "2025-04-09T17:30:00",
    status: "Closed",
    leadSource: "Facebook Marketplace",
    messages: [
      {
        type: "incoming",
        message: "Hello, I'm interested in the 2019 Audi Q7 you have available.",
        timestamp: "2025-04-07T10:00:00"
      },
      {
        type: "outgoing",
        message: "Hi Emily, Jack from Prestige Motors here. We have a beautiful 2019 Audi Q7 Prestige with 31,890 miles, Glacier White exterior and Nougat Brown interior. It's priced at $48,995. What would you like to know about it?",
        timestamp: "2025-04-07T10:15:00"
      },
      {
        type: "incoming",
        message: "Does it have the third-row seating option? And what about the sound system?",
        timestamp: "2025-04-07T10:45:00"
      },
      {
        type: "outgoing",
        message: "Yes, this Q7 does have third-row seating, configurable for 7 passengers. It features the premium Bang & Olufsen 3D sound system with 23 speakers - one of the best audio systems available in any SUV. Would you like to see this vehicle in person?",
        timestamp: "2025-04-07T11:00:00"
      },
      {
        type: "incoming",
        message: "Thank you for all your help. The extended warranty gives me peace of mind. I'm very happy with my new Q7!",
        timestamp: "2025-04-09T17:30:00"
      }
    ]
  },
  {
    id: "C1005",
    customerName: "Robert Wilson",
    customerPhone: "(555) 567-8901",
    vehicleInquiry: "2023 Ford F-150",
    lastMessagePreview: "I'm specifically looking for the Lariat with the towing package. Do you have one in stock?",
    timestamp: "2025-04-13T11:45:00",
    status: "New",
    leadSource: "Website",
    messages: [
      {
        type: "incoming",
        message: "Hi, I'm looking for a 2023 Ford F-150 with towing capabilities.",
        timestamp: "2025-04-13T11:00:00"
      },
      {
        type: "outgoing",
        message: "Hello Robert, Jack from Prestige Motors here. We have a 2023 Ford F-150 Lariat with only 5,670 miles. It comes with the towing package capable of towing up to 13,500 lbs. It's priced at $58,990. Are you looking for any specific features in your F-150?",
        timestamp: "2025-04-13T11:15:00"
      },
      {
        type: "incoming",
        message: "I'm specifically looking for the Lariat with the towing package. Do you have one in stock?",
        timestamp: "2025-04-13T11:45:00"
      }
    ]
  }
];
