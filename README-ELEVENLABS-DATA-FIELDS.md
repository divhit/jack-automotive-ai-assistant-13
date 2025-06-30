# ElevenLabs Data Collection Integration

## Overview
Your ElevenLabs agent is configured to collect specific data fields during conversations. This document explains which fields are most useful for updating lead profiles and which you should consider adding/removing.

## Currently Configured Fields

Based on your ElevenLabs agent settings, you have these data collection fields:

### **High Priority - Profile Data**
✅ **name** (string): Full name of the person calling
- **Use**: Updates `customerName` in lead profile
- **Keep**: Essential for personalization

✅ **email** (string): Email address  
- **Use**: Updates `email` field for follow-up communications
- **Keep**: Critical for marketing and follow-up

✅ **phone** (number): Phone number
- **Use**: Validates/confirms primary contact number
- **Keep**: Important for verification

### **High Priority - Financial Data**
✅ **employment_status** (string): Current employment status (full time/part time/unemployed/self employed)
- **Use**: Updates credit profile risk assessment
- **Keep**: Essential for financing qualification

✅ **house_payment** (number): Mortgage or rent payment
- **Use**: Calculates estimated vehicle budget (rule: car payment = 30-80% of housing payment)
- **Keep**: Critical for budget estimation

### **Medium Priority - Personal Data**
🔶 **dob** (string): Date of birth
- **Use**: Age verification, demographic analysis
- **Consider**: Useful for age-based targeting, but may have privacy concerns

🔶 **marital_status** (string): Marital status of the person calling
- **Use**: Family size estimation, vehicle type preferences
- **Consider**: Can inform vehicle recommendations (family vs individual)

🔶 **address** (string): Current address
- **Use**: Service area validation, delivery logistics
- **Consider**: Useful for local inventory and compliance

### **Medium Priority - Employment Details**
🔶 **employer** (string): Employer's company name (NOT AI)
- **Use**: Employment verification, income stability assessment
- **Consider**: Helps with financing qualification

🔶 **employer_address** (string): Employer's company address
- **Use**: Employment verification
- **Consider**: Less critical, may be redundant

🔶 **employer_phone** (string): Employer phone number
- **Use**: Employment verification for financing
- **Consider**: May be difficult for customers to provide

🔶 **employer_duration** (string): How long with current employer
- **Use**: Job stability assessment for credit worthiness
- **Consider**: Important for subprime financing decisions

🔶 **role** (string): Current occupation role
- **Use**: Income estimation, professional targeting
- **Consider**: Helps estimate income range

### **Low Priority - Housing Details**
⚠️ **duration** (string): How long has the person lived at the current address
- **Use**: Stability assessment
- **Consider**: Less relevant for vehicle sales

⚠️ **ownership** (string): Is the current residence rented or owned
- **Use**: Financial stability indicator
- **Consider**: Minor factor in credit assessment

## Recommended Configuration

### **Keep These Fields (Essential)**
1. **name** - Customer identification
2. **email** - Follow-up communications  
3. **phone** - Contact verification
4. **employment_status** - Credit qualification
5. **house_payment** - Budget estimation

### **Add These Fields (Missing but Useful)**
```javascript
{
  // Vehicle-specific fields
  vehicle_type: "string", // SUV, sedan, truck, etc.
  budget_range: "string", // $200-400/month, $15k-25k total
  timeline: "string", // immediate, 1-3 months, 6+ months
  trade_in: "string", // yes/no, vehicle details
  
  // Credit-specific fields  
  credit_score_range: "string", // 500-550, 600-650, etc.
  previous_auto_loan: "string", // yes/no, payment history
  down_payment: "number", // available down payment amount
  
  // Intent/qualification
  purchase_intent: "string", // browsing, ready to buy, needs financing
  main_concern: "string", // approval, payment, vehicle selection
}
```

### **Consider Removing (Low Value)**
- **duration** (address duration)
- **ownership** (rent vs own)
- **employer_address** (redundant)
- **employer_phone** (hard to obtain)

## Implementation Status

✅ **Currently Integrated**: Basic profile fields (name, email, employment_status, house_payment)

🔄 **Next Steps**:
1. Add vehicle-specific data collection fields to your ElevenLabs agent
2. Add credit-specific fields for better qualification
3. Remove low-value fields to streamline data collection
4. Test the integration with real conversations

## Data Flow

```
ElevenLabs Agent Conversation
    ↓ (collects data during call)
Post-Call Webhook 
    ↓ (data_collection_results)
updateLeadFromConversationData()
    ↓ (maps fields to lead structure)
Lead Profile Updated
    ↓ (persisted to Supabase)
UI Refreshed
```

## Testing

To test the integration:
1. Make a test call with a lead
2. Provide the information the agent asks for
3. Check the server logs for "Lead profile updated" messages
4. Verify the UI shows updated information after the call ends

The system will automatically extract and apply the collected data to update the lead's profile, credit information, vehicle interests, and funding readiness. 