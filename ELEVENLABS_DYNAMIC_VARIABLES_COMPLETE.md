# ElevenLabs Dynamic Variables - Complete Configuration Guide

## 🚫 **ISSUE RESOLVED: No Conditionals in First Message**

ElevenLabs **does not support conditional logic** in the first message field. It only supports simple variable substitution.

## ✅ **Fixed First Message (No Conditionals)**

**Copy this into ElevenLabs "First message" field:**

```
Hi {{customer_name}}! Jack from {{organization_name}} here. I'm an AI assistant specializing in vehicle financing, and I can help get you driving quickly. I have experienced financing experts behind me who work with all credit situations. Would you like to chat now or prefer I follow up via text?
```

---

## 🎯 **Complete Dynamic Variables List**

Your server is already passing these variables to ElevenLabs. **Make sure ALL of these are configured in your ElevenLabs dashboard:**

### **1. Primary Variables (Always Sent)**
| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `customer_name` | Customer's actual name | "John Smith" |
| `organization_name` | Dealership name | "Premium Auto Sales" |
| `conversation_context` | SMS/call history | "Customer interested in Honda Civic, budget $400/month" |
| `lead_status` | Lead classification | "Returning Customer" or "New Inquiry" |
| `previous_summary` | AI summary of past calls | "Customer approved for $25k financing, looking at SUVs" |

### **2. System Variables (For Context)**
| Variable Name | Description | Example Value |
|---------------|-------------|---------------|
| `organization_id` | Organization ID | "org_123456" |
| `caller_type` | Call classification | "existing_lead" or "new_caller" |

---

## 🔧 **ElevenLabs Dashboard Configuration**

### **Step 1: Add All Variables**
In your ElevenLabs agent dashboard, go to **"Dynamic Variables"** and add each variable:

1. **customer_name**
   - Type: String
   - Placeholder: "Customer"

2. **organization_name**  
   - Type: String
   - Placeholder: "Jack Automotive"

3. **conversation_context**
   - Type: String  
   - Placeholder: "New conversation - no previous history"

4. **lead_status**
   - Type: String
   - Placeholder: "New Inquiry"

5. **previous_summary**
   - Type: String
   - Placeholder: "First conversation"

6. **organization_id**
   - Type: String
   - Placeholder: "org_default"

7. **caller_type**
   - Type: String
   - Placeholder: "new_caller"

### **Step 2: Update System Prompt**
Use the content from `JACK_NEW_SYSTEM_PROMPT.md` - it already has all the variable references:

- `{{customer_name}}` - Always uses actual name
- `{{organization_name}}` - Always uses actual organization
- `{{conversation_context}}` - References conversation history
- `{{previous_summary}}` - References call summaries
- `{{lead_status}}` - Adapts behavior based on lead type

---

## 🎬 **How It Works**

### **Outbound Calls**
When you make an outbound call via `/api/elevenlabs/outbound-call`, your server:

1. **Loads conversation history** from SMS/previous calls
2. **Fetches organization name** from database
3. **Builds conversation context** with relevant details
4. **Sends all variables** to ElevenLabs in `conversation_initiation_client_data.dynamic_variables`

### **Inbound Calls**
When someone calls your Twilio number:

1. **ElevenLabs calls your webhook** at `/api/webhooks/elevenlabs/conversation-initiation`
2. **Your server identifies the caller** and loads their history
3. **Returns dynamic variables** in the webhook response
4. **ElevenLabs starts conversation** with full context

---

## 🎯 **Expected Results**

### **For Premium Auto Sales (John Smith calling back):**
- **First message:** *"Hi John Smith! Jack from Premium Auto Sales here. I'm an AI assistant specializing in vehicle financing..."*
- **Context-aware:** Jack references their previous interest in Honda Civic and $400/month budget
- **Professional:** Maintains Premium Auto Sales branding throughout

### **For Downtown Motors (New customer Sarah):**
- **First message:** *"Hi Sarah! Jack from Downtown Motors here. I'm an AI assistant specializing in vehicle financing..."*
- **Fresh start:** Jack treats it as new conversation but with Downtown Motors branding
- **Consistent:** Uses Downtown Motors specific context and approach

---

## 📋 **Testing Checklist**

✅ **Variables configured in ElevenLabs dashboard**
✅ **System prompt references all variables with {{}} syntax**
✅ **First message uses simple variables (no conditionals)**
✅ **Test outbound call - Jack says customer's actual name**
✅ **Test outbound call - Jack says organization's actual name**
✅ **Test inbound call - Jack has conversation context**
✅ **Test follow-up call - Jack references previous conversation**

---

## 🛠️ **Current Server Implementation**

Your server is already correctly passing these variables! The implementation is in:

- **Outbound calls:** `server.js` line ~1535 (`conversation_initiation_client_data.dynamic_variables`)
- **Inbound calls:** `server.js` line ~3240 (`response.dynamic_variables`)

The issue was just that ElevenLabs doesn't support conditional logic in the first message field. With the simple variable substitution, everything should work perfectly! 