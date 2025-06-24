# 🔧 Context Preservation Setup Guide

## Problem Solved
This guide fixes the issue where conversation context (SMS ↔ Voice) was not being maintained properly. The ElevenLabs agent was ignoring our conversation context and treating each call as a cold call.

## Root Cause
- ElevenLabs agents require **dynamic variables** to be configured in the dashboard
- The system prompt must reference these variables using `{{variable_name}}` syntax  
- Context must be sent as `dynamic_variables` in the `conversation_initiation_client_data`

---

## 🎯 **Step 1: Configure Dynamic Variables in ElevenLabs Dashboard**

### A. Add Custom Dynamic Variables
In your ElevenLabs agent dashboard, go to **Dynamic Variables** section and click **"Add Variable"** for each:

| Variable Name | Type | Description |
|---------------|------|-------------|
| `conversation_context` | String | Complete SMS/voice conversation history with context |
| `customer_name` | String | Customer name (can be enhanced with lead data lookup) |
| `lead_status` | String | Current lead status (New Inquiry/Returning Customer) |
| `previous_summary` | String | Summary from previous voice calls |

### B. Set Placeholder Values (for testing)
- `conversation_context`: "No previous conversation"
- `customer_name`: "Valued Customer"  
- `lead_status`: "New Inquiry"
- `previous_summary`: "No previous calls"

---

## 🎯 **Step 2: Update System Prompt**

Replace your current system prompt with this enhanced version that uses dynamic variables:

```
Jack - Automotive Lead Qualification Agent

## Core Identity
You are Jack, an empathetic lead qualification specialist for automotive financing. Your role is to connect with subprime customers who've expressed interest in vehicle financing, understand their needs, and guide qualified prospects to speak with a human sales specialist.

## CRITICAL: CONVERSATION CONTEXT
{{conversation_context}}

## CUSTOMER INFORMATION
- Customer: {{customer_name}}
- Lead Status: {{lead_status}}  
- Previous Call Summary: {{previous_summary}}

## Your Communication Style
**Genuinely Human**: You speak like a real person having a real conversation - warm, natural, and never scripted

**Contextually Aware**: You always remember where your last conversation ended and pick up naturally from there

**IMPORTANT CONTEXT USAGE**: 
- If you have conversation context above, reference specific details from recent messages
- For example, if they mentioned "Mazda CX-5", "electric vehicle under $20k", or "SUV", acknowledge and build on those details
- Never ignore previous conversation history - always continue naturally from where you left off
- If they said they were interested in specific vehicles, financing amounts, or features, reference those details

## Understanding Your Customers
Subprime customers often face:
- Previous credit challenges or limited credit history
- Concerns about approval and interest rates  
- Need for reliable transportation for work/family
- Desire for respect and understanding, not judgment

## Your Conversation Goals
1. **Acknowledge Context**: Reference previous conversations naturally
2. **Build on Previous Interests**: Continue discussing vehicles, financing, or topics they mentioned
3. **Gather Information**: Understand their transportation needs, budget, timeline
4. **Qualify Interest**: Determine if they're ready to move forward
5. **Schedule Next Step**: Connect qualified leads with human specialists

## Response Guidelines
- Keep responses conversational and under 2-3 sentences initially
- Reference specific details from previous conversations when relevant
- Ask follow-up questions about topics they've already expressed interest in
- Be helpful and maintain context from all previous interactions
- If switching from SMS to voice or vice versa, acknowledge the previous conversation naturally
```

---

## 🎯 **Step 3: Configure Webhook in ElevenLabs**

### A. Enable Conversation Initiation Webhook
1. In your agent's **Security** tab, enable **"Fetch initiation client data from webhook"**
2. Click **"Add webhook"** 

### B. Set Webhook URL
Use your ngrok URL:
```
https://your-ngrok-url.ngrok-free.app/api/webhooks/elevenlabs/conversation-initiation
```

### C. Method: POST (default)

---

## 🎯 **Step 4: Update First Message (Optional)**

You can also use dynamic variables in the first message:

```
Hi {{customer_name}}! This is Jack from automotive financing. {{#if previous_summary}}I wanted to follow up on our previous conversation about {{previous_summary}}.{{else}}I'm calling about your vehicle financing inquiry.{{/if}} How are you doing today?
```

---

## 🎯 **Step 5: Test the Implementation**

### A. Start Your Servers
```bash
# Terminal 1: Start app
npm run dev:full

# Terminal 2: Start ngrok  
ngrok http 3001
```

### B. Test Flow
1. **SMS Conversation**: Send SMS about "SUV" or "Mazda CX-5"
2. **Initiate Voice Call**: Use the telephony interface to call
3. **Verify Context**: Agent should reference the SMS conversation
4. **Post-Call SMS**: Send another SMS to verify voice context is preserved

### C. Check Logs
Look for these log entries:
```
📞 Building conversation initiation data for +1234567890
✅ Returning conversation initiation data: { contextLength: 450, messageCount: 4 }
🔄 ElevenLabs Conversation Initiation Webhook received
```

---

## 🎯 **Expected Results**

### ✅ **Before Fix (Broken)**
- Voice call: "Hi, I'm calling about vehicle financing. What kind of transportation do you need?"
- Ignores previous SMS about "Mazda CX-5"

### ✅ **After Fix (Working)**  
- Voice call: "Hi! I wanted to follow up on your interest in the Mazda CX-5 we were discussing. How are you feeling about that SUV option?"
- References specific details from SMS conversation

---

## 🔧 **Technical Implementation Details**

### Webhook Response Format
The webhook now returns:
```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "conversation_context": "CONVERSATION CONTEXT for customer +1234567890:\n\nRECENT SMS CONVERSATION:\nCustomer: I need an SUV\nAgent: Great! Are you thinking Mazda CX-5?\nCustomer: Yes, that sounds good\n\nINSTRUCTIONS: Continue this conversation naturally...",
    "customer_name": "Valued Customer",
    "lead_status": "Returning Customer", 
    "previous_summary": "Customer interested in Mazda CX-5 SUV"
  }
}
```

### Context Building Logic
- Includes call summary (if available) from previous voice calls
- Shows recent 3 SMS + 3 voice messages for immediate context
- Provides clear instructions for natural conversation continuation
- Maintains context across all communication channels

---

## 🚀 **Ready for Deployment**

Once tested locally, this same configuration will work in production. The webhook endpoint is already configured for deployment to Render.com.

**Next Steps**: Deploy to production and update the ElevenLabs webhook URL to point to your production domain. 