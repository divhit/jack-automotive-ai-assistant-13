# ElevenLabs Conditional Syntax Guide

## ❌ **CONDITIONALS NOT SUPPORTED**

**UPDATE:** ElevenLabs does NOT support conditional logic in the first message field. It only supports simple variable substitution like `{{variable_name}}`.

The syntax below was attempted but ElevenLabs treats these as dynamic variables that need values:

```
{{if_variable_name}}  ← ElevenLabs treats this as a variable
  Text to show if variable exists
{{else}}              ← ElevenLabs treats this as a variable
  Text to show if variable doesn't exist
{{if}}                ← ElevenLabs treats this as a variable
```

## ✅ **Fixed First Message (Simple Variables Only)**

**Copy this into ElevenLabs "First message" field:**

```
Hi {{customer_name}}! Jack from {{organization_name}} here. I'm here to help you with your vehicle financing. Are you available to chat for a few minutes?
```

## 📝 **The Solution**

Instead of using conditionals, rely on the **system prompt** to handle context variations. The system prompt has access to all dynamic variables and can adapt Jack's responses based on:

- `{{conversation_context}}` - Contains conversation history
- `{{previous_summary}}` - Contains call summaries  
- `{{lead_status}}` - Indicates if returning customer or new inquiry

The **first message** should be simple and work for all scenarios, while the **system prompt** handles the contextual adaptation throughout the conversation.

## ✅ **Best Practice**

- **First message:** Simple, professional greeting that works for everyone
- **System prompt:** Use dynamic variables to adapt conversation flow
- **Context handling:** Let Jack reference previous conversations naturally in his responses

This approach gives you the flexibility you need while working within ElevenLabs' limitations! 