# Jack's First Message Templates for ElevenLabs

## Empathetic Subprime Lead Greetings

### OUTBOUND - Initial Contact (New Lead from Affiliate)

**Random Selection (one of these):**

1. `Hey {{customer_name}}, I know dealing with car financing can feel overwhelming, especially when credit's been a challenge. I'm here to help make this easier for you - no pressure, no judgment.`

2. `Hey {{customer_name}}, I understand getting approved for a car loan can be tough when credit's not perfect. That's exactly why I'm reaching out - I work with folks in your situation every day.`

3. `Hey {{customer_name}}, I get it - financing a vehicle when you've had credit challenges can be stressful. I wanted to personally reach out because I've helped a lot of people in similar situations.`

4. `Hey {{customer_name}}, I know the car buying process can feel really stressful, especially when credit's been an issue. I'm here to walk you through this with real options that actually work.`

**Note:** Each includes `{{day_context}}` or `{{time_greeting}}` dynamically (e.g., "Happy Friday!" or "Good afternoon!")

---

### OUTBOUND - Follow-up (Returning Customer)

**Context-aware responses:**

- **About SUV/Vehicle:** `Hey {{customer_name}}! {{day_context}} I wanted to follow up about that SUV we discussed. Have you had a chance to think it over?`

- **About Financing:** `Hey {{customer_name}}! {{day_context}} I've been looking into your financing options and wanted to share some good news with you.`

- **About Trade-in:** `Hey {{customer_name}}! {{day_context}} I wanted to follow up on your trade-in - I think I can get you a better number than we discussed.`

- **General Check-in:** `Hey {{customer_name}}! {{day_context}} I wanted to check in with you and see where you're at with everything.`

---

### INBOUND - New Caller

`Hey {{customer_name}}! {{day_context}} Thanks for calling. I know this whole process can feel overwhelming - I'm here to make it as simple as possible for you. What's on your mind?`

---

### INBOUND - Returning Caller

**Context-aware:**

- **About Financing:** `Hey {{customer_name}}! {{day_context}} Good to hear from you again. Let's pick up where we left off with your financing - I've got some updates for you.`

- **General:** `Hey {{customer_name}}! {{day_context}} Thanks for getting back to me. What can I help you with?`

---

## Dynamic Variables Used

- `{{customer_name}}` - Lead's first name
- `{{day_context}}` - Day-specific greeting (e.g., "Happy Friday!", "Hope you're having a great Monday!")
- `{{time_greeting}}` - Time-based greeting (e.g., "Good morning!", "Good afternoon!", "Good evening!")
- Conversation history context automatically determines which template to use

---

## Key Principles

✅ **Empathetic** - Acknowledges credit challenges without judgment
✅ **Supportive** - "I'm here to help" messaging throughout
✅ **Personal** - Uses customer name and conversation history
✅ **No Pressure** - Explicitly states "no pressure, no judgment"
✅ **Context-Aware** - Different messages for initial vs. returning, inbound vs. outbound
✅ **Honest** - "I work with folks in your situation every day"

---

## Implementation in ElevenLabs

The system automatically selects the appropriate first message based on:
- **Call direction:** Inbound vs. Outbound
- **Customer history:** New vs. Returning
- **Previous conversation:** SUV interest, financing discussion, trade-in, etc.
- **Time/Day:** Adds dynamic greeting based on Pacific Time

All messages flow through the same `first_message_dynamic` variable, so you can use this single dynamic variable in your ElevenLabs agent configuration.
