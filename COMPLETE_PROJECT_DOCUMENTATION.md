# Complete Project Documentation: Multi-Tenant Automotive AI Assistant

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Authentication & Authorization](#authentication--authorization)
4. [Multi-Tenant Organization System](#multi-tenant-organization-system)
5. [Database Schema & Supabase Setup](#database-schema--supabase-setup)
6. [ElevenLabs Voice AI Integration](#elevenlabs-voice-ai-integration)
7. [Twilio SMS/Voice Integration](#twilio-smsvoice-integration)
8. [Dynamic Variables System](#dynamic-variables-system)
9. [Security & Data Isolation](#security--data-isolation)
10. [Phone Number Management](#phone-number-management)
11. [Development Setup](#development-setup)
12. [Deployment Guide](#deployment-guide)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

### What This System Does
This is a multi-tenant automotive AI assistant system that provides:
- **Voice AI conversations** via ElevenLabs
- **SMS conversations** via Twilio
- **Lead management** with CRM functionality
- **Organization-based data isolation**
- **Real-time conversation streaming**
- **Context preservation** across voice/SMS channels

### Key Features
- **Multi-tenant architecture** - Each dealership gets isolated data
- **Cross-channel continuity** - SMS → Voice → SMS with context preservation
- **Real-time UI updates** - Live conversation streaming to web dashboard
- **Security-first design** - Complete data isolation between organizations
- **Comprehensive analytics** - Call tracking, lead scoring, conversion metrics

### Technology Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Voice AI**: ElevenLabs Conversational AI
- **SMS/Voice**: Twilio
- **Authentication**: Custom JWT + Supabase Auth
- **Real-time**: Server-Sent Events (SSE)
- **Deployment**: Render.com

---

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Backend API   │    │   Supabase DB   │
│   (React App)   │◄──►│  (Node.js/Express)│◄──►│  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼─────┐ ┌───────▼─────┐ ┌──────▼──────┐
        │ ElevenLabs  │ │   Twilio    │ │   Render    │
        │  Voice AI   │ │  SMS/Voice  │ │  Hosting    │
        └─────────────┘ └─────────────┘ └─────────────┘
```

### Data Flow
1. **Customer calls/texts** → Twilio → ElevenLabs/Backend
2. **AI processes** → Context from Database → Response
3. **Response sent** → Twilio → Customer
4. **Real-time updates** → SSE → Frontend UI
5. **All data stored** → Supabase with organization isolation

---

## Authentication & Authorization

### Overview
The system uses a custom JWT-based authentication system with Supabase integration for secure, organization-scoped access.

### Key Files
- `src/contexts/AuthContext.tsx` - Frontend auth context
- `src/components/auth/LoginForm.tsx` - Login UI
- `src/components/auth/SignupForm.tsx` - Signup UI
- `server.js` - Backend auth middleware

### Database Tables
```sql
-- Users table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);
```

### Authentication Flow
1. **User Registration**:
   ```javascript
   POST /api/auth/register
   {
     "email": "john@dealership.com",
     "password": "secure_password",
     "fullName": "John Smith",
     "organizationName": "Premium Auto Sales"
   }
   ```

2. **Login Process**:
   ```javascript
   POST /api/auth/login
   {
     "email": "john@dealership.com",
     "password": "secure_password"
   }
   ```

3. **JWT Token Structure**:
   ```javascript
   {
     "userId": "uuid",
     "email": "john@dealership.com",
     "organizationId": "uuid",
     "role": "user",
     "exp": timestamp
   }
   ```

### Authorization Middleware
```javascript
// validateOrganizationAccess middleware
async function validateOrganizationAccess(req, res, next) {
  const authHeader = req.headers.authorization;
  const organizationId = req.headers.organizationId || req.query.organizationId;
  
  // Validate JWT token
  const token = authHeader?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Ensure organization access
  if (decoded.organizationId !== organizationId) {
    return res.status(403).json({ error: 'Organization access denied' });
  }
  
  req.userId = decoded.userId;
  req.organizationId = decoded.organizationId;
  next();
}
```

---

## Multi-Tenant Organization System

### Tenant Isolation Strategy
Every database operation is scoped by `organization_id` to ensure complete data isolation between tenants.

### Organization Structure
```sql
-- Main organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  default_phone_number_id UUID REFERENCES organization_phone_numbers(id)
);

-- Organization phone numbers (each org gets dedicated numbers)
CREATE TABLE organization_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  elevenlabs_phone_id VARCHAR(255),
  twilio_phone_sid VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tenant Scoping Examples
```javascript
// All database queries include organization_id
const { data: leads } = await supabase
  .from('leads')
  .select('*')
  .eq('organization_id', organizationId);

// Conversation history scoped by organization
const messages = await supabase
  .from('conversations')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('phone_number_normalized', phoneNumber);
```

### Organization Creation Flow
1. **User signs up** → Creates organization if doesn't exist
2. **Organization gets UUID** → All data linked to this ID
3. **Phone number purchased** → Linked to organization
4. **ElevenLabs setup** → Manual import, API activation

---

## Database Schema & Supabase Setup

### Core Tables

#### 1. User Profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Leads Management
```sql
CREATE TABLE leads (
  id VARCHAR(255) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  phone_number_normalized VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id),
  
  -- Status tracking
  chase_status VARCHAR(50) DEFAULT 'new',
  funding_readiness VARCHAR(50) DEFAULT 'unknown',
  funding_readiness_reason TEXT,
  sentiment VARCHAR(50) DEFAULT 'neutral',
  
  -- Script progress
  script_progress_current_step VARCHAR(100) DEFAULT 'contacted',
  script_progress_completed_steps JSONB DEFAULT '["contacted"]'::jsonb,
  
  -- Credit profile
  credit_score_range VARCHAR(50),
  credit_known_issues JSONB DEFAULT '[]'::jsonb,
  
  -- Vehicle preferences
  vehicle_preference VARCHAR(255),
  
  -- Timestamps
  last_touchpoint TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analytics
  total_conversations INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint per organization
  UNIQUE(organization_id, phone_number_normalized)
);
```

#### 3. Conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR(255) REFERENCES leads(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  phone_number_normalized VARCHAR(50) NOT NULL,
  
  -- Message content
  content TEXT NOT NULL,
  sent_by VARCHAR(50) NOT NULL, -- 'user' or 'agent'
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type VARCHAR(50) DEFAULT 'text', -- 'text', 'voice', 'sms'
  
  -- Telephony metadata
  twilio_message_sid VARCHAR(255),
  twilio_call_sid VARCHAR(255),
  elevenlabs_conversation_id VARCHAR(255),
  
  -- Context preservation
  dynamic_variables JSONB DEFAULT '{}'::jsonb,
  conversation_context TEXT,
  message_status VARCHAR(50) DEFAULT 'sent'
);
```

#### 4. Conversation Summaries
```sql
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_normalized VARCHAR(50) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Summary content
  summary TEXT NOT NULL,
  summary_type VARCHAR(50) DEFAULT 'elevenlabs', -- 'elevenlabs', 'comprehensive'
  
  -- Metadata
  total_messages INTEGER DEFAULT 0,
  voice_messages INTEGER DEFAULT 0,
  sms_messages INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint per organization
  UNIQUE(organization_id, phone_number_normalized)
);
```

#### 5. Call Sessions (Analytics)
```sql
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  lead_id VARCHAR(255) REFERENCES leads(id),
  
  -- Call details
  elevenlabs_conversation_id VARCHAR(255),
  twilio_call_sid VARCHAR(255),
  phone_number_normalized VARCHAR(50),
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Outcomes
  call_outcome VARCHAR(100),
  sentiment_score FLOAT,
  lead_quality_score FLOAT,
  next_action VARCHAR(255),
  
  -- ElevenLabs analytics
  elevenlabs_data JSONB DEFAULT '{}'::jsonb
);
```

### Supabase Configuration

#### 1. Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database URL for direct connections
DATABASE_URL=postgresql://user:pass@host:port/database
```

#### 2. Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for leads
CREATE POLICY "Users can only access their organization's leads"
ON leads FOR ALL
USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

#### 3. Database Functions
```sql
-- Function to get organization by phone number
CREATE OR REPLACE FUNCTION get_organization_by_phone_number(phone VARCHAR(50))
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_phone_numbers
  WHERE phone_number = phone AND is_active = true
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ElevenLabs Voice AI Integration

### Overview
ElevenLabs provides the conversational AI that handles voice calls with dynamic context injection.

### Key Configuration Files
- `ELEVENLABS_SETUP.md` - Detailed setup guide
- `ELEVENLABS_VARIABLES_GUIDE.md` - Dynamic variables reference
- `server.js` - Backend integration logic

### Environment Variables
```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=your_webhook_secret
```

### Agent Configuration
The ElevenLabs agent is configured with dynamic variables for context-aware conversations:

```javascript
const dynamicVariables = {
  customer_name: "John Smith",
  organization_name: "Premium Auto Sales",
  lead_status: "Returning Customer",
  previous_summary: "Previous conversation summary...",
  conversation_context: "Recent message history...",
  vehicle_interest: "Honda Civic",
  budget_range: "$400/month",
  credit_score_range: "600-650"
};
```

### Outbound Call Implementation
```javascript
// POST /api/elevenlabs/outbound-call
app.post('/api/elevenlabs/outbound-call', validateOrganizationAccess, async (req, res) => {
  const { phoneNumber, leadId } = req.body;
  const { organizationId } = req;
  
  // Get organization-specific phone number
  const orgPhone = await getOrganizationPhoneNumber(organizationId);
  
  // Build conversation context
  const conversationContext = await buildConversationContext(phoneNumber, organizationId);
  const summary = await getConversationSummary(phoneNumber, organizationId);
  
  const callPayload = {
    agent_id: process.env.ELEVENLABS_AGENT_ID,
    agent_phone_number_id: orgPhone.elevenLabsPhoneId,
    to_number: phoneNumber,
    conversation_initiation_client_data: {
      lead_id: leadId,
      organization_id: organizationId,
      dynamic_variables: {
        conversation_context: conversationContext,
        customer_name: leadData.customerName,
        organization_name: organizationName,
        previous_summary: summary?.summary || "First conversation"
      }
    }
  };
  
  const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    body: JSON.stringify(callPayload)
  });
});
```

### Inbound Call Webhook
```javascript
// POST /api/webhooks/elevenlabs/conversation-initiation
app.post('/api/webhooks/elevenlabs/conversation-initiation', async (req, res) => {
  const { caller_id } = req.body;
  
  // Get organization from phone number
  const organizationId = await getOrganizationIdFromPhone(caller_id);
  
  // Load conversation context
  const conversationContext = await buildConversationContext(caller_id, organizationId);
  const summary = await getConversationSummary(caller_id, organizationId);
  
  // Return dynamic variables for ElevenLabs
  res.json({
    dynamic_variables: {
      conversation_context: conversationContext,
      customer_name: leadData?.customerName || "Customer",
      organization_name: organizationName,
      previous_summary: summary?.summary || "First conversation",
      lead_status: summary ? "Returning Customer" : "New Inquiry"
    }
  });
});
```

### Post-Call Processing
```javascript
// POST /api/webhooks/elevenlabs/post-call
app.post('/api/webhooks/elevenlabs/post-call', async (req, res) => {
  const { data } = req.body;
  
  // Extract call data
  const transcript = data.transcript;
  const summary = data.analysis?.transcript_summary;
  const phoneNumber = data.metadata?.customer_phone_number;
  
  // Get organization context
  const organizationId = await getOrganizationIdFromPhone(phoneNumber);
  
  // Store conversation history
  for (const entry of transcript) {
    await supabasePersistence.persistConversationMessage(
      phoneNumber,
      entry.message,
      entry.role === 'agent' ? 'agent' : 'user',
      'voice',
      { 
        organizationId,
        elevenlabsConversationId: data.conversation_id,
        timeInCallSecs: entry.time_in_call_secs
      }
    );
  }
  
  // Store conversation summary
  if (summary) {
    await storeConversationSummary(phoneNumber, summary, organizationId);
  }
});
```

---

## Twilio SMS/Voice Integration

### Overview
Twilio handles SMS and voice telephony routing to/from ElevenLabs.

### Environment Variables
```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
SERVER_URL=https://your-domain.com
```

### Phone Number Management
Each organization gets its own dedicated Twilio phone number to prevent customer confusion.

#### Purchase Phone Numbers
```javascript
// POST /api/admin/organizations/:orgId/phone-numbers/purchase
async function purchaseTwilioNumberForOrganization(organizationId, areaCode = '778') {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  // Search for available numbers
  const availableNumbers = await client.availablePhoneNumbers('CA')
    .local
    .list({ areaCode: areaCode, limit: 1 });
  
  if (availableNumbers.length === 0) {
    throw new Error(`No available numbers in area code ${areaCode}`);
  }
  
  const phoneNumber = availableNumbers[0].phoneNumber;
  
  // Purchase the number
  const purchasedNumber = await client.incomingPhoneNumbers.create({
    phoneNumber: phoneNumber,
    voiceUrl: 'https://api.us.elevenlabs.io/twilio/inbound_call',
    smsUrl: `${process.env.SERVER_URL}/api/webhooks/twilio/sms/incoming`,
    voiceMethod: 'POST',
    smsMethod: 'POST'
  });
  
  // Store in database
  await client.query(`
    INSERT INTO organization_phone_numbers (
      organization_id, phone_number, twilio_phone_sid, is_active
    ) VALUES ($1, $2, $3, true)
  `, [organizationId, phoneNumber, purchasedNumber.sid]);
  
  return { phoneNumber, twilioSid: purchasedNumber.sid };
}
```

### SMS Webhook Handler
```javascript
// POST /api/webhooks/twilio/sms/incoming
app.post('/api/webhooks/twilio/sms/incoming', async (req, res) => {
  const { From, To, Body, MessageSid } = req.body;
  
  // Route to organization by phone number
  const organizationId = await getOrganizationByPhoneNumber(To);
  
  if (!organizationId) {
    console.error(`No organization found for phone number ${To}`);
    return res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
  
  // Store incoming message
  await addToConversationHistory(From, Body, 'user', 'text', organizationId);
  
  // Broadcast to UI
  broadcastConversationUpdate({
    type: 'sms_received',
    phoneNumber: From,
    message: Body,
    organizationId: organizationId
  });
  
  // Start SMS conversation with context
  const existingHistory = await getConversationHistory(From, organizationId);
  startConversationWithTimeout(From, Body, organizationId);
  
  res.set('Content-Type', 'text/xml');
  res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});
```

### SMS Outbound Sending
```javascript
// POST /api/twilio/send-sms
app.post('/api/twilio/send-sms', validateOrganizationAccess, async (req, res) => {
  const { to, message, leadId } = req.body;
  const { organizationId } = req;
  
  // Get organization phone number
  const orgPhone = await getOrganizationPhoneNumber(organizationId);
  
  // Send SMS via Twilio
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const result = await client.messages.create({
    body: message,
    from: orgPhone.phoneNumber,
    to: to
  });
  
  // Store in conversation history
  await addToConversationHistory(to, message, 'agent', 'text', organizationId);
  
  // Broadcast to UI
  broadcastConversationUpdate({
    type: 'sms_sent',
    phoneNumber: to,
    message: message,
    leadId: leadId,
    organizationId: organizationId
  });
});
```

---

## Dynamic Variables System

### Overview
Dynamic variables allow the AI agent to access real-time context from the CRM system during conversations.

### Variable Types

#### 1. Customer Information
```javascript
{
  customer_name: "John Smith",
  phone_number_normalized: "+16041234567",
  email: "john@example.com",
  lead_status: "Returning Customer|Active Lead|New Inquiry"
}
```

#### 2. Organization Context
```javascript
{
  organization_name: "Premium Auto Sales",
  organization_id: "uuid",
  assigned_agent: "Sarah Johnson",
  assigned_specialist: "Mike Chen"
}
```

#### 3. Conversation History
```javascript
{
  conversation_context: "Recent message history...",
  previous_summary: "Previous call summary...",
  total_messages: 15,
  last_interaction: "2024-01-15T10:30:00Z"
}
```

#### 4. Lead Qualification
```javascript
{
  funding_readiness: "pre-approved|needs-work|unknown",
  credit_score_range: "650-700",
  vehicle_interest: "Honda Civic",
  budget_range: "$400/month",
  sentiment: "positive|neutral|negative"
}
```

### Context Building Function
```javascript
async function buildConversationContext(phoneNumber, organizationId) {
  // Get conversation history
  const messages = await getConversationHistory(phoneNumber, organizationId);
  
  // Build context from recent messages
  const recentMessages = messages.slice(-10); // Last 10 messages
  let context = "";
  
  for (const msg of recentMessages) {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const speaker = msg.sentBy === 'user' ? 'Customer' : 'Agent';
    const channel = msg.type === 'voice' ? '[Voice]' : '[SMS]';
    
    context += `${timestamp} ${channel} ${speaker}: ${msg.content}\n`;
  }
  
  return context;
}
```

### Smart Context Truncation
```javascript
function createSmartContextSummary(fullContext, history, summaryData) {
  const MAX_CONTEXT_LENGTH = 100000; // 100K characters
  
  if (fullContext.length <= MAX_CONTEXT_LENGTH) {
    return fullContext;
  }
  
  // When context is too long, provide summary + recent messages
  const summary = summaryData?.summary || "Long conversation history";
  const recentMessages = history.slice(-3); // Last 3 messages
  
  let smartContext = `CONVERSATION SUMMARY:\n${summary}\n\nRECENT MESSAGES:\n`;
  
  for (const msg of recentMessages) {
    const speaker = msg.sentBy === 'user' ? 'Customer' : 'Agent';
    smartContext += `${speaker}: ${msg.content}\n`;
  }
  
  return smartContext;
}
```

---

## Security & Data Isolation

### Multi-Tenant Security Model
Every operation is scoped by `organization_id` to prevent cross-tenant data access.

### Key Security Features

#### 1. Authentication Middleware
```javascript
async function validateOrganizationAccess(req, res, next) {
  const authHeader = req.headers.authorization;
  const organizationId = req.headers.organizationId || req.query.organizationId;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate organization access
    if (decoded.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Organization access denied' });
    }
    
    req.userId = decoded.userId;
    req.organizationId = decoded.organizationId;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### 2. Database Query Scoping
```javascript
// All queries include organization_id
const getLeads = async (organizationId) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId);
  
  return data;
};

const getConversationHistory = async (phoneNumber, organizationId) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('phone_number_normalized', phoneNumber)
    .eq('organization_id', organizationId) // Critical for isolation
    .order('timestamp', { ascending: true });
  
  return data;
};
```

#### 3. Cross-Organization Conflict Detection
```javascript
async function getOrganizationIdFromPhone(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Check if phone exists in multiple organizations
  const { data: allMatches } = await supabase
    .from('leads')
    .select('organization_id, id, customer_name')
    .eq('phone_number_normalized', normalized);
  
  if (allMatches.length > 1) {
    console.warn(`⚠️ Phone ${normalized} exists in multiple organizations - ambiguous lookup`);
    return null; // Requires explicit organizationId
  }
  
  return allMatches[0]?.organization_id || null;
}
```

#### 4. Memory Storage Isolation
```javascript
// Organization-scoped memory keys
function createOrgMemoryKey(organizationId, phoneNumber) {
  return `${organizationId}:${normalizePhoneNumber(phoneNumber)}`;
}

// Conversation history stored by organization
const conversationHistory = new Map(); // Key: "orgId:phoneNumber"

function addToConversationHistory(phoneNumber, message, sentBy, messageType, organizationId) {
  if (!organizationId) {
    console.error('🚨 SECURITY: Cannot add conversation history without organizationId');
    return;
  }
  
  const orgKey = createOrgMemoryKey(organizationId, phoneNumber);
  
  if (!conversationHistory.has(orgKey)) {
    conversationHistory.set(orgKey, []);
  }
  
  conversationHistory.get(orgKey).push({
    content: message,
    sentBy,
    type: messageType,
    timestamp: new Date().toISOString()
  });
}
```

### Security Audit Functions
```javascript
// Regular security audits
async function auditCrossOrganizationAccess() {
  // Check for conversations without organization_id
  const { data: orphanedConversations } = await supabase
    .from('conversations')
    .select('*')
    .is('organization_id', null);
  
  if (orphanedConversations.length > 0) {
    console.error('🚨 SECURITY AUDIT: Found orphaned conversations without organization_id');
  }
  
  // Check for duplicate phone numbers across organizations
  const { data: duplicatePhones } = await supabase
    .from('leads')
    .select('phone_number_normalized, organization_id')
    .order('phone_number_normalized');
  
  const phoneGroups = {};
  for (const lead of duplicatePhones) {
    const phone = lead.phone_number_normalized;
    if (!phoneGroups[phone]) phoneGroups[phone] = [];
    phoneGroups[phone].push(lead.organization_id);
  }
  
  for (const [phone, orgIds] of Object.entries(phoneGroups)) {
    if (orgIds.length > 1) {
      console.warn(`⚠️ Phone ${phone} exists in multiple organizations:`, orgIds);
    }
  }
}
```

---

## Phone Number Management

### Overview
Each organization gets dedicated phone numbers to prevent customer confusion and ensure proper routing.

### Architecture
```
Organization A → Phone +1-555-0001 → ElevenLabs Phone ID A
Organization B → Phone +1-555-0002 → ElevenLabs Phone ID B
```

### Workflow
1. **Purchase Twilio Number** (Automated)
2. **Import to ElevenLabs** (Manual)
3. **Activate in Database** (API)
4. **Ready for Use** (Automatic)

### Database Schema
```sql
CREATE TABLE organization_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  elevenlabs_phone_id VARCHAR(255),
  twilio_phone_sid VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

#### 1. Purchase Phone Number
```javascript
// POST /api/admin/organizations/:orgId/phone-numbers/purchase
app.post('/api/admin/organizations/:organizationId/phone-numbers/purchase', async (req, res) => {
  const { organizationId } = req.params;
  const { areaCode = '778' } = req.body;
  
  try {
    const result = await purchaseTwilioNumberForOrganization(organizationId, areaCode);
    
    res.json({
      success: true,
      phoneNumber: result.phoneNumber,
      twilioSid: result.twilioSid,
      organizationId,
      nextSteps: [
        "Import this number to ElevenLabs dashboard",
        "Assign to your conversational AI agent",
        "Call /api/admin/phone-numbers/{phone}/activate with ElevenLabs phone ID"
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. Activate Phone Number
```javascript
// POST /api/admin/phone-numbers/:phone/activate
app.post('/api/admin/phone-numbers/:phone/activate', async (req, res) => {
  const { phone } = req.params;
  const { elevenLabsPhoneId } = req.body;
  
  try {
    const result = await activateOrganizationPhoneNumber(phone, elevenLabsPhoneId);
    
    res.json({
      success: true,
      phoneNumber: phone,
      elevenLabsPhoneId,
      status: 'active',
      message: 'Phone number activated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 3. List Organization Phone Numbers
```javascript
// GET /api/organizations/:orgId/phone-numbers
app.get('/api/organizations/:organizationId/phone-numbers', validateOrganizationAccess, async (req, res) => {
  const { organizationId } = req.params;
  
  const { data: phoneNumbers } = await supabase
    .from('organization_phone_numbers')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  res.json({
    success: true,
    phoneNumbers: phoneNumbers || [],
    organizationId
  });
});
```

### Helper Functions
```javascript
async function getOrganizationPhoneNumber(organizationId) {
  const { data: phoneRecord } = await supabase
    .from('organization_phone_numbers')
    .select('phone_number, elevenlabs_phone_id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();
  
  if (!phoneRecord) {
    throw new Error(`Organization ${organizationId} does not have an active phone number configured`);
  }
  
  if (!phoneRecord.elevenlabs_phone_id) {
    throw new Error(`Phone number ${phoneRecord.phone_number} needs to be imported to ElevenLabs and activated`);
  }
  
  return {
    phoneNumber: phoneRecord.phone_number,
    elevenLabsPhoneId: phoneRecord.elevenlabs_phone_id
  };
}

async function getOrganizationByPhoneNumber(phoneNumber) {
  const { data: phoneRecord } = await supabase
    .from('organization_phone_numbers')
    .select('organization_id')
    .eq('phone_number', phoneNumber)
    .eq('is_active', true)
    .single();
  
  return phoneRecord?.organization_id || null;
}
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (via Supabase)
- Twilio Account
- ElevenLabs Account
- Git

### Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/jack-automotive-ai-assistant.git
cd jack-automotive-ai-assistant

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Environment Variables
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://user:pass@host:port/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# ElevenLabs
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id
ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET=your_webhook_secret

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Server
PORT=3001
SERVER_URL=http://localhost:3001  # or your ngrok/production URL
```

### Database Migration
```bash
# Run database migrations
npm run migrate

# Or manually run SQL files
psql $DATABASE_URL -f supabase-multi-tenant-schema.sql
psql $DATABASE_URL -f organization-phone-numbers-schema-FIXED.sql
```

### Development Commands
```bash
# Start backend server
npm run server

# Start frontend (in separate terminal)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Local Development Workflow
1. **Start backend**: `npm run server`
2. **Start frontend**: `npm run dev`
3. **Use ngrok for webhooks**: `ngrok http 3001`
4. **Update webhook URLs** in Twilio/ElevenLabs dashboards
5. **Test SMS/Voice calls** with your phone numbers

---

## Deployment Guide

### Render.com Deployment

#### 1. Create Render Service
```yaml
# render.yaml
services:
  - type: web
    name: jack-automotive-ai-assistant
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      # ... other environment variables
```

#### 2. Environment Variables
Set all environment variables in Render dashboard:
- Database credentials
- API keys (ElevenLabs, Twilio)
- JWT secret
- Server URL (your Render app URL)

#### 3. Database Connection
```javascript
// Use connection pooling for production
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

#### 4. Webhook Configuration
After deployment, update webhook URLs:

**ElevenLabs Webhooks:**
- Conversation Initiation: `https://your-app.onrender.com/api/webhooks/elevenlabs/conversation-initiation`
- Post-Call: `https://your-app.onrender.com/api/webhooks/elevenlabs/post-call`

**Twilio Webhooks:**
- SMS: `https://your-app.onrender.com/api/webhooks/twilio/sms/incoming`
- Voice: `https://api.us.elevenlabs.io/twilio/inbound_call`

### Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    database: supabasePersistence.isConnected ? 'connected' : 'disconnected'
  });
});
```

### Monitoring
```javascript
// Error tracking
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Send to monitoring service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Send to monitoring service
});
```

---

## Troubleshooting

### Common Issues

#### 1. "No organizationId" Errors
**Symptoms**: Security warnings about missing organizationId
**Cause**: Phone number exists in multiple organizations
**Solution**: 
```javascript
// Check for duplicate phone numbers
SELECT phone_number_normalized, COUNT(*), array_agg(organization_id) 
FROM leads 
GROUP BY phone_number_normalized 
HAVING COUNT(*) > 1;

// Remove duplicates or update organizationId in function calls
```

#### 2. ElevenLabs Webhook Not Working
**Symptoms**: Calls don't have conversation context
**Cause**: Webhook URL not configured or unreachable
**Solution**:
```bash
# Test webhook endpoint
curl -X POST https://your-app.onrender.com/api/webhooks/elevenlabs/conversation-initiation \
  -H "Content-Type: application/json" \
  -d '{"caller_id": "+1234567890", "agent_id": "your_agent_id"}'

# Check ElevenLabs dashboard webhook configuration
```

#### 3. SMS Not Routing to Organization
**Symptoms**: SMS webhook returns 404
**Cause**: Phone number not in organization_phone_numbers table
**Solution**:
```sql
-- Check phone number mapping
SELECT * FROM organization_phone_numbers WHERE phone_number = '+1234567890';

-- Add missing phone number
INSERT INTO organization_phone_numbers (organization_id, phone_number, twilio_phone_sid, is_active)
VALUES ('your-org-id', '+1234567890', 'your-twilio-sid', true);
```

#### 4. Database Connection Issues
**Symptoms**: "Supabase connection failed" errors
**Cause**: Wrong credentials or network issues
**Solution**:
```javascript
// Test database connection
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testConnection() {
  const { data, error } = await supabase.from('organizations').select('count');
  console.log('Database test:', error ? error.message : 'Connected');
}
```

#### 5. Real-time Updates Not Working
**Symptoms**: SMS/calls don't appear in UI
**Cause**: SSE connection issues or wrong leadId
**Solution**:
```javascript
// Check SSE connections
console.log('Active SSE connections:', Array.from(sseConnections.keys()));

// Verify leadId mapping
console.log('Phone to lead mapping:', Array.from(phoneToLeadMapping.entries()));
```

### Debug Commands
```bash
# Check server logs
tail -f /var/log/your-app.log

# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM organizations;"

# Test Twilio webhook
curl -X POST http://localhost:3001/api/webhooks/twilio/sms/incoming \
  -d "From=+1234567890&To=+1987654321&Body=Hello&MessageSid=test"

# Check ElevenLabs agent status
curl -H "xi-api-key: your-api-key" \
  "https://api.elevenlabs.io/v1/convai/agents/your-agent-id"
```

### Performance Optimization
```javascript
// Connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Memory cleanup
setInterval(() => {
  // Clean up old conversation timeouts
  const now = Date.now();
  for (const [key, timeout] of activeConversationTimeouts.entries()) {
    if (now - timeout.created > 300000) { // 5 minutes
      clearTimeout(timeout.id);
      activeConversationTimeouts.delete(key);
    }
  }
}, 60000); // Clean up every minute
```

---

## Summary

This documentation covers the complete architecture and implementation of the multi-tenant automotive AI assistant system. The system provides:

- **Secure multi-tenant architecture** with complete data isolation
- **Cross-channel conversation continuity** (SMS ↔ Voice)
- **Real-time UI updates** with Server-Sent Events
- **Dynamic context injection** for personalized AI conversations
- **Comprehensive lead management** with CRM functionality
- **Organization-specific phone numbers** for proper routing

The system is designed to be scalable, secure, and easy to maintain, with comprehensive error handling and monitoring capabilities.

For additional questions or troubleshooting, refer to the specific configuration files mentioned throughout this documentation. 