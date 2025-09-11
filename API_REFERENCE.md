# API Reference - Automotive AI Assistant

## Authentication

All API endpoints (except auth and webhooks) require authentication via JWT token.

### Headers Required
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "organizationId": "<organization_uuid>",
  "Content-Type": "application/json"
}
```

---

## Authentication Endpoints

### POST /api/auth/register
Create new user account and organization.

**Request:**
```json
{
  "email": "john@dealership.com",
  "password": "secure_password",
  "fullName": "John Smith",
  "organizationName": "Premium Auto Sales"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "john@dealership.com",
    "fullName": "John Smith",
    "organizationId": "uuid",
    "role": "user"
  },
  "organization": {
    "id": "uuid",
    "name": "Premium Auto Sales"
  }
}
```

### POST /api/auth/login
Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "john@dealership.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "john@dealership.com",
    "fullName": "John Smith",
    "organizationId": "uuid",
    "role": "user"
  }
}
```

---

## Lead Management

### GET /api/subprime/leads
Get all leads for organization.

**Query Parameters:**
- `limit` (optional): Number of leads to return
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "leads": [
    {
      "id": "sl_1234567890_abc123",
      "customerName": "John Smith",
      "phoneNumber": "(604) 555-1234",
      "email": "john@example.com",
      "organizationId": "uuid",
      "chaseStatus": "active",
      "fundingReadiness": "pre-approved",
      "sentiment": "positive",
      "vehiclePreference": "Honda Civic",
      "assignedAgent": "Sarah Johnson",
      "lastTouchpoint": "2024-01-15T10:30:00Z",
      "conversations": [],
      "totalConversations": 5
    }
  ],
  "total": 50,
  "organizationId": "uuid"
}
```

### POST /api/subprime/create-lead
Create new lead.

**Request:**
```json
{
  "id": "sl_1234567890_abc123",
  "customerName": "John Smith",
  "phoneNumber": "(604) 555-1234",
  "email": "john@example.com",
  "organizationId": "uuid",
  "chaseStatus": "new",
  "fundingReadiness": "unknown",
  "sentiment": "neutral",
  "vehiclePreference": "Honda Civic",
  "assignedAgent": "Sarah Johnson"
}
```

**Response:**
```json
{
  "success": true,
  "lead": { /* created lead object */ },
  "message": "Lead created successfully"
}
```

### PUT /api/subprime/update-lead/:leadId
Update existing lead.

**Request:**
```json
{
  "chaseStatus": "qualified",
  "fundingReadiness": "pre-approved",
  "sentiment": "positive",
  "assignedSpecialist": "Mike Chen"
}
```

### DELETE /api/subprime/delete-lead/:leadId
Delete lead and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "Lead deleted successfully",
  "leadId": "sl_1234567890_abc123"
}
```

---

## Communication Endpoints

### POST /api/elevenlabs/outbound-call
Initiate voice call via ElevenLabs.

**Request:**
```json
{
  "phoneNumber": "+16045551234",
  "leadId": "sl_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Outbound call initiated successfully",
  "callSid": "CA123...",
  "conversationId": "conv_123...",
  "phoneNumber": "+16045551234",
  "leadId": "sl_1234567890_abc123"
}
```

### POST /api/twilio/send-sms
Send SMS message.

**Request:**
```json
{
  "to": "+16045551234",
  "message": "Hi John, this is Jack from Premium Auto Sales...",
  "leadId": "sl_1234567890_abc123",
  "agentId": "manual-send"
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SM123...",
  "to": "+16045551234",
  "from": "+17655551234",
  "message": "Hi John, this is Jack...",
  "organizationId": "uuid"
}
```

---

## Conversation & Context

### GET /api/conversation-history/:leadId
Get conversation history for lead.

**Query Parameters:**
- `phoneNumber` (optional): Filter by phone number

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-1-1234567890",
      "content": "Hi, I'm interested in financing a Honda Civic",
      "timestamp": "2024-01-15T10:30:00Z",
      "sentBy": "user",
      "type": "sms",
      "status": "delivered"
    }
  ],
  "leadId": "sl_1234567890_abc123",
  "phoneNumber": "+16045551234",
  "summary": "Customer interested in Honda Civic financing...",
  "totalMessages": 5,
  "organizationId": "uuid"
}
```

### GET /api/stream/conversation/:leadId
Server-Sent Events stream for real-time updates.

**Query Parameters:**
- `phoneNumber`: Phone number to monitor
- `load`: Set to "true" to load initial conversation history

**Response:** SSE Stream
```
data: {"type": "connected", "leadId": "sl_123", "organizationId": "uuid"}

data: {"type": "sms_received", "phoneNumber": "+16045551234", "message": "Hello", "sentBy": "user"}

data: {"type": "sms_sent", "phoneNumber": "+16045551234", "message": "Hi there!", "sentBy": "agent"}
```

---

## Phone Number Management

### GET /api/organizations/:organizationId/phone-numbers
List organization phone numbers.

**Response:**
```json
{
  "success": true,
  "phoneNumbers": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "phoneNumber": "+17655551234",
      "elevenLabsPhoneId": "phnum_123...",
      "twilioPhoneSid": "PN123...",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "organizationId": "uuid"
}
```

### POST /api/admin/organizations/:organizationId/phone-numbers/purchase
Purchase new phone number for organization.

**Request:**
```json
{
  "areaCode": "778",
  "country": "CA"
}
```

**Response:**
```json
{
  "success": true,
  "phoneNumber": "+17785551234",
  "twilioSid": "PN123...",
  "organizationId": "uuid",
  "nextSteps": [
    "Import this number to ElevenLabs dashboard",
    "Assign to your conversational AI agent",
    "Call /api/admin/phone-numbers/{phone}/activate with ElevenLabs phone ID"
  ]
}
```

### POST /api/admin/phone-numbers/:phone/activate
Activate phone number after ElevenLabs import.

**Request:**
```json
{
  "elevenLabsPhoneId": "phnum_123..."
}
```

**Response:**
```json
{
  "success": true,
  "phoneNumber": "+17785551234",
  "elevenLabsPhoneId": "phnum_123...",
  "status": "active",
  "message": "Phone number activated successfully"
}
```

### POST /api/admin/phone-numbers/manual-add
Manually add phone number that was purchased outside the system.

**Request:**
```json
{
  "organizationId": "uuid",
  "phoneNumber": "+17785551234",
  "elevenLabsPhoneId": "phnum_123...",
  "twilioPhoneSid": "PN123..."
}
```

---

## Analytics Endpoints

### GET /api/analytics/global
Get global system analytics.

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalLeads": 1250,
    "totalConversations": 3420,
    "totalCallMinutes": 15680,
    "totalSmsMessages": 8940,
    "activeOrganizations": 45,
    "averageResponseTime": "2.3s",
    "conversionRate": "34.2%"
  }
}
```

### GET /api/analytics/lead/:leadId
Get analytics for specific lead.

**Response:**
```json
{
  "success": true,
  "leadId": "sl_1234567890_abc123",
  "analytics": {
    "totalConversations": 5,
    "totalCallMinutes": 23,
    "totalSmsMessages": 12,
    "averageResponseTime": "1.8s",
    "sentimentTrend": ["neutral", "positive", "positive"],
    "lastActivity": "2024-01-15T10:30:00Z",
    "conversionLikelihood": "high"
  }
}
```

---

## Webhook Endpoints

### POST /api/webhooks/elevenlabs/conversation-initiation
ElevenLabs webhook for inbound call context.

**Request:**
```json
{
  "caller_id": "+16045551234",
  "agent_id": "agent_123...",
  "called_number": "+17785551234",
  "call_sid": "CA123..."
}
```

**Response:**
```json
{
  "dynamic_variables": {
    "conversation_context": "Previous conversation history...",
    "customer_name": "John Smith",
    "organization_name": "Premium Auto Sales",
    "lead_status": "Returning Customer",
    "previous_summary": "Customer interested in Honda Civic..."
  }
}
```

### POST /api/webhooks/elevenlabs/post-call
ElevenLabs webhook for call completion.

**Request:**
```json
{
  "type": "conversation.ended",
  "data": {
    "conversation_id": "conv_123...",
    "transcript": [
      {
        "role": "user",
        "message": "Hi, I'm interested in financing a car",
        "timestamp": "2024-01-15T10:30:00Z",
        "time_in_call_secs": 5
      }
    ],
    "analysis": {
      "transcript_summary": "Customer interested in car financing...",
      "sentiment": "positive",
      "lead_quality": "high"
    },
    "metadata": {
      "customer_phone_number": "+16045551234"
    }
  }
}
```

### POST /api/webhooks/twilio/sms/incoming
Twilio webhook for incoming SMS.

**Request:**
```json
{
  "From": "+16045551234",
  "To": "+17785551234",
  "Body": "Hi, I'm interested in financing a Honda Civic",
  "MessageSid": "SM123...",
  "AccountSid": "AC123..."
}
```

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Missing required field: phoneNumber",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "phoneNumber",
    "message": "Phone number is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or missing authentication token",
  "code": "AUTH_REQUIRED"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied - lead belongs to different organization",
  "code": "CROSS_ORG_ACCESS_DENIED"
}
```

### 404 Not Found
```json
{
  "error": "Lead not found",
  "code": "RESOURCE_NOT_FOUND",
  "leadId": "sl_1234567890_abc123"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "message": "Database connection failed"
}
```

---

## Rate Limits

- **Authentication endpoints**: 5 requests/minute
- **SMS sending**: 10 requests/minute per organization
- **Voice calls**: 5 requests/minute per organization
- **Data retrieval**: 100 requests/minute per organization
- **Webhooks**: No rate limits (trusted sources)

---

## SDK Examples

### JavaScript/Node.js
```javascript
const API_BASE = 'https://your-app.onrender.com';
const token = 'your-jwt-token';
const organizationId = 'your-org-id';

// Send SMS
const sendSMS = async (to, message, leadId) => {
  const response = await fetch(`${API_BASE}/api/twilio/send-sms`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'organizationId': organizationId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, message, leadId })
  });
  
  return response.json();
};

// Make voice call
const makeCall = async (phoneNumber, leadId) => {
  const response = await fetch(`${API_BASE}/api/elevenlabs/outbound-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'organizationId': organizationId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phoneNumber, leadId })
  });
  
  return response.json();
};

// Get conversation history
const getHistory = async (leadId) => {
  const response = await fetch(`${API_BASE}/api/conversation-history/${leadId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'organizationId': organizationId
    }
  });
  
  return response.json();
};
```

### cURL Examples
```bash
# Send SMS
curl -X POST https://your-app.onrender.com/api/twilio/send-sms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "organizationId: YOUR_ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+16045551234",
    "message": "Hello from our dealership!",
    "leadId": "sl_1234567890_abc123"
  }'

# Make voice call
curl -X POST https://your-app.onrender.com/api/elevenlabs/outbound-call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "organizationId: YOUR_ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+16045551234",
    "leadId": "sl_1234567890_abc123"
  }'

# Get leads
curl -X GET https://your-app.onrender.com/api/subprime/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "organizationId: YOUR_ORG_ID"
```

---

## Environment-Specific URLs

### Development
- **Base URL**: `http://localhost:3001`
- **Frontend**: `http://localhost:3000`
- **Webhook URL**: Use ngrok tunnel

### Production
- **Base URL**: `https://your-app.onrender.com`
- **Frontend**: Same as base URL
- **Webhook URL**: Same as base URL

---

## Testing

### Postman Collection
Import the provided Postman collection with pre-configured requests for all endpoints.

### Test Data
Use the following test data for development:

```json
{
  "testOrganization": {
    "id": "test-org-uuid",
    "name": "Test Dealership"
  },
  "testLead": {
    "id": "sl_test_123456",
    "customerName": "Test Customer",
    "phoneNumber": "+16045551234",
    "email": "test@example.com"
  }
}
``` 