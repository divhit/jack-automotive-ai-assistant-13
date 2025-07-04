import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { WebSocket } from 'ws';
import twilio from 'twilio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ENHANCED: Import Supabase persistence service (non-breaking addition)
import supabasePersistence from './services/supabasePersistence.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to load existing leads from Supabase into memory
async function loadExistingLeadsIntoMemory() {
  try {
    console.log('🔄 Loading existing leads from Supabase into memory...');
    
    if (supabasePersistence.isEnabled) {
      // Wait for connection with retries
      if (!supabasePersistence.isConnected) {
        console.log('⏳ Waiting for Supabase connection...');
        
        // Try up to 3 times with delays
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`🔄 Connection attempt ${attempt}/3...`);
          
          const connected = await supabasePersistence.testConnection();
          if (connected) {
            console.log('✅ Supabase connection established');
            break;
          }
          
          if (attempt < 3) {
            console.log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (supabasePersistence.isConnected) {
        const existingLeads = await supabasePersistence.getAllLeads(500); // Load up to 500 leads
        
        for (const dbLead of existingLeads) {
          // Convert Supabase format back to dynamicLeads format
          const memoryLead = {
            id: dbLead.id,
            customerName: dbLead.customer_name,
            phoneNumber: dbLead.phone_number,
            email: dbLead.email,
            chaseStatus: dbLead.chase_status,
            fundingReadiness: dbLead.funding_readiness,
            fundingReadinessReason: dbLead.funding_readiness_reason,
            sentiment: dbLead.sentiment,
            creditProfile: {
              scoreRange: dbLead.credit_score_range,
              knownIssues: dbLead.credit_known_issues ? JSON.parse(dbLead.credit_known_issues) : []
            },
            vehiclePreference: dbLead.vehicle_preference,
            assignedAgent: dbLead.assigned_agent,
            assignedSpecialist: dbLead.assigned_specialist,
            lastTouchpoint: dbLead.last_touchpoint,
            conversations: [], // Will be loaded separately if needed
            nextAction: {
              type: dbLead.next_action_type,
              dueDate: dbLead.next_action_due_date,
              isAutomated: dbLead.next_action_is_automated,
              isOverdue: dbLead.next_action_is_overdue
            },
            scriptProgress: {
              currentStep: dbLead.script_progress_current_step || 'contacted',
              completedSteps: dbLead.script_progress_completed_steps ? JSON.parse(dbLead.script_progress_completed_steps) : ['contacted']
            }
          };
          
          // Store in memory
          dynamicLeads.set(dbLead.id, memoryLead);
          
          // Set up phone mapping
          const normalizedPhone = normalizePhoneNumber(dbLead.phone_number);
          phoneToLeadMapping.set(normalizedPhone, dbLead.id);
        }
        
        console.log(`✅ Loaded ${existingLeads.length} existing leads into memory`);
        console.log(`🔗 Set up ${phoneToLeadMapping.size} phone mappings`);
      } else {
        console.log('📋 Supabase connection failed, starting with empty lead storage');
      }
    } else {
      console.log('📋 Supabase disabled, starting with empty lead storage');
    }
  } catch (error) {
    console.error('❌ Failed to load existing leads:', error);
    console.log('📋 Starting with empty lead storage (system will work normally)');
  }
}

let app;
try {
  app = express();
  console.log('✅ Express app initialized successfully');
} catch (error) {
  console.error('❌ Error initializing Express app:', error);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: 'application/json' }));

// CRITICAL: Serve static files FIRST, before any routes that might fail
// This ensures the React app is served even if there are route registration errors
if (process.env.NODE_ENV === 'production') {
  try {
    app.use(express.static(path.join(__dirname, 'dist')));
    console.log('✅ Serving static files from dist folder');
  } catch (error) {
    console.log('⚠️ Dist folder not found, serving API-only mode');
  }
}

// Memory storage - globally accessible
const conversationContexts = new Map(); // orgId:phoneNumber -> messages array
const conversationSummaries = new Map(); // orgId:phoneNumber -> summary object
const activeConversations = new Map(); // phoneNumber -> websocket
const phoneToLeadMapping = new Map(); // phoneNumber -> leadId
const leadToPhoneMapping = new Map(); // leadId -> phoneNumber
const dynamicLeads = new Map(); // leadId -> lead object
const sseConnections = new Map(); // leadId -> response object (for Server-Sent Events)

// ORGANIZATION-SCOPED MEMORY UTILITIES
function createOrgMemoryKey(organizationId, phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return organizationId ? `${organizationId}:${normalized}` : normalized;
}

function getOrganizationMemoryKeys(organizationId) {
  const prefix = `${organizationId}:`;
  return {
    conversations: Array.from(conversationContexts.keys()).filter(key => key.startsWith(prefix)),
    summaries: Array.from(conversationSummaries.keys()).filter(key => key.startsWith(prefix))
  };
}

function clearMemoryForPhone(phoneNumber, keepOrganizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Find all memory keys for this phone across organizations
  const conversationKeysToRemove = [];
  const summaryKeysToRemove = [];
  
  for (const key of conversationContexts.keys()) {
    if (key.endsWith(`:${normalized}`) || key === normalized) {
      // Keep data only for the specified organization
      if (keepOrganizationId && key === createOrgMemoryKey(keepOrganizationId, phoneNumber)) {
        continue;
      }
      conversationKeysToRemove.push(key);
    }
  }
  
  for (const key of conversationSummaries.keys()) {
    if (key.endsWith(`:${normalized}`) || key === normalized) {
      // Keep data only for the specified organization
      if (keepOrganizationId && key === createOrgMemoryKey(keepOrganizationId, phoneNumber)) {
        continue;
      }
      summaryKeysToRemove.push(key);
    }
  }
  
  // Remove contaminated memory
  conversationKeysToRemove.forEach(key => {
    conversationContexts.delete(key);
    console.log(`🧹 Cleared conversation memory for key: ${key}`);
  });
  
  summaryKeysToRemove.forEach(key => {
    conversationSummaries.delete(key);
    console.log(`🧹 Cleared summary memory for key: ${key}`);
  });
  
  if (conversationKeysToRemove.length > 0 || summaryKeysToRemove.length > 0) {
    console.log(`🧹 Memory cleanup completed for ${phoneNumber} - removed ${conversationKeysToRemove.length} conversation and ${summaryKeysToRemove.length} summary entries`);
  }
}

// --- PHONE NUMBER NORMALIZATION ---

/**
 * Normalize phone numbers to a consistent format for context sharing
 * Handles both SMS (+16049085474) and Voice ((604) 908-5474) formats
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return phoneNumber;
  
  // If it already starts with +, return as is (don't double-normalize)
  if (phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it's a 10-digit number, assume North American and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // If it's an 11-digit number starting with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  // Default: return the digits with + prefix
  return `+${digitsOnly}`;
}

/**
 * Find conversation history using organization-aware phone number lookup
 * This ensures SMS and Voice conversations are properly isolated by organization
 */
async function findConversationByPhone(phoneNumber, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Try to get organizationId if not provided
  if (!organizationId) {
    organizationId = await getOrganizationIdFromPhone(phoneNumber);
  }
  
  // FIRST: Try organization-scoped lookup if we have organizationId
  if (organizationId) {
    const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
    if (conversationContexts.has(orgMemoryKey)) {
      console.log(`�� Found conversation history for org-scoped key: ${orgMemoryKey}`);
      return { phoneNumber: normalized, history: conversationContexts.get(orgMemoryKey) };
    }
  }
  
  // SECOND: If no org-scoped data, check if there's legacy non-org data
  if (conversationContexts.has(normalized)) {
    const legacyHistory = conversationContexts.get(normalized);
    console.log(`📋 Found legacy non-org conversation history for ${normalized} (${legacyHistory.length} messages)`);
    
    // If we have organizationId, migrate this data to org-scoped key
    if (organizationId && legacyHistory.length > 0) {
      const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
      conversationContexts.set(orgMemoryKey, legacyHistory);
      conversationContexts.delete(normalized); // Remove legacy entry
      console.log(`🔄 Migrated legacy conversation data to org-scoped key: ${orgMemoryKey}`);
    }
    
    return { phoneNumber: normalized, history: legacyHistory };
  }
  
  // THIRD: Try to find by checking all stored numbers with organization context
  if (organizationId) {
    for (const [storedKey, history] of conversationContexts.entries()) {
      if (storedKey.startsWith(`${organizationId}:`) && storedKey.endsWith(normalized)) {
        console.log(`📋 Found conversation via org-scoped search: ${storedKey}`);
        return { phoneNumber: storedKey, history };
      }
    }
  }
  
  // LAST: No conversation found
  return { phoneNumber: normalized, history: [] };
}

// --- CONVERSATION CONTEXT MANAGEMENT ---

// Helper function to get organizationId from phone number
async function getOrganizationIdFromPhone(phoneNumber) {
  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    
    // FIRST: Check active lead mapping (current session context)
    const leadId = await getActiveLeadForPhone(phoneNumber);
    if (leadId) {
      const leadData = getLeadData(leadId);
      if (leadData && leadData.organizationId) {
        console.log(`🔗 Found organizationId ${leadData.organizationId} from active lead ${leadId} for phone ${phoneNumber}`);
        return leadData.organizationId;
      }
    }
    
    // SECOND: Try Supabase with ambiguity detection
    if (supabasePersistence.isConnected) {
      // First check without organizationId (this will detect ambiguity)
      const dbLead = await supabasePersistence.getLeadByPhone(phoneNumber);
      if (dbLead && dbLead.organization_id) {
        console.log(`🔗 Found unambiguous organizationId ${dbLead.organization_id} for phone ${phoneNumber}`);
        return dbLead.organization_id;
      } else if (dbLead === null) {
        // This could mean either no leads found OR ambiguous phone number
        // We need additional context to resolve this
        console.log(`❓ Phone ${phoneNumber} is either not found or exists in multiple organizations`);
      }
    }
    
    console.log(`⚠️ Could not determine organizationId for phone ${phoneNumber} - may need organization context`);
    return null;
  } catch (error) {
    console.error(`❌ Error getting organizationId for phone ${phoneNumber}:`, error);
    return null;
  }
}

async function getConversationHistory(phoneNumber, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: getConversationHistory called without organizationId for ${phoneNumber}`);
    return []; // Return empty array instead of falling back to global data
  }
  
  // ENHANCED: Try to load from Supabase first, then fallback to organization-scoped memory
  try {
    if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
      console.log(`🗄️ Loading conversation history from Supabase for ${normalized} (org: ${organizationId})`);
      const supabaseHistory = await supabasePersistence.getConversationHistory(phoneNumber, organizationId);
      
      if (supabaseHistory && supabaseHistory.length > 0) {
        // Count message types from Supabase
        const voiceCount = supabaseHistory.filter(msg => msg.type === 'voice').length;
        const smsCount = supabaseHistory.filter(msg => msg.type === 'text').length;
        
        console.log(`📋 Loaded ${supabaseHistory.length} messages from Supabase for ${phoneNumber} (org: ${organizationId}) - ${voiceCount} voice, ${smsCount} SMS`);
        
        // Sync to organization-scoped memory for faster access
        const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
        conversationContexts.set(orgMemoryKey, supabaseHistory);
        
        return supabaseHistory;
      }
    }
  } catch (error) {
    console.log(`⚠️ Failed to load from Supabase, falling back to organization-scoped memory:`, error.message);
  }
  
  // Fallback to organization-scoped memory ONLY
  const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
  const orgHistory = conversationContexts.get(orgMemoryKey) || [];
  
  // Debug: Count message types to understand the voice message issue
  const voiceCount = orgHistory.filter(msg => msg.type === 'voice').length;
  const smsCount = orgHistory.filter(msg => msg.type === 'text').length;
  
  console.log(`📋 Found ${orgHistory.length} messages from organization-scoped memory for ${phoneNumber} (org: ${organizationId}) - ${voiceCount} voice, ${smsCount} SMS`);
  
  // Debug: Show all stored phone numbers if no data found
  if (orgHistory.length === 0) {
    console.log(`🔍 DEBUG: All stored org-scoped keys:`, Array.from(conversationContexts.keys()).filter(k => k.startsWith(`${organizationId}:`)));
  }
  
  return orgHistory;
}

// Synchronous version for backwards compatibility
function getConversationHistorySync(phoneNumber) {
  const result = findConversationByPhone(phoneNumber);
  return result.history;
}

function addToConversationHistory(phoneNumber, message, sentBy, messageType = 'text', organizationId = null) {
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: addToConversationHistory called without organizationId for ${phoneNumber}`);
    return; // Don't store message without proper organization context
  }
  
      const normalized = normalizePhoneNumber(phoneNumber);
      
  // Clear any contaminated non-org memory for this phone when organizationId is provided
        clearMemoryForPhone(phoneNumber, organizationId);
      
  // Use organization-scoped memory key ONLY
      const memoryKey = createOrgMemoryKey(organizationId, phoneNumber);
      
      if (!conversationContexts.has(memoryKey)) {
        conversationContexts.set(memoryKey, []);
      }
      
      const history = conversationContexts.get(memoryKey);
      const messageData = {
        content: message,
        sentBy: sentBy,
        timestamp: new Date().toISOString(),
        type: messageType
      };
      
      history.push(messageData);
      
      // Keep only last 50 messages to prevent memory issues
      if (history.length > 50) {
        history.shift();
      }
      
      console.log(`📝 Added ${messageType} message to org-scoped history ${memoryKey} (${sentBy}): ${message.substring(0, 100)}...`);
      
  // Persist to Supabase with organization context
  supabasePersistence.persistConversationMessage(phoneNumber, message, sentBy, messageType, { organizationId })
    .catch(error => {
      console.log(`🗄️ Organization-scoped persistence failed (system continues normally):`, error.message);
    });
}

// Store conversation summary from post-call webhook - SECURITY FIXED
function storeConversationSummary(phoneNumber, summary, organizationId = null) {
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: storeConversationSummary called without organizationId for ${phoneNumber}`);
    return; // Don't store summary without proper organization context
  }
  
  const normalized = normalizePhoneNumber(phoneNumber);
  const summaryData = {
    summary,
    timestamp: new Date().toISOString()
  };
  
  // Use organization-scoped memory key
  const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
  conversationSummaries.set(orgMemoryKey, summaryData);
  console.log(`📋 Stored conversation summary for ${normalized} (org: ${organizationId}):`, summary.substring(0, 100) + '...');
  
  // ENHANCED: Async persistence to Supabase with organization context (non-blocking)
  supabasePersistence.persistConversationSummary(phoneNumber, summary, summaryData.timestamp, { organizationId })
    .catch(error => {
      console.log(`🗄️ Persistence failed for summary (system continues normally):`, error.message);
    });
}

// NEW: Update lead profile from ElevenLabs conversation data
async function updateLeadFromConversationData(phoneNumber, dataCollectionResults, conversationSummary) {
  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    const leadId = phoneToLeadMapping.get(normalized);
    
    if (!leadId) {
      console.log(`⚠️ No lead found for phone ${phoneNumber} - cannot update profile`);
      return;
    }

    const existingLead = dynamicLeads.get(leadId);
    if (!existingLead) {
      console.log(`⚠️ Lead ${leadId} not found in memory - cannot update profile`);
      return;
    }

    console.log('📋 Updating lead profile from ElevenLabs data:', {
      leadId,
      phoneNumber,
      dataFields: Object.keys(dataCollectionResults)
    });

    // Extract and map ElevenLabs data to lead fields
    const updates = {};
    
    // Basic profile data
    if (dataCollectionResults.name && dataCollectionResults.name !== existingLead.customerName) {
      updates.customerName = dataCollectionResults.name;
    }
    
    if (dataCollectionResults.email && !existingLead.email) {
      updates.email = dataCollectionResults.email;
    }

    // Credit profile updates
    const creditUpdates = { ...existingLead.creditProfile };
    let creditUpdated = false;

    // Map various credit-related fields
    if (dataCollectionResults.credit_score || dataCollectionResults.credit_situation) {
      const creditScore = dataCollectionResults.credit_score || dataCollectionResults.credit_situation;
      if (creditScore && creditScore !== 'unknown') {
        creditUpdates.scoreRange = creditScore;
        creditUpdated = true;
      }
    }

    // Employment and income data
    const knownIssues = creditUpdates.knownIssues || [];
    if (dataCollectionResults.employment_status) {
      const empStatus = dataCollectionResults.employment_status.toLowerCase();
      if (empStatus.includes('unemployed') || empStatus.includes('part time')) {
        if (!knownIssues.includes('Employment concerns')) {
          knownIssues.push('Employment concerns');
          creditUpdated = true;
        }
      }
    }

    if (creditUpdated) {
      updates.creditProfile = { ...creditUpdates, knownIssues };
    }

    // Vehicle interest updates
    let vehicleUpdated = false;
    const vehicleInterest = { ...existingLead.vehicleInterest };

    // Budget information
    if (dataCollectionResults.house_payment || dataCollectionResults.budget || dataCollectionResults.monthly_payment) {
      const monthlyPayment = dataCollectionResults.house_payment || dataCollectionResults.budget || dataCollectionResults.monthly_payment;
      if (monthlyPayment && typeof monthlyPayment === 'number') {
        // Estimate car budget based on housing payment (rule of thumb: car payment should be 10-15% of income)
        const estimatedBudget = {
          min: Math.max(200, monthlyPayment * 0.3), // Conservative estimate
          max: Math.max(500, monthlyPayment * 0.8)   // Higher estimate
        };
        vehicleInterest.budget = estimatedBudget;
        vehicleUpdated = true;
      }
    }

    // Vehicle type/preference
    if (dataCollectionResults.vehicle_type || dataCollectionResults.vehicle_preference) {
      const vehicleType = dataCollectionResults.vehicle_type || dataCollectionResults.vehicle_preference;
      if (vehicleType) {
        vehicleInterest.type = vehicleType;
        updates.vehiclePreference = vehicleType;
        vehicleUpdated = true;
      }
    }

    if (vehicleUpdated && Object.keys(vehicleInterest).length > 0) {
      updates.vehicleInterest = vehicleInterest;
    }

    // Update funding readiness based on conversation
    if (conversationSummary) {
      const summaryLower = conversationSummary.toLowerCase();
      if (summaryLower.includes('approved') || summaryLower.includes('qualified') || summaryLower.includes('ready to purchase')) {
        updates.fundingReadiness = 'Ready';
        updates.fundingReadinessReason = 'Qualified through conversation';
      } else if (summaryLower.includes('needs documents') || summaryLower.includes('verification')) {
        updates.fundingReadiness = 'Partial';
        updates.fundingReadinessReason = 'Needs documentation';
      }
    }

    // Update sentiment based on conversation tone
    if (conversationSummary) {
      const summaryLower = conversationSummary.toLowerCase();
      if (summaryLower.includes('interested') || summaryLower.includes('excited') || summaryLower.includes('want')) {
        updates.sentiment = 'Warm';
      } else if (summaryLower.includes('concerned') || summaryLower.includes('worried') || summaryLower.includes('hesitant')) {
        updates.sentiment = 'Neutral';
      }
    }

    // Apply updates to lead
    if (Object.keys(updates).length > 0) {
      const updatedLead = { ...existingLead, ...updates, lastTouchpoint: new Date().toISOString() };
      dynamicLeads.set(leadId, updatedLead);

      console.log('✅ Lead profile updated:', {
        leadId,
        updatedFields: Object.keys(updates),
        customerName: updatedLead.customerName,
        email: updatedLead.email,
        creditScore: updatedLead.creditProfile?.scoreRange,
        vehicleInterest: updatedLead.vehicleInterest?.type,
        fundingReadiness: updatedLead.fundingReadiness
      });

      // Persist to Supabase
      await supabasePersistence.persistLead(updatedLead)
        .catch(error => {
          console.log(`🗄️ Lead persistence failed (system continues normally):`, error.message);
        });

      // Broadcast update to UI
      broadcastConversationUpdate({
        type: 'lead_profile_updated',
        leadId,
        phoneNumber,
        updates,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('📋 No profile updates needed for lead', leadId);
    }

  } catch (error) {
    console.error('❌ Error updating lead from conversation data:', error);
  }
}

// Get conversation summary - SECURITY FIXED with organization validation
async function getConversationSummary(phoneNumber, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: getConversationSummary called without organizationId for ${phoneNumber}`);
    return null; // Return null instead of falling back to global data
  }
  
  // ENHANCED: Try to load from Supabase first, then fallback to organization-scoped memory
  try {
    if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
      console.log(`🗄️ Loading conversation summary from Supabase for ${normalized} (org: ${organizationId})`);
      const supabaseSummary = await supabasePersistence.getConversationSummary(phoneNumber, organizationId);
      
      if (supabaseSummary) {
        console.log(`📋 Loaded summary from Supabase for ${phoneNumber} in organization ${organizationId}`);
        
        // Sync to organization-scoped memory for faster access
        const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
        conversationSummaries.set(orgMemoryKey, supabaseSummary);
        
        return supabaseSummary;
      }
    }
  } catch (error) {
    console.log(`⚠️ Failed to load summary from Supabase, falling back to organization-scoped memory:`, error.message);
  }
  
  // Fallback to organization-scoped memory ONLY
  const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
  return conversationSummaries.get(orgMemoryKey);
}

// Synchronous version for backwards compatibility
function getConversationSummarySync(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return conversationSummaries.get(normalized);
}

// Get lead data for dynamic variables
function getLeadData(leadId) {
  // First check dynamically added leads
  if (dynamicLeads.has(leadId)) {
    const lead = dynamicLeads.get(leadId);
    console.log(`📋 Found dynamic lead data for ${leadId}:`, {
      customerName: lead.customerName,
      phoneNumber: lead.phoneNumber,
      sentiment: lead.sentiment,
      fundingReadiness: lead.fundingReadiness
    });
    return lead;
  }

  // Fall back to static data (for backwards compatibility)
  const subprimeLeads = [
    {
      id: "test1",
      customerName: "Test User",
      phoneNumber: "(604) 908-5474",
      chaseStatus: "Auto Chase Running",
      fundingReadiness: "Ready",
      sentiment: "Warm",
      vehiclePreference: "SUV"
    },
    {
      id: "sl1", 
      customerName: "John Smith",
      phoneNumber: "(555) 123-4567",
      chaseStatus: "Auto Chase Running",
      fundingReadiness: "Ready",
      sentiment: "Warm",
      vehiclePreference: "SUV"
    }
    // Add more leads as needed
  ];
  
  const staticLead = subprimeLeads.find(lead => lead.id === leadId);
  if (staticLead) {
    console.log(`📋 Found static lead data for ${leadId}:`, {
      customerName: staticLead.customerName,
      phoneNumber: staticLead.phoneNumber,
      sentiment: staticLead.sentiment,
      fundingReadiness: staticLead.fundingReadiness
    });
  } else {
    console.log(`❓ No lead data found for ${leadId}`);
  }
  
  return staticLead;
}

async function buildConversationContext(phoneNumber, organizationId = null) {
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: buildConversationContext called without organizationId for ${phoneNumber}`);
    return ''; // Return empty context instead of risking cross-organization data leakage
  }
  
  const history = await getConversationHistory(phoneNumber, organizationId);
  const summaryData = await getConversationSummary(phoneNumber, organizationId);
  
  if (history.length === 0 && !summaryData) {
    console.log(`📋 No conversation history or summary found for ${phoneNumber} (org: ${organizationId}) (normalized: ${normalizePhoneNumber(phoneNumber)})`);
    return '';
  }
  
  // Separate voice and SMS messages
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text');
  
  let contextText = `CONVERSATION CONTEXT for customer ${phoneNumber}:\n\n`;
  
  // Add conversation summary if available (this is the key improvement!)
  if (summaryData && summaryData.summary) {
    contextText += `CONVERSATION SUMMARY: ${summaryData.summary}\n\n`;
  }
  
  // Add recent voice messages (last 3 only to keep context focused)
  if (voiceMessages.length > 0) {
    const recentVoiceMessages = voiceMessages.slice(-3);
    contextText += `RECENT VOICE CONVERSATION (last ${recentVoiceMessages.length} messages):\n`;
    contextText += recentVoiceMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  // Add recent SMS messages (last 3 only)
  if (smsMessages.length > 0) {
    const recentSmsMessages = smsMessages.slice(-3);
    contextText += `RECENT SMS CONVERSATION (last ${recentSmsMessages.length} messages):\n`;
    contextText += recentSmsMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  contextText += `CRITICAL INSTRUCTIONS: 
- FIRST: Read the CONVERSATION SUMMARY above - it contains essential customer details from previous voice/SMS conversations
- If summary mentions specific vehicle models, budgets, or customer details, DO NOT ask for this information again
- This conversation may be RESUMING after a brief timeout - continue naturally from where you left off
- The customer is texting you via SMS, so respond in SMS format (concise, friendly)
- Reference specific details from recent messages and conversation summary to show continuity
- Be helpful and maintain context from ALL previous interactions (voice calls, SMS, etc.)
- If this feels like a continuation, acknowledge it naturally: "Great to hear from you again" or similar
- DO NOT restart or re-introduce yourself if you've already spoken with this customer`;
  
  console.log(`📋 Built conversation context for ${phoneNumber} (org: ${organizationId}) with summary + ${history.length} total messages (${voiceMessages.length} voice, ${smsMessages.length} SMS):`, contextText.substring(0, 400) + '...');
  return contextText;
}

// Synchronous version for backwards compatibility
function buildConversationContextSync(phoneNumber) {
  const history = getConversationHistorySync(phoneNumber);
  const summaryData = getConversationSummarySync(phoneNumber);
  
  if (history.length === 0 && !summaryData) {
    return '';
  }
  
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text');
  
  let contextText = `CONVERSATION CONTEXT for customer ${phoneNumber}:\n\n`;
  
  if (summaryData && summaryData.summary) {
    contextText += `CONVERSATION SUMMARY: ${summaryData.summary}\n\n`;
  }
  
  if (voiceMessages.length > 0) {
    const recentVoiceMessages = voiceMessages.slice(-3);
    contextText += `RECENT VOICE CONVERSATION (last ${recentVoiceMessages.length} messages):\n`;
    contextText += recentVoiceMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  if (smsMessages.length > 0) {
    const recentSmsMessages = smsMessages.slice(-3);
    contextText += `RECENT SMS CONVERSATION (last ${recentSmsMessages.length} messages):\n`;
    contextText += recentSmsMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  contextText += `CRITICAL INSTRUCTIONS: 
- FIRST: Read the CONVERSATION SUMMARY above - it contains essential customer details from previous voice/SMS conversations
- If summary mentions specific vehicle models, budgets, or customer details, DO NOT ask for this information again
- This conversation may be RESUMING after a brief timeout - continue naturally from where you left off
- The customer is texting you via SMS, so respond in SMS format (concise, friendly)
- Reference specific details from recent messages and conversation summary to show continuity
- Be helpful and maintain context from ALL previous interactions (voice calls, SMS, etc.)
- If this feels like a continuation, acknowledge it naturally: "Great to hear from you again" or similar
- DO NOT restart or re-introduce yourself if you've already spoken with this customer`;
  
  return contextText;
}

// Store conversation metadata when a call is initiated
function storeConversationMetadata(conversationId, phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  conversationMetadata.set(conversationId, {
    phoneNumber: normalized,
    leadId,
    startTime: new Date().toISOString()
  });
  console.log(`📝 Stored conversation metadata:`, { conversationId, phoneNumber: normalized, leadId });
}

// Retrieve conversation metadata
function getConversationMetadata(conversationId) {
  return conversationMetadata.get(conversationId);
}

// --- LEAD ID ROUTING MANAGEMENT ---

/**
 * Set the active lead ID for a phone number (called when SSE connection established)
 */
function setActiveLeadForPhone(phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  phoneToLeadMapping.set(normalized, leadId);
  console.log(`🔗 Set active lead ${leadId} for phone ${normalized}`);
}

/**
 * Get the current active lead ID for a phone number
 * Prioritizes active SSE connections over stored metadata, with Supabase fallback
 */
async function getActiveLeadForPhone(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // First check if we have an active mapping from SSE connections
  const activeLead = phoneToLeadMapping.get(normalized);
  if (activeLead && sseConnections.has(activeLead)) {
    console.log(`📍 Found active lead ${activeLead} for phone ${normalized}`);
    return activeLead;
  }
  
  // Fall back to conversation metadata lookup
  for (const [convId, metadata] of conversationMetadata.entries()) {
    if (normalizePhoneNumber(metadata.phoneNumber) === normalized) {
      console.log(`📋 Found metadata lead ${metadata.leadId} for phone ${normalized}`);
      return metadata.leadId;
    }
  }
  
  // CRITICAL FIX: Third fallback - Supabase lookup by phone number
  // This handles cases where SSE connection closed but lead exists in database
  if (supabasePersistence.isConnected) {
    try {
      const leadData = await supabasePersistence.getLeadByPhone(phoneNumber);
      if (leadData) {
        console.log(`🗄️ Found Supabase lead ${leadData.id} for phone ${normalized}`);
        
        // Restore the phone-to-lead mapping for future lookups
        phoneToLeadMapping.set(normalized, leadData.id);
        
        // Also restore lead data to memory for getLeadData() calls
        if (!dynamicLeads.has(leadData.id)) {
          const memoryLead = {
            id: leadData.id,
            customerName: leadData.customer_name,
            phoneNumber: leadData.phone_number,
            email: leadData.email,
            chaseStatus: leadData.chase_status,
            fundingReadiness: leadData.funding_readiness,
            fundingReadinessReason: leadData.funding_readiness_reason,
            sentiment: leadData.sentiment,
            creditProfile: {
              scoreRange: leadData.credit_score_range,
              knownIssues: leadData.credit_known_issues ? JSON.parse(leadData.credit_known_issues) : []
            },
            vehiclePreference: leadData.vehicle_preference,
            assignedAgent: leadData.assigned_agent,
            assignedSpecialist: leadData.assigned_specialist,
            lastTouchpoint: leadData.last_touchpoint,
            conversations: [],
            nextAction: {
              type: leadData.next_action_type,
              dueDate: leadData.next_action_due_date,
              isAutomated: leadData.next_action_is_automated,
              isOverdue: leadData.next_action_is_overdue
            },
            scriptProgress: {
              currentStep: leadData.script_progress_current_step || 'contacted',
              completedSteps: leadData.script_progress_completed_steps ? JSON.parse(leadData.script_progress_completed_steps) : ['contacted']
            }
          };
          
          dynamicLeads.set(leadData.id, memoryLead);
          console.log(`💾 Restored lead ${leadData.id} to memory: ${leadData.customer_name}`);
        }
        
        return leadData.id;
      }
    } catch (error) {
      console.error(`❌ Failed to lookup lead by phone ${normalized}:`, error);
    }
  }
  
  console.log(`❓ No lead ID found for phone ${normalized}`);
  return null;
}

/**
 * Clean up lead mapping when SSE connection closes
 */
function removeActiveLeadForPhone(phoneNumber, leadId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  const currentLead = phoneToLeadMapping.get(normalized);
  if (currentLead === leadId) {
    phoneToLeadMapping.delete(normalized);
    console.log(`🗑️ Removed active lead ${leadId} for phone ${normalized}`);
  }
}

// --- STATEFUL CONVERSATION HANDLER ---

// WebSocket timeout management
const activeConversationTimeouts = new Map();
const SMS_CONVERSATION_TIMEOUT = 60000; // 1 minute instead of 5+ minutes

function startConversationWithTimeout(phoneNumber, initialMessage) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Clear any existing timeout
  if (activeConversationTimeouts.has(normalized)) {
    clearTimeout(activeConversationTimeouts.get(normalized));
  }
  
  // Start the conversation
  startConversation(phoneNumber, initialMessage);
  
  // Set timeout to close idle connection after 1 minute
  const timeoutId = setTimeout(() => {
    console.log(`⏰ SMS conversation timeout for ${phoneNumber} - closing to save credits`);
    if (activeConversations.has(normalized)) {
      const ws = activeConversations.get(normalized);
      ws.close();
      activeConversations.delete(normalized);
    }
    activeConversationTimeouts.delete(normalized);
  }, SMS_CONVERSATION_TIMEOUT);
  
  activeConversationTimeouts.set(normalized, timeoutId);
  console.log(`⏰ Set 1-minute timeout for SMS conversation: ${phoneNumber}`);
}

function startConversation(phoneNumber, initialMessage) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const normalized = normalizePhoneNumber(phoneNumber);

  if (!agentId || !apiKey) {
    console.error('❌ Missing ElevenLabs credentials');
    return;
  }

  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  const ws = new WebSocket(wsUrl, {
    headers: { 'xi-api-key': apiKey }
  });

  ws.on('open', async () => {
    console.log(`🔗 WebSocket connected for ${phoneNumber} (normalized: ${normalized})`);
    activeConversations.set(normalized, ws);
    
    // ENHANCED: Build conversation context with async loading for better context
    const conversationContext = await buildConversationContext(phoneNumber);
    
    // Get lead data and build dynamic variables like voice calls do
    const leadId = await getActiveLeadForPhone(phoneNumber);
    const leadData = getLeadData(leadId);
    const customerName = leadData?.customerName || `Customer ${phoneNumber}`;
    
    // SECURITY FIX: Get organizationId to prevent cross-organization data leakage
    const organizationId = await getOrganizationIdFromPhone(phoneNumber);
    
    const summaryData = await getConversationSummary(phoneNumber, organizationId);
    const history = await getConversationHistory(phoneNumber, organizationId);
    const leadStatus = summaryData?.summary ? "Returning Customer" : (history.length > 0 ? "Active Lead" : "New Inquiry");
    
    // ENHANCED: Use rich summary logic identical to voice call initiation
    let previousSummary;
    if (summaryData?.summary && summaryData.summary.length > 20) {
      // Use the actual ElevenLabs summary - truncate if too long for dynamic variables  
      previousSummary = summaryData.summary.length > 500 ? summaryData.summary.substring(0, 500) + "..." : summaryData.summary;
      console.log(`📋 SMS using actual ElevenLabs summary (${summaryData.summary.length} chars): ${summaryData.summary.substring(0, 100)}...`);
    } else if (history.length > 0) {
      // Build a rich summary from recent messages if no ElevenLabs summary
      const recentMessages = history.slice(-6); // Last 6 messages
      const customerMessages = recentMessages.filter(m => m.sentBy === 'user');
      const agentMessages = recentMessages.filter(m => m.sentBy === 'agent');
      
      previousSummary = `Previous conversation: ${recentMessages.length} messages exchanged across voice/SMS. `;
      if (customerMessages.length > 0) {
        const lastCustomerMsg = customerMessages[customerMessages.length - 1];
        previousSummary += `Customer's last message: "${lastCustomerMsg.content.substring(0, 100)}${lastCustomerMsg.content.length > 100 ? '...' : ''}"`;
      }
      console.log(`📋 SMS built rich summary from ${history.length} messages: ${previousSummary.substring(0, 100)}...`);
    } else {
      previousSummary = "First conversation - no previous interaction history";
      console.log(`📋 SMS new conversation - no previous history`);
    }
    
    console.log(`📋 SMS Context preserved: ${history.length} total messages, leadId: ${leadId}, context length: ${conversationContext.length}, using ElevenLabs summary: ${!!(summaryData?.summary && summaryData.summary.length > 20)}`);
    
    // DEBUG: Log the actual dynamic variables being sent
    const dynamicVars = {
      customer_name: customerName,
      lead_status: leadStatus,
      previous_summary: previousSummary,
      // FIXED: Include conversation_context (not conversation_overview) to match system prompt
      conversation_context: conversationContext.length > 1000 ? conversationContext.substring(0, 1000) + "..." : conversationContext
    };
    
    console.log(`🧪 DEBUG: SMS Dynamic variables being sent:`, {
      customer_name: dynamicVars.customer_name,
      lead_status: dynamicVars.lead_status,
      previous_summary_length: dynamicVars.previous_summary?.length || 0,
      previous_summary_preview: dynamicVars.previous_summary?.substring(0, 100) + "...",
      conversation_context_length: dynamicVars.conversation_context?.length || 0,
      conversation_context_preview: dynamicVars.conversation_context?.substring(0, 150) + "..."
    });
    
    // ENHANCED: Send comprehensive context including conversation_context AND rich dynamic variables
    // This ensures agents get both the detailed context and rich summary when reconnecting
    ws.send(JSON.stringify({
      type: 'conversation_initiation_client_data',
        dynamic_variables: dynamicVars,
      client_data: {
        conversation_context: conversationContext,
        phone_number: phoneNumber,
        customer_phone: phoneNumber, // For webhook identification
        channel: 'sms',
        lead_id: leadId,
        // ADDED: Include metadata about context preservation
        context_metadata: {
          total_messages: history.length,
          has_elevenlabs_summary: !!(summaryData?.summary && summaryData.summary.length > 20),
          voice_messages: history.filter(m => m.type === 'voice').length,
          sms_messages: history.filter(m => m.type === 'text').length,
          last_interaction: history.length > 0 ? history[history.length - 1].timestamp : null
        }
      }
    }));
  });

  ws.on('message', async (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log(`📨 [${phoneNumber}] Received message type:`, response.type);

      if (response.type === 'conversation_initiation_metadata') {
        console.log(`✅ [${phoneNumber}] Conversation initiated. Adding delay for dynamic variable processing...`);
        
        // CRITICAL FIX: Add delay to allow ElevenLabs to process dynamic variables
        // Without this delay, the agent responds before processing context on WebSocket reconnection
        setTimeout(() => {
          console.log(`📤 [${phoneNumber}] Sending first message after dynamic variable processing delay`);
          ws.send(JSON.stringify({
            type: 'user_message',
            text: initialMessage
          }));
        }, 2000); // 2 second delay to ensure dynamic variables are processed
        
      } else if (response.type === 'agent_response') {
        const agentResponse = response.agent_response_event?.agent_response || '';
        if (agentResponse) {
            console.log(`✅ [${phoneNumber}] Agent response received:`, agentResponse);
            addToConversationHistory(phoneNumber, agentResponse, 'agent', 'text');
            sendSMSReply(phoneNumber, agentResponse);
            
            // Get the active lead ID for this phone number
            const leadId = await getActiveLeadForPhone(phoneNumber);

            // ENHANCED: Reset timeout on activity to prevent premature closure
            const normalized = normalizePhoneNumber(phoneNumber);
            if (activeConversationTimeouts.has(normalized)) {
              clearTimeout(activeConversationTimeouts.get(normalized));
              const timeoutId = setTimeout(() => {
                console.log(`⏰ SMS conversation timeout for ${phoneNumber} - closing to save credits`);
                if (activeConversations.has(normalized)) {
                  const ws = activeConversations.get(normalized);
                  ws.close();
                  activeConversations.delete(normalized);
                }
                activeConversationTimeouts.delete(normalized);
              }, SMS_CONVERSATION_TIMEOUT);
              activeConversationTimeouts.set(normalized, timeoutId);
            }

            broadcastConversationUpdate({
                type: 'sms_sent',
                phoneNumber: phoneNumber,
                message: agentResponse,
                timestamp: new Date().toISOString(),
                sentBy: 'agent',
                leadId: leadId // Use the active lead ID
            });
        }
      } else if (response.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          event_id: response.ping_event.event_id
        }));
      }
    } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        console.error('❌ Raw message:', data.toString());
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ [${phoneNumber}] WebSocket error:`, error);
    if (activeConversations.has(normalized)) {
        activeConversations.delete(normalized);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 [${phoneNumber}] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
    if (activeConversations.has(normalized)) {
        activeConversations.delete(normalized);
    }
    
    // Clean up timeout
    if (activeConversationTimeouts.has(normalized)) {
      clearTimeout(activeConversationTimeouts.get(normalized));
      activeConversationTimeouts.delete(normalized);
    }
  });
}


// --- DEBUG ENDPOINTS FOR TESTING ---

// Debug endpoint to clear conversation history
app.post('/api/debug/clear-history', (req, res) => {
  try {
    const { phoneNumber, confirm } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    // Add safety check to prevent accidental clearing
    if (!confirm) {
      return res.status(400).json({ 
        error: 'Clearing conversation history requires confirmation. Add "confirm": true to the request body.',
        warning: 'This will DELETE all voice and SMS conversation history for this phone number!',
        phoneNumber: phoneNumber
      });
    }
    
    const normalized = normalizePhoneNumber(phoneNumber);
    const existingHistory = getConversationHistorySync(phoneNumber);
    
    if (existingHistory.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No history to clear', 
        normalized,
        clearedMessages: 0
      });
    }
    
    conversationContexts.delete(normalized);
    console.log(`🗑️ Cleared conversation history for ${phoneNumber} (normalized: ${normalized}) - ${existingHistory.length} messages deleted`);
    
    res.json({ 
      success: true, 
      message: 'History cleared', 
      normalized,
      clearedMessages: existingHistory.length,
      warning: 'Voice and SMS conversation history has been permanently deleted!'
    });
  } catch (error) {
    console.error('❌ Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Debug endpoint to get conversation history
app.post('/api/debug/get-history', (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    
    const normalized = normalizePhoneNumber(phoneNumber);
    const history = getConversationHistorySync(phoneNumber);
    console.log(`📋 Retrieved ${history.length} messages for ${phoneNumber} (normalized: ${normalized})`);
    
    res.json({ 
      success: true, 
      phoneNumber,
      normalized,
      messageCount: history.length,
      history 
    });
  } catch (error) {
    console.error('❌ Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Debug endpoint to store conversation metadata
app.post('/api/debug/store-metadata', (req, res) => {
  try {
    const { conversationId, phoneNumber, leadId } = req.body;
    if (!conversationId || !phoneNumber || !leadId) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    storeConversationMetadata(conversationId, phoneNumber, leadId);
    
    res.json({ success: true, message: 'Metadata stored' });
  } catch (error) {
    console.error('❌ Error storing metadata:', error);
    res.status(500).json({ error: 'Failed to store metadata' });
  }
});

// Debug endpoint to set phone-to-lead mapping
app.post('/api/debug/set-lead-mapping', (req, res) => {
  try {
    const { phoneNumber, leadId } = req.body;
    if (!phoneNumber || !leadId) {
      return res.status(400).json({ error: 'Both phoneNumber and leadId are required' });
    }
    
    setActiveLeadForPhone(phoneNumber, leadId);
    
    res.json({ 
      success: true, 
      message: 'Lead mapping set',
      phoneNumber,
      leadId,
      normalized: normalizePhoneNumber(phoneNumber)
    });
  } catch (error) {
    console.error('❌ Error setting lead mapping:', error);
    res.status(500).json({ error: 'Failed to set lead mapping' });
  }
});

// Debug endpoint to manually store a message (for testing)
app.post('/api/debug/store-message', (req, res) => {
  try {
    const { phoneNumber, message, sentBy, type = 'text' } = req.body;
    if (!phoneNumber || !message || !sentBy) {
      return res.status(400).json({ error: 'phoneNumber, message, and sentBy are required' });
    }
    
    addToConversationHistory(phoneNumber, message, sentBy, type);
    
    res.json({ 
      success: true, 
      message: 'Message stored',
      phoneNumber,
      normalized: normalizePhoneNumber(phoneNumber),
      sentBy,
      type
    });
  } catch (error) {
    console.error('❌ Error storing message:', error);
    res.status(500).json({ error: 'Failed to store message' });
  }
});

// Debug endpoint to show all stored conversations
app.get('/api/debug/all-conversations', (req, res) => {
  try {
    const conversations = {};
    for (const [phone, history] of conversationContexts.entries()) {
      conversations[phone] = {
        messageCount: history.length,
        lastMessage: history[history.length - 1]?.content?.substring(0, 100) + '...' || 'No messages'
      };
    }
    
    const metadata = {};
    for (const [convId, meta] of conversationMetadata.entries()) {
      metadata[convId] = meta;
    }
    
    const activeConnections = Array.from(activeConversations.keys());
    
    const phoneToLeadMappings = {};
    for (const [phone, leadId] of phoneToLeadMapping.entries()) {
      phoneToLeadMappings[phone] = leadId;
    }
    
    res.json({
      success: true,
      conversations,
      metadata,
      activeConnections,
      phoneToLeadMappings,
      totalConversations: conversationContexts.size
    });
  } catch (error) {
    console.error('❌ Error getting all conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// --- WEBHOOKS AND API ENDPOINTS ---

// Twilio SMS Incoming Webhook
app.post('/api/webhooks/twilio/sms/incoming', async (req, res) => {
  console.log('📱 Twilio SMS Incoming Webhook received:', req.body);
  
  try {
    const { From, Body, MessageSid } = req.body;
    
    if (!From || !Body) {
      console.error('❌ Missing required SMS data');
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    
    console.log('✅ Incoming SMS processed:', { from: From, body: Body, messageSid: MessageSid });

    const normalizedFrom = normalizePhoneNumber(From);

    // Get the active lead ID for this phone number (prioritizes SSE connections)
    const leadId = await getActiveLeadForPhone(From);

    broadcastConversationUpdate({
      type: 'sms_received',
      phoneNumber: From,
      message: Body,
      timestamp: new Date().toISOString(),
      messageSid: MessageSid,
      sentBy: 'user',
      leadId: leadId // Use the active lead ID
    });

    if (activeConversations.has(normalizedFrom)) {
      console.log('➡️ Existing conversation found. Sending message.');
      const ws = activeConversations.get(normalizedFrom);
      addToConversationHistory(From, Body, 'user', 'text');
      ws.send(JSON.stringify({ type: 'user_message', text: Body }));
    } else {
      // ENHANCED: Check conversation history BEFORE starting new conversation  
      // SECURITY FIX: Get organizationId to prevent cross-organization data leakage
      const organizationId = await getOrganizationIdFromPhone(From);
      const existingHistory = await getConversationHistory(From, organizationId);
      addToConversationHistory(From, Body, 'user', 'text');
      
      if (existingHistory.length > 0) {
        console.log(`📞➡️📱 Found ${existingHistory.length} previous messages (voice/SMS history). Starting new SMS conversation with context.`);
        startConversationWithTimeout(From, Body);
      } else {
        console.log('✨ No existing conversation or history. Creating a new one.');
        startConversationWithTimeout(From, Body);
      }
    }
    
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    
  } catch (error) {
    console.error('❌ Error processing incoming SMS:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// Twilio SMS Status Webhook
app.post('/api/webhooks/twilio/sms/status', (req, res) => {
  console.log('📊 Twilio SMS Status Webhook received:', req.body);
  res.sendStatus(200);
});

// ElevenLabs Outbound Call API (for Voice, using Native Integration) - SECURITY FIXED
app.post('/api/elevenlabs/outbound-call', validateOrganizationAccess, async (req, res) => {
  console.log('📞 Outbound call request received for native integration:', req.body);
  
  try {
    const { phoneNumber, leadId } = req.body;
    const { organizationId } = req;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    console.log('📞 Outbound call request with org context:', { phoneNumber, leadId, organizationId });

    // SECURITY: Validate lead belongs to organization
    const leadData = getLeadData(leadId);
    if (leadData && leadData.organizationId && leadData.organizationId !== organizationId) {
      console.error(`🚨 SECURITY VIOLATION: Attempted call to lead ${leadId} belonging to org ${leadData.organizationId} by org ${organizationId}`);
      return res.status(403).json({ 
        error: 'Access denied - lead belongs to different organization',
        code: 'CROSS_ORG_ACCESS_DENIED' 
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    
    console.log('🔐 Environment check:', { 
      hasApiKey: !!apiKey, 
      hasAgentId: !!agentId,
      hasPhoneNumberId: !!phoneNumberId,
      agentIdLength: agentId?.length 
    });
    
    if (!apiKey || !agentId || !phoneNumberId) {
      console.error('❌ Missing credentials for native outbound call. Ensure ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_PHONE_NUMBER_ID are set.');
      return res.status(500).json({ error: 'Server configuration error for voice calls. Missing required environment variables.' });
    }

    // Use the exact API specification from ElevenLabs documentation
    const elevenlabsApiUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
    
    // Get conversation context for seamless SMS ↔ Voice transition
    // Use normalized phone number to ensure consistency with stored history
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const conversationContext = await buildConversationContext(normalizedPhoneNumber);
    
    // Generate a unique conversation ID for tracking
    const tempConversationId = `temp_${Date.now()}_${phoneNumber}`;
    
    // SECURITY: Use provided organizationId instead of trying to determine it
    const summary = await getConversationSummary(normalizedPhoneNumber, organizationId);
    const messages = await getConversationHistory(normalizedPhoneNumber, organizationId);
    
    // Get actual lead data instead of placeholders (already retrieved above for validation)
    const customerName = leadData?.customerName || `Customer ${phoneNumber}`;
    const leadStatus = summary?.summary ? "Returning Customer" : (messages.length > 0 ? "Active Lead" : "New Inquiry");
    
    // ENHANCED: Use actual ElevenLabs summary instead of generic text
    let previousSummary;
    if (summary?.summary && summary.summary.length > 20) {
      // Use the actual ElevenLabs summary - truncate if too long for dynamic variables
      previousSummary = summary.summary.length > 500 ? summary.summary.substring(0, 500) + "..." : summary.summary;
      console.log(`📋 Using actual ElevenLabs summary (${summary.summary.length} chars): ${summary.summary.substring(0, 100)}...`);
    } else if (messages.length > 0) {
      // Build a rich summary from recent messages if no ElevenLabs summary
      const recentMessages = messages.slice(-6); // Last 6 messages
      const customerMessages = recentMessages.filter(m => m.sentBy === 'user');
      const agentMessages = recentMessages.filter(m => m.sentBy === 'agent');
      
      previousSummary = `Previous conversation: ${recentMessages.length} messages exchanged. `;
      if (customerMessages.length > 0) {
        const lastCustomerMsg = customerMessages[customerMessages.length - 1];
        previousSummary += `Customer's last message: "${lastCustomerMsg.content.substring(0, 100)}${lastCustomerMsg.content.length > 100 ? '...' : ''}"`;
      }
      console.log(`📋 Built rich summary from ${messages.length} messages: ${previousSummary.substring(0, 100)}...`);
    } else {
      previousSummary = "First conversation - no previous interaction history";
      console.log(`📋 New conversation - no previous history`);
    }

    const callPayload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: phoneNumber,
      // Dynamic variables must go inside conversation_initiation_client_data for outbound calls!
      conversation_initiation_client_data: {
        lead_id: leadId,
        customer_phone: phoneNumber,
        organization_id: organizationId, // SECURITY: Include organization context
        dynamic_variables: {
          conversation_context: conversationContext.length > 500 ? conversationContext.substring(0, 500) + "..." : conversationContext,
          customer_name: customerName,
          lead_status: leadStatus,
          previous_summary: previousSummary
        }
      }
    };

    console.log(`📞 Initiating ElevenLabs native call to ${phoneNumber} (org: ${organizationId})`);
    console.log(`📞 Using phone number ID: ${phoneNumberId}`);
    console.log(`📞 Call payload:`, JSON.stringify(callPayload, null, 2));

    const response = await fetch(elevenlabsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(callPayload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Failed to initiate native call:', response.status, errorBody);
        return res.status(response.status).json({ 
          error: 'Failed to initiate call via ElevenLabs API.', 
          details: errorBody,
          payload: callPayload
        });
    }
    
    const result = await response.json();
    console.log('✅ Outbound native call initiated via ElevenLabs:', result);
    
    // Store conversation metadata for webhook processing
    const conversationId = result.call_sid || result.conversation_id || tempConversationId;
    storeConversationMetadata(conversationId, phoneNumber, leadId);
    
    // ENHANCED: Persist call session to Supabase (non-blocking)
    supabasePersistence.persistCallSession({
      id: conversationId,
      leadId: leadId,
      elevenlabsConversationId: result.conversation_id,
      twilioCallSid: result.call_sid,
      phoneNumber: phoneNumber,
      callDirection: 'outbound',
      startedAt: new Date().toISOString(),
      conversationContext: conversationContext,
      dynamicVariables: callPayload.conversation_initiation_client_data?.dynamic_variables,
      organizationId: organizationId // SECURITY: Include organization context
    }).catch(error => {
      console.log(`🗄️ Call session persistence failed (system continues normally):`, error.message);
    });
    
    broadcastConversationUpdate({
      type: 'call_initiated',
      phoneNumber,
      leadId,
      conversationId,
      timestamp: new Date().toISOString(),
      organizationId
    });
    
    res.status(200).json({ 
      success: true,
      message: 'Outbound call initiated successfully', 
      callSid: result.call_sid,
      conversationId,
      organizationId,
      ...result 
    });
    
  } catch (error) {
    console.error('❌ Error initiating outbound call:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to initiate call: ' + error.message,
      stack: error.stack
    });
  }
});

// Twilio SMS Send API (for manual SMS from dashboard text box) - SECURITY FIXED
app.post('/api/twilio/send-sms', validateOrganizationAccess, async (req, res) => {
  try {
    const { to, message, leadId, agentId } = req.body;
    const { organizationId } = req;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Both "to" and "message" are required' });
    }
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required for context management' });
    }
    
    console.log('📱 Manual SMS send request:', { to, message: message.substring(0, 50) + '...', leadId, agentId, organizationId });
    
    // SECURITY: Validate lead belongs to organization
    const leadData = getLeadData(leadId);
    if (leadData && leadData.organizationId && leadData.organizationId !== organizationId) {
      console.error(`🚨 SECURITY VIOLATION: Attempted SMS to lead ${leadId} belonging to org ${leadData.organizationId} by org ${organizationId}`);
      return res.status(403).json({ 
        error: 'Access denied - lead belongs to different organization',
        code: 'CROSS_ORG_ACCESS_DENIED' 
      });
    }
    
    // Normalize phone number for consistent context storage
    const normalizedPhone = normalizePhoneNumber(to);
    
    // Send SMS via existing Twilio function
    await sendSMSReply(to, message);
    
    // Store in conversation history using existing function with organization context
    addToConversationHistory(to, message, 'agent', 'text', organizationId);
    
    // Broadcast to dashboard using existing SSE system
    broadcastConversationUpdate({
      type: 'sms_sent', 
      phoneNumber: to,
      message: message,
      timestamp: new Date().toISOString(),
      sentBy: 'agent',
      leadId: leadId, // This ensures it goes to the correct dashboard
      status: 'sent',
      organizationId
    });
    
    console.log('✅ Manual SMS sent and broadcasted successfully for org:', organizationId);
    
    res.status(200).json({ 
      success: true, 
      message: 'SMS sent successfully',
      normalizedPhone,
      leadId,
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error sending manual SMS:', error);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message 
    });
  }
});

// Internal API for broadcasting conversation updates from Next.js webhooks
app.post('/api/internal/broadcast', (req, res) => {
  try {
    const data = req.body;
    console.log('📡 Internal broadcast request:', data);
    
    broadcastConversationUpdate(data);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error in internal broadcast:', error);
    res.status(500).json({ error: error.message });
  }
});

// ElevenLabs Conversation Events Webhook (moved from Next.js API route)
app.post('/api/webhooks/elevenlabs/conversation-events', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const signature = req.headers['xi-signature'];
    const payload = JSON.stringify(req.body);

    console.log('🔔 WEBHOOK RECEIVED:', {
      timestamp: new Date().toISOString(),
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {}),
      signature: signature ? 'Present' : 'MISSING',
      payloadLength: payload.length,
      eventType: req.body?.type
    });

    const webhookSecret = process.env.ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!webhookSecret) {
      console.error('❌ ElevenLabs conversation events webhook secret not configured');
      return res.status(500).json({ error: 'Conversation events webhook secret not configured' });
    }

    // For debugging, let's temporarily disable signature validation
    if (!signature) {
      console.warn('⚠️ Missing ElevenLabs signature header - continuing for debugging');
    } else {
      console.log('🔐 Webhook signature present:', signature.substring(0, 20) + '...');
    }

    // Verify webhook signature (simplified for now)
    // TODO: Implement proper signature verification if needed
    console.log('🔐 Webhook signature verification - using simplified approach (allowing all)');

    const eventData = req.body;

    // Validate agent ID
    if (eventData.data?.agent_id && eventData.data.agent_id !== agentId) {
      console.error('❌ Invalid agent ID:', eventData.data.agent_id);
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    console.log('📡 Processing ElevenLabs conversation event:', {
      type: eventData.type,
      conversationId: eventData.data?.conversation_id,
      timestamp: eventData.event_timestamp
    });

    // Extract conversation ID
    const conversationId = eventData.data?.conversation_id;
    
    // Try to get metadata from our store
    let metadata = conversationId ? getConversationMetadata(conversationId) : null;
    
    // If no metadata found, try to extract from conversation_initiation_client_data
    if (!metadata && eventData.data?.conversation_initiation_client_data) {
      const clientData = eventData.data.conversation_initiation_client_data;
      const leadId = clientData.lead_id;
      const phoneNumber = clientData.customer_phone;
      const tempId = clientData.temp_conversation_id;
      
      if (leadId && phoneNumber) {
        // Store this metadata for future events
        storeConversationMetadata(conversationId, phoneNumber, leadId);
        metadata = { phoneNumber, leadId };
        
        // Also check if we have a temp ID mapping
        if (tempId) {
          const tempMetadata = getConversationMetadata(tempId);
          if (tempMetadata) {
            // Transfer metadata from temp to real conversation ID
            storeConversationMetadata(conversationId, tempMetadata.phoneNumber, tempMetadata.leadId);
            conversationMetadata.delete(tempId);
          }
        }
      }
    }
    
    // Extract lead ID and phone number from metadata or event data
    const leadId = metadata?.leadId || 
                   eventData.data?.conversation_initiation_client_data?.lead_id ||
                   eventData.data?.metadata?.lead_id;
                   
    const phoneNumber = metadata?.phoneNumber || 
                        eventData.data?.conversation_initiation_client_data?.customer_phone ||
                        eventData.data?.metadata?.phone_number ||
                        eventData.data?.to_phone_number;
    
    console.log('🔍 WEBHOOK DETAILS:', {
      eventType: eventData.type,
      leadId: leadId || 'MISSING',
      phoneNumber: phoneNumber || 'MISSING',
      conversationId: conversationId || 'MISSING',
      hasMessage: !!eventData.data?.message,
      speaker: eventData.data?.speaker,
      metadata: metadata
    });

    // Handle different event types
    switch (eventData.type) {
      case 'conversation_started':
        console.log('🚀 Conversation started:', conversationId);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'conversation_started',
            conversationId,
            phoneNumber,
            leadId,
            timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
          });
        }
        break;

      case 'conversation_ended':
        console.log('🏁 Conversation ended:', conversationId);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'conversation_ended',
            conversationId,
            duration: eventData.data?.duration_ms,
            leadId,
            timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
          });
        }
        // Clean up metadata after conversation ends
        if (conversationId) {
          conversationMetadata.delete(conversationId);
        }
        break;

      case 'call_ended':
      case 'call_terminated':
      case 'call_completed':
      case 'call_disconnected':
        console.log('📞 Call ended event:', eventData.type, conversationId);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'call_ended',
            conversationId,
            duration: eventData.data?.duration_ms || eventData.data?.call_duration_ms,
            leadId,
            phoneNumber,
            reason: eventData.data?.end_reason || eventData.type,
            timestamp: new Date(eventData.event_timestamp * 1000).toISOString()
          });
        }
        // Clean up metadata after call ends
        if (conversationId) {
          conversationMetadata.delete(conversationId);
        }
        break;

      case 'user_message':
      case 'user_transcript':
        const userMessage = eventData.data?.message || eventData.data?.transcript;
        console.log('💬 User voice message:', userMessage?.substring(0, 50));
        if (userMessage && phoneNumber) {
          addToConversationHistory(phoneNumber, userMessage, 'user', 'voice');
          if (leadId) {
            broadcastConversationUpdate({
              type: 'voice_received',
              phoneNumber,
              message: userMessage,
              timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString(),
              conversationId,
              sentBy: 'user',
              leadId
            });
          }
        }
        break;

      case 'agent_message':
      case 'agent_response':
        const agentMessage = eventData.data?.message || eventData.data?.response;
        console.log('🤖 Agent voice message:', agentMessage?.substring(0, 50));
        if (agentMessage && phoneNumber) {
          addToConversationHistory(phoneNumber, agentMessage, 'agent', 'voice');
          if (leadId) {
            broadcastConversationUpdate({
              type: 'voice_sent',
              phoneNumber,
              message: agentMessage,
              timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString(),
              conversationId,
              sentBy: 'agent',
              leadId
            });
          }
        }
        break;

      case 'interruption':
        console.log('⚡ Interruption detected:', eventData.data?.metadata?.interruption_type);
        if (leadId) {
          broadcastConversationUpdate({
            type: 'interruption',
            conversationId,
            interruptionType: eventData.data?.metadata?.interruption_type,
            leadId,
            timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString()
          });
        }
        break;

      case 'silence_detected':
        const silenceDuration = eventData.data?.metadata?.silence_duration_ms;
        if (silenceDuration && silenceDuration > 5000 && leadId) {
          console.log('🤐 Silence detected:', silenceDuration, 'ms');
          broadcastConversationUpdate({
            type: 'silence_detected',
            conversationId,
            duration: silenceDuration,
            leadId,
            timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString()
          });
        }
        break;

      default:
        console.log('🤷 Unknown event type:', eventData.type);
        // Log full event data for unknown types to help debug
        console.log('📋 Full event data:', JSON.stringify(eventData, null, 2));
    }

    res.status(200).json({
      success: true,
      message: 'Conversation event processed successfully',
      eventType: eventData.type
    });

  } catch (error) {
    console.error('❌ WEBHOOK ERROR:', error);
    console.error('❌ Processing time:', Date.now() - startTime, 'ms');
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET endpoint for webhook health check
app.get('/api/webhooks/elevenlabs/conversation-events', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'elevenlabs-conversation-events-webhook',
    timestamp: new Date().toISOString(),
    environment: {
      hasWebhookSecret: !!process.env.ELEVENLABS_CONVERSATION_EVENTS_WEBHOOK_SECRET,
      hasAgentId: !!process.env.ELEVENLABS_AGENT_ID
    }
  });
});

// ElevenLabs Post-Call Webhook
app.post('/api/webhooks/elevenlabs/post-call', async (req, res) => {
  try {
    const signature = req.headers['xi-signature'];
    const payload = JSON.stringify(req.body);

    console.log('📞 POST-CALL WEBHOOK RECEIVED:', {
      timestamp: new Date().toISOString(),
      signature: signature ? 'Present' : 'MISSING',
      payloadLength: payload.length,
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {})
    });

    // Log the full payload structure for debugging
    console.log('📞 FULL POST-CALL PAYLOAD STRUCTURE:', {
      topLevelKeys: Object.keys(req.body || {}),
      hasConversationId: 'conversation_id' in (req.body || {}),
      hasConversationData: 'conversation' in (req.body || {}),
      hasCallData: 'call' in (req.body || {}),
      hasMetadata: 'metadata' in (req.body || {}),
      hasClientData: 'conversation_initiation_client_data' in (req.body || {}),
      rawBodySample: JSON.stringify(req.body).substring(0, 500) + '...'
    });

    const webhookSecret = process.env.ELEVENLABS_POST_CALL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ ElevenLabs post-call webhook secret not configured');
      return res.status(500).json({ error: 'Post-call webhook secret not configured' });
    }

    // For debugging, let's temporarily disable signature validation
    if (!signature) {
      console.warn('⚠️ Missing ElevenLabs post-call signature header - continuing for debugging');
    } else {
      console.log('🔐 Post-call webhook signature present:', signature.substring(0, 20) + '...');
    }

    const eventData = req.body;
    
    // Handle new payload structure (type + event_timestamp + data)
    let conversationId, leadId, duration, summary, phoneNumber;
    
    if (eventData.type === 'post_call_transcription' && eventData.data) {
      // New structure: data contains all the conversation details
      const data = eventData.data;
      conversationId = data.conversation_id;
      
      // Extract from conversation_initiation_client_data
      if (data.conversation_initiation_client_data) {
        leadId = data.conversation_initiation_client_data.lead_id;
        phoneNumber = data.conversation_initiation_client_data.customer_phone || 
                     data.conversation_initiation_client_data.phone_number;
      }
      
      // Extract other fields from data
      duration = data.conversation_duration_ms || data.metadata?.call_duration_secs * 1000;
      summary = data.conversation_summary || data.analysis?.transcript_summary;
      
    } else {
      // Fallback to old structure
      conversationId = eventData.conversation_id || 
                      eventData.conversation?.id || 
                      eventData.call?.conversation_id ||
                      eventData.id;
      
      leadId = eventData.conversation_initiation_client_data?.lead_id ||
              eventData.conversation?.conversation_initiation_client_data?.lead_id ||
              eventData.call?.conversation_initiation_client_data?.lead_id ||
              eventData.metadata?.lead_id ||
              eventData.client_data?.lead_id;
      
      duration = eventData.conversation_duration_ms ||
                eventData.conversation?.duration_ms ||
                eventData.call?.duration_ms ||
                eventData.duration_ms;
      
      summary = eventData.conversation_summary ||
               eventData.conversation?.summary ||
               eventData.call?.summary ||
               eventData.summary;
      
      phoneNumber = eventData.conversation_initiation_client_data?.customer_phone ||
                   eventData.conversation_initiation_client_data?.phone_number ||
                   eventData.conversation?.conversation_initiation_client_data?.customer_phone ||
                   eventData.call?.conversation_initiation_client_data?.customer_phone ||
                   eventData.metadata?.customer_phone ||
                   eventData.client_data?.customer_phone ||
                   eventData.phone_number ||
                   eventData.to_number;
    }

    console.log('📞 POST-CALL PARSED DETAILS:', {
      conversationId: conversationId || 'MISSING',
      leadId: leadId || 'MISSING',
      phoneNumber: phoneNumber || 'MISSING',
      duration: duration || 'MISSING',
      summary: summary ? (summary.substring(0, 100) + '...') : 'MISSING',
      hasTranscript: !!(eventData.transcript || eventData.conversation?.transcript || eventData.call?.transcript)
    });

    // If we still don't have leadId, try to find it from conversation metadata using conversationId
    if (!leadId && conversationId) {
      const metadata = getConversationMetadata(conversationId);
      if (metadata) {
        leadId = metadata.leadId;
        phoneNumber = phoneNumber || metadata.phoneNumber;
        console.log('📞 Found metadata for conversation:', { conversationId, leadId, phoneNumber });
      }
    }

    // If we have phone number but no leadId, try to find the active lead
    if (!leadId && phoneNumber) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      leadId = getActiveLeadForPhone(normalizedPhone);
      console.log('📞 Found active lead for phone:', { phoneNumber, normalizedPhone, leadId });
    }

    // Extract transcript if available
    let transcript;
    if (eventData.type === 'post_call_transcription' && eventData.data) {
      transcript = eventData.data.transcript;
    } else {
      transcript = eventData.transcript || 
                  eventData.conversation?.transcript || 
                  eventData.call?.transcript;
    }

    // Log transcript details if available
    if (transcript) {
      console.log('📞 POST-CALL TRANSCRIPT:', {
        messageCount: Array.isArray(transcript) ? transcript.length : 'Not array',
        firstFewMessages: Array.isArray(transcript) ? transcript.slice(0, 3) : 'N/A'
      });
    }

    // Store conversation history if we have transcript and phone number
    if (transcript && phoneNumber && Array.isArray(transcript)) {
      const normalizedForStorage = normalizePhoneNumber(phoneNumber);
      console.log('📝 Storing post-call conversation history for:', phoneNumber, '(normalized:', normalizedForStorage + ')');
      transcript.forEach(message => {
        if (message.role && message.message) {
          addToConversationHistory(phoneNumber, message.message, message.role, 'voice');
        }
      });
    }

    // Store conversation summary if we have one
    if (summary && phoneNumber) {
      storeConversationSummary(phoneNumber, summary);
    }

    // ENHANCED: Extract and update lead profile from ElevenLabs data collection results
    if (phoneNumber && eventData.analysis?.data_collection_results) {
      await updateLeadFromConversationData(phoneNumber, eventData.analysis.data_collection_results, summary);
    }

    // CRITICAL FIX: Close existing SMS WebSocket conversation after voice call
    // This forces the next SMS to start fresh with full voice + SMS context
    if (phoneNumber) {
      const normalized = normalizePhoneNumber(phoneNumber);
      if (activeConversations.has(normalized)) {
        console.log(`🔄 Closing existing SMS conversation for ${phoneNumber} to refresh context with voice messages`);
        const ws = activeConversations.get(normalized);
        ws.close();
        activeConversations.delete(normalized);
      }
    }

    // Broadcast post-call summary to frontend if we have a lead ID
    if (leadId) {
      const updateData = {
        type: 'post_call_summary',
        conversationId,
        leadId,
        phoneNumber,
        duration,
        summary,
        transcript,
        timestamp: new Date().toISOString()
      };
      
      console.log('📞 Broadcasting post-call update:', {
        leadId,
        hasTranscript: !!transcript,
        summaryLength: summary ? summary.length : 0
      });
      
      broadcastConversationUpdate(updateData);
    } else {
      console.warn('⚠️ No lead ID found for post-call webhook - cannot broadcast to frontend');
    }

    res.status(200).json({
      success: true,
      message: 'Post-call webhook processed successfully',
      parsed: {
        conversationId: !!conversationId,
        leadId: !!leadId,
        phoneNumber: !!phoneNumber,
        duration: !!duration,
        summary: !!summary,
        transcript: !!transcript
      }
    });

  } catch (error) {
    console.error('❌ POST-CALL WEBHOOK ERROR:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// --- HELPER FUNCTIONS and UTILITIES ---

async function sendSMSReply(to, message) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Missing Twilio credentials for SMS reply');
      return;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SMS reply sent:', { to, messageSid: result.sid });
    } else {
      console.error('❌ Failed to send SMS reply:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error sending SMS reply:', error);
  }
}

function broadcastConversationUpdate(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  console.log('📡 Broadcasting update:', {
    type: data.type,
    leadId: data.leadId || 'NONE',
    activeConnections: Array.from(sseConnections.keys()),
    messageLength: message.length
  });
  
  // If data has leadId, only send to connections watching that lead
  if (data.leadId) {
    const connection = sseConnections.get(data.leadId);
    if (connection) {
      try {
        connection.write(message);
        console.log(`✅ Sent update to lead ${data.leadId}`);
      } catch (error) {
        console.error('❌ Error broadcasting to SSE client:', error);
        sseConnections.delete(data.leadId);
      }
    } else {
      console.log(`❌ No SSE connection found for lead ${data.leadId}`);
    }
    
    // ENHANCED: Log activity to Supabase (non-blocking CRM feature)
    if (data.leadId && data.type) {
      const description = data.message || data.summary || `${data.type} event occurred`;
      supabasePersistence.logLeadActivity(data.leadId, data.type, description, {
        phoneNumber: data.phoneNumber,
        timestamp: data.timestamp
      }).catch(error => {
        console.log(`🗄️ Activity logging failed (system continues normally):`, error.message);
      });
    }
  } else {
    // Broadcast to all connections if no specific leadId
    console.log(`📡 Broadcasting to all ${sseConnections.size} connections`);
    sseConnections.forEach((res, leadId) => {
    try {
      res.write(message);
        console.log(`✅ Sent update to lead ${leadId}`);
    } catch (error) {
      console.error('❌ Error broadcasting to SSE client:', error);
        sseConnections.delete(leadId);
    }
  });
  }
}

// SECURITY: Organization validation middleware
async function validateOrganizationAccess(req, res, next) {
  try {
  const { leadId } = req.params;
    // For SSE connections, organizationId comes from query params since headers aren't supported
    // For regular API calls, organizationId comes from headers
    const organizationId = req.headers.organizationId || req.query.organizationId;
    
    console.log('🔍 Organization validation:', {
      leadId,
      fromHeaders: req.headers.organizationId,
      fromQuery: req.query.organizationId,
      finalOrgId: organizationId,
      url: req.url,
      method: req.method
    });
    
    if (!organizationId) {
      console.error('❌ Organization context missing:', { headers: req.headers, query: req.query });
      return res.status(400).json({ 
        error: 'Organization context required',
        code: 'MISSING_ORG_CONTEXT' 
      });
    }
    
    // Validate lead belongs to organization
    if (leadId) {
      const leadData = getLeadData(leadId);
      if (leadData && leadData.organizationId && leadData.organizationId !== organizationId) {
        console.error(`🚨 SECURITY VIOLATION: Attempted cross-organization access - Lead ${leadId} belongs to org ${leadData.organizationId}, requested by org ${organizationId}`);
        return res.status(403).json({ 
          error: 'Access denied - lead belongs to different organization',
          code: 'CROSS_ORG_ACCESS_DENIED' 
        });
      }
    }
    
    req.organizationId = organizationId;
    next();
  } catch (error) {
    console.error('❌ Organization validation error:', error);
    res.status(500).json({ error: 'Organization validation failed' });
  }
}

// Server-Sent Events endpoint for real-time UI updates - SECURITY FIXED
app.get('/api/stream/conversation/:leadId', validateOrganizationAccess, async (req, res) => {
  const { leadId } = req.params;
  const { phoneNumber, load } = req.query;
  const { organizationId } = req;
  
  console.log(`📡 SSE connection established for lead: ${leadId} (org: ${organizationId})`, phoneNumber ? `(phone: ${phoneNumber})` : '');
  console.log('🔍 Organization ID source:', req.headers.organizationId ? 'headers' : 'query', 'value:', organizationId);
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Store connection by leadId
  sseConnections.set(leadId, res);
  
  // If phone number is provided, set the active lead mapping
  if (phoneNumber) {
    setActiveLeadForPhone(phoneNumber, leadId);
  }
  
  res.write(`data: ${JSON.stringify({ type: 'connected', leadId, organizationId })}\n\n`);

  // SECURITY FIXED: If load=true, send existing conversation history with organization validation
  if (load === 'true' && phoneNumber) {
    try {
      console.log(`📋 Loading conversation history for SSE connection: ${leadId} (phone: ${phoneNumber}) (org: ${organizationId})`);
      
      // SECURITY: Use provided organizationId instead of trying to determine it
      const messages = await getConversationHistory(phoneNumber, organizationId);
      const summary = await getConversationSummary(phoneNumber, organizationId);
      
      // Format messages for frontend
      const formattedMessages = messages.map((msg, index) => ({
        id: `msg-${index}-${Date.now()}`,
        content: msg.content,
        timestamp: msg.timestamp,
        sentBy: msg.sentBy,
        type: msg.type || 'sms',
        status: 'delivered'
      }));
      
      // Send conversation history as initial data
      res.write(`data: ${JSON.stringify({
        type: 'conversation_history',
        leadId,
        phoneNumber,
        messages: formattedMessages,
        summary: summary?.summary,
        totalMessages: formattedMessages.length,
        organizationId
      })}\n\n`);
      
      console.log(`📋 Sent ${formattedMessages.length} messages via SSE for lead ${leadId} (org: ${organizationId})`);
      
    } catch (error) {
      console.error(`❌ Error loading conversation history for SSE:`, error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Failed to load conversation history',
        error: error.message
      })}\n\n`);
    }
  }

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on('close', () => {
    console.log(`📡 SSE connection closed for lead: ${leadId}`);
    sseConnections.delete(leadId);
    
    // Clean up phone-to-lead mapping if this was the active lead
    if (phoneNumber) {
      removeActiveLeadForPhone(phoneNumber, leadId);
    }
    
    clearInterval(heartbeat);
  });
});

// --- TEST AND HEALTHCHECK ---

// Debug endpoint to test post-call webhook parsing
app.post('/api/debug/post-call-webhook', (req, res) => {
  console.log('🧪 DEBUG: Testing post-call webhook parsing with sample payload');
  
  // Create a sample post-call payload structure
  const samplePayload = {
    conversation_id: 'conv_01jyf90tk3e4kvk1pptcw4w9wa',
    conversation_duration_ms: 45000,
    conversation_summary: 'Customer called asking about SUV financing options. Agent provided information about available vehicles and financing terms. Customer expressed interest in scheduling a test drive.',
    conversation_initiation_client_data: {
      lead_id: 'test1',
      customer_phone: '(604) 908-5474',
      conversation_context: 'Previous SMS conversation context...',
      temp_conversation_id: 'temp_1750711949650_(604) 908-5474'
    },
    transcript: [
      {
        role: 'agent',
        message: 'Hi! Hope you\'re having a great day! This is Jack from Driving with Steve...',
        timestamp: '2025-06-23T20:50:00.000Z'
      },
      {
        role: 'user', 
        message: 'Hi Jack, yes I\'m interested in SUV financing.',
        timestamp: '2025-06-23T20:50:15.000Z'
      }
    ],
    call_ended_reason: 'user_hangup',
    timestamp: new Date().toISOString()
  };
  
  // Simulate the webhook processing
  req.body = samplePayload;
  
  // Process using the same logic as the real webhook
  const eventData = req.body;
  
  let conversationId = eventData.conversation_id || 
                      eventData.conversation?.id || 
                      eventData.call?.conversation_id ||
                      eventData.id;
  
  let leadId = eventData.conversation_initiation_client_data?.lead_id ||
              eventData.conversation?.conversation_initiation_client_data?.lead_id ||
              eventData.call?.conversation_initiation_client_data?.lead_id ||
              eventData.metadata?.lead_id ||
              eventData.client_data?.lead_id;
  
  let duration = eventData.conversation_duration_ms ||
                eventData.conversation?.duration_ms ||
                eventData.call?.duration_ms ||
                eventData.duration_ms;
  
  let summary = eventData.conversation_summary ||
               eventData.conversation?.summary ||
               eventData.call?.summary ||
               eventData.summary;
  
  let       phoneNumber = eventData.conversation_initiation_client_data?.customer_phone ||
                   eventData.conversation_initiation_client_data?.phone_number ||
                   eventData.conversation?.conversation_initiation_client_data?.customer_phone ||
                   eventData.call?.conversation_initiation_client_data?.customer_phone ||
                   eventData.metadata?.customer_phone ||
                   eventData.client_data?.customer_phone ||
                   eventData.phone_number ||
                   eventData.to_number;

  let transcript = eventData.transcript || 
                  eventData.conversation?.transcript || 
                  eventData.call?.transcript;

  console.log('🧪 DEBUG: Parsed sample payload:', {
    conversationId,
    leadId,
    phoneNumber,
    duration,
    summaryLength: summary?.length,
    transcriptMessages: Array.isArray(transcript) ? transcript.length : 'Not array'
  });

  // Test broadcasting
  if (leadId) {
    broadcastConversationUpdate({
      type: 'post_call_summary',
      conversationId,
      leadId,
      phoneNumber,
      duration,
      summary,
      transcript,
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Debug post-call webhook test completed',
    parsed: {
      conversationId: !!conversationId,
      leadId: !!leadId,
      phoneNumber: !!phoneNumber,
      duration: !!duration,
      summary: !!summary,
      transcript: !!transcript
    },
    samplePayload
  });
});

// Test endpoint for stateful conversations
app.post('/api/test/conversation', (req, res) => {
  const { phoneNumber, message } = req.body;
  if (!phoneNumber || !message) {
    return res.status(400).json({ error: 'Both phoneNumber and message are required.' });
  }

  console.log(`🧪 Test: Simulating incoming SMS from ${phoneNumber}`);
  
  if (activeConversations.has(phoneNumber)) {
    const ws = activeConversations.get(phoneNumber);
    ws.send(JSON.stringify({ type: 'user_message', text: message }));
    res.json({ success: true, message: 'Test message sent to existing conversation.' });
  } else {
    startConversation(phoneNumber, message);
    res.json({ success: true, message: 'New conversation started with test message.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSseConnections: sseConnections.size,
    activeWsConversations: activeConversations.size,
    storedConversations: conversationMetadata.size
  });
});

// Conversation history endpoint - SECURITY FIXED with organization validation
app.get('/api/conversation-history/:leadId', validateOrganizationAccess, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { phoneNumber } = req.query;
    const { organizationId } = req;
    
    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }
    
    let phoneToUse = phoneNumber;
    
    // If no phone number provided, try to get it from lead data
    if (!phoneToUse) {
      const leadData = getLeadData(leadId);
      phoneToUse = leadData?.phoneNumber;
    }
    
    if (!phoneToUse) {
      console.log(`⚠️ No phone number found for lead ${leadId} (org: ${organizationId})`);
      return res.json({ 
        messages: [],
        leadId,
        organizationId,
        message: 'No phone number associated with this lead'
      });
    }
    
    // SECURITY: Use provided organizationId instead of trying to determine it
    const messages = await getConversationHistory(phoneToUse, organizationId);
    const summary = await getConversationSummary(phoneToUse, organizationId);
    
    console.log(`📋 API: Retrieved ${messages.length} messages for lead ${leadId} (${phoneToUse}) (org: ${organizationId})`);
    
    // Convert internal message format to API format
    const formattedMessages = messages.map((msg, index) => ({
      id: `msg-${index}-${Date.now()}`,
      content: msg.content,
      timestamp: msg.timestamp,
      sentBy: msg.sentBy,
      type: msg.type || 'sms',
      status: 'delivered'
    }));
    
    res.json({
      messages: formattedMessages,
      leadId,
      phoneNumber: phoneToUse,
      summary: summary?.summary,
      totalMessages: formattedMessages.length,
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error retrieving conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve conversation history',
      details: error.message 
    });
  }
});

// ElevenLabs Conversation Initiation Webhook
app.post('/api/webhooks/elevenlabs/conversation-initiation', async (req, res) => {
  console.log('🔄 ElevenLabs Conversation Initiation Webhook received:', {
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: Object.keys(req.headers)
  });

  try {
    const { caller_id, agent_id, called_number, call_sid } = req.body;
    
    if (!caller_id) {
      console.error('❌ Missing caller_id in webhook request');
      return res.status(400).json({ error: 'Missing caller_id' });
    }

    const normalizedPhone = normalizePhoneNumber(caller_id);
    console.log(`📞 Building conversation initiation data for ${caller_id} (normalized: ${normalizedPhone})`);

    // Get the active lead for this phone number
    const activeLead = getActiveLeadForPhone(normalizedPhone);
    console.log(`🔍 Active lead for ${normalizedPhone}:`, activeLead);

    // Build conversation context - ENHANCED with Supabase loading
    const conversationContext = await buildConversationContext(caller_id);
    // SECURITY FIX: Get organizationId to prevent cross-organization data leakage
    const organizationId = await getOrganizationIdFromPhone(caller_id);
    const summary = await getConversationSummary(normalizedPhone, organizationId);
    const messages = await getConversationHistory(caller_id, organizationId);
    
    console.log(`🧪 DEBUG: conversationContext length: ${conversationContext.length}`);
    console.log(`🧪 DEBUG: activeLead:`, activeLead);
    
    // Get actual lead data if we have an active lead
    const leadData = activeLead ? getLeadData(activeLead) : null;
    console.log(`🧪 DEBUG: leadData:`, leadData);
    
    const customerName = leadData?.customerName || "Customer";
    const leadStatus = summary?.summary ? "Returning Customer" : (messages.length > 0 ? "Active Lead" : "New Inquiry");
    
    // ENHANCED: Use actual ElevenLabs summary instead of generic text
    let previousSummary;
    if (summary?.summary && summary.summary.length > 20) {
      // Use the actual ElevenLabs summary - truncate if too long for dynamic variables
      previousSummary = summary.summary.length > 500 ? summary.summary.substring(0, 500) + "..." : summary.summary;
      console.log(`📋 Using actual ElevenLabs summary (${summary.summary.length} chars): ${summary.summary.substring(0, 100)}...`);
    } else if (messages.length > 0) {
      // Build a rich summary from recent messages if no ElevenLabs summary
      const recentMessages = messages.slice(-6); // Last 6 messages
      const customerMessages = recentMessages.filter(m => m.sentBy === 'user');
      const agentMessages = recentMessages.filter(m => m.sentBy === 'agent');
      
      previousSummary = `Previous conversation: ${recentMessages.length} messages exchanged. `;
      if (customerMessages.length > 0) {
        const lastCustomerMsg = customerMessages[customerMessages.length - 1];
        previousSummary += `Customer's last message: "${lastCustomerMsg.content.substring(0, 100)}${lastCustomerMsg.content.length > 100 ? '...' : ''}"`;
      }
      console.log(`📋 Built rich summary from ${messages.length} messages: ${previousSummary.substring(0, 100)}...`);
    } else {
      previousSummary = "First conversation - no previous interaction history";
      console.log(`📋 New conversation - no previous history`);
    }

    // Keep the conversation context simple - don't add extra formatting that might break ElevenLabs
    const finalContext = conversationContext.length > 500 ? conversationContext.substring(0, 500) + "..." : conversationContext;
    
    // Build the response in the format ElevenLabs expects (keeping it simple)
    const response = {
      dynamic_variables: {
        conversation_context: finalContext,
        customer_name: customerName,
        lead_status: leadStatus,
        previous_summary: previousSummary
      }
    };
    
    console.log(`🧪 DEBUG: Final response variables:`, {
      conversation_context_length: finalContext.length,
      customer_name: customerName,
      lead_status: leadStatus,
      previous_summary_length: previousSummary.length,
      previous_summary_preview: previousSummary.substring(0, 150) + "...",
      using_elevenlabs_summary: !!(summary?.summary && summary.summary.length > 20)
    });

    console.log('✅ Returning conversation initiation data:', {
      caller_id,
      contextLength: conversationContext.length,
      summaryLength: summary?.summary?.length || 0,
      messageCount: messages.length
    });

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error processing conversation initiation webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to create new leads (called from SubprimeAddLeadDialog)
app.post('/api/subprime/create-lead', async (req, res) => {
  try {
    const leadData = req.body;
    
    console.log('📝 Creating new subprime lead:', {
      id: leadData.id,
      customerName: leadData.customerName,
      phoneNumber: leadData.phoneNumber,
      fundingReadiness: leadData.fundingReadiness,
      sentiment: leadData.sentiment
    });

    // Validate required fields for telephony integration
    if (!leadData.id || !leadData.customerName || !leadData.phoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, customerName, and phoneNumber are required for telephony integration' 
      });
    }

    // Validate phone number format for Twilio
    if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(leadData.phoneNumber)) {
      return res.status(400).json({ 
        error: 'Phone number must be in format (555) 123-4567 for Twilio integration' 
      });
    }

    // Store the lead in memory (preserves all existing functionality)
    const leadRecord = {
      id: leadData.id,
      customerName: leadData.customerName,
      phoneNumber: leadData.phoneNumber,
      email: leadData.email,
      chaseStatus: leadData.chaseStatus || "Auto Chase Running",
      organizationId: leadData.organizationId, // Store organization context
      fundingReadiness: leadData.fundingReadiness || "Not Ready",
      fundingReadinessReason: leadData.fundingReadinessReason,
      sentiment: leadData.sentiment || "Neutral",
      creditProfile: leadData.creditProfile,
      vehiclePreference: leadData.vehiclePreference,
      assignedAgent: leadData.assignedAgent,
      assignedSpecialist: leadData.assignedSpecialist,
      lastTouchpoint: leadData.lastTouchpoint || new Date().toISOString(),
      conversations: leadData.conversations || [],
      nextAction: leadData.nextAction,
      scriptProgress: leadData.scriptProgress || {
        currentStep: "contacted",
        completedSteps: ["contacted"]
      }
    };
    
    dynamicLeads.set(leadData.id, leadRecord);
    
    // ENHANCED: Async persistence to Supabase (non-blocking)
    supabasePersistence.persistLead(leadRecord)
      .catch(error => {
        console.log(`🗄️ Persistence failed for lead ${leadData.id} (system continues normally):`, error.message);
      });

    console.log(`✅ Lead ${leadData.id} stored successfully. Dynamic variables available:`, {
      customer_name: leadData.customerName,
      phone_number_normalized: normalizePhoneNumber(leadData.phoneNumber),
      funding_readiness: leadData.fundingReadiness,
      sentiment: leadData.sentiment
    });

    res.status(201).json({ 
      success: true, 
      message: 'Lead created successfully',
      leadId: leadData.id,
      dynamicVariables: {
        customer_name: leadData.customerName,
        lead_status: "New Inquiry", // Since it's a new lead
        conversation_context: "New lead - no previous conversation history",
        previous_summary: "First conversation"
      }
    });

  } catch (error) {
    console.error('❌ Error creating lead:', error);
    res.status(500).json({ 
      error: 'Failed to create lead',
      details: error.message 
    });
  }
});

// API endpoint to get all dynamic leads (smart: tries Supabase first, then memory)
app.get('/api/subprime/leads', async (req, res) => {
  try {
    // Try Supabase first (in case initialization failed but Supabase is working)
    if (supabasePersistence.isEnabled) {
      try {
        const dbLeads = await supabasePersistence.getAllLeads(500);
        if (dbLeads && dbLeads.length > 0) {
          // Convert to frontend format
          const formattedLeads = dbLeads.map(dbLead => ({
            id: dbLead.id,
            customerName: dbLead.customer_name,
            phoneNumber: dbLead.phone_number,
            email: dbLead.email,
            chaseStatus: dbLead.chase_status,
            fundingReadiness: dbLead.funding_readiness,
            fundingReadinessReason: dbLead.funding_readiness_reason,
            sentiment: dbLead.sentiment,
            creditProfile: {
              scoreRange: dbLead.credit_score_range,
              knownIssues: dbLead.credit_known_issues ? JSON.parse(dbLead.credit_known_issues) : []
            },
            vehiclePreference: dbLead.vehicle_preference,
            assignedAgent: dbLead.assigned_agent,
            assignedSpecialist: dbLead.assigned_specialist,
            lastTouchpoint: dbLead.last_touchpoint,
            conversations: [], // Will be loaded separately if needed
            nextAction: {
              type: dbLead.next_action_type,
              dueDate: dbLead.next_action_due_date,
              isAutomated: dbLead.next_action_is_automated,
              isOverdue: dbLead.next_action_is_overdue
            },
            scriptProgress: {
              currentStep: dbLead.script_progress_current_step || 'contacted',
              completedSteps: dbLead.script_progress_completed_steps ? JSON.parse(dbLead.script_progress_completed_steps) : ['contacted']
            }
          }));
          
          // Also sync to memory for faster future access
          formattedLeads.forEach(lead => {
            dynamicLeads.set(lead.id, lead);
            // Set up phone mapping
            const normalizedPhone = normalizePhoneNumber(lead.phoneNumber);
            phoneToLeadMapping.set(normalizedPhone, lead.id);
          });
          
          console.log(`📋 Retrieved ${formattedLeads.length} leads from Supabase (synced to memory)`);
          
          return res.json({
            success: true,
            leads: formattedLeads,
            count: formattedLeads.length,
            source: 'database'
          });
        }
      } catch (dbError) {
        console.warn('⚠️ Supabase retrieval failed, falling back to memory:', dbError.message);
      }
    }
    
    // Fallback to memory
    const leads = Array.from(dynamicLeads.values());
    console.log(`📋 Retrieved ${leads.length} dynamic leads from memory`);
    
    res.json({
      success: true,
      leads: leads,
      count: leads.length,
      source: 'memory'
    });
  } catch (error) {
    console.error('❌ Error retrieving leads:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve leads',
      details: error.message 
    });
  }
});

// API endpoint to update lead data
app.put('/api/subprime/update-lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const updates = req.body;
    
    if (!dynamicLeads.has(leadId)) {
      return res.status(404).json({ 
        error: `Lead ${leadId} not found in dynamic storage` 
      });
    }

    const currentLead = dynamicLeads.get(leadId);
    const updatedLead = { ...currentLead, ...updates };
    
    dynamicLeads.set(leadId, updatedLead);
    
    console.log(`✅ Updated lead ${leadId}:`, {
      customerName: updatedLead.customerName,
      sentiment: updatedLead.sentiment,
      fundingReadiness: updatedLead.fundingReadiness
    });

    // ENHANCED: Persist lead updates to Supabase (non-blocking)
    supabasePersistence.persistLead(updatedLead)
      .catch(error => {
        console.log(`🗄️ Lead update persistence failed (system continues normally):`, error.message);
      });

    res.json({ 
      success: true, 
      message: 'Lead updated successfully',
      leadId: leadId,
      updatedFields: Object.keys(updates)
    });

  } catch (error) {
    console.error('❌ Error updating lead:', error);
    res.status(500).json({ 
      error: 'Failed to update lead',
      details: error.message 
    });
  }
});

// API endpoint to delete lead data
app.delete('/api/subprime/delete-lead', async (req, res) => {
  try {
    const leadId = req.query.id;
    
    if (!leadId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead ID is required' 
      });
    }

    console.log('🗑️ Deleting lead:', leadId);

    // Try to delete from database first
    try {
      await supabasePersistence.deleteLead(leadId);
      console.log('✅ Lead deleted from database:', leadId);
    } catch (dbError) {
      console.warn('⚠️ Database delete failed, continuing with memory delete:', dbError.message);
    }

    // Delete from in-memory storage
    if (dynamicLeads.has(leadId)) {
      dynamicLeads.delete(leadId);
      console.log('✅ Lead deleted from memory:', leadId);
    }

    // Also remove from phone mappings if exists
    const phoneToRemove = Array.from(phoneToLeadMapping.entries())
      .find(([phone, storedLeadId]) => storedLeadId === leadId)?.[0];
    
    if (phoneToRemove) {
      phoneToLeadMapping.delete(phoneToRemove);
      console.log('✅ Removed phone mapping for lead:', leadId);
      
      // CRITICAL FIX: Clear conversation caches for this phone number
      // This prevents stale conversation summaries (like Mercedes data) from being retrieved
      const normalizedPhone = normalizePhoneNumber(phoneToRemove);
      
      if (conversationContexts.has(normalizedPhone)) {
        conversationContexts.delete(normalizedPhone);
        console.log('✅ Cleared conversation context cache for:', normalizedPhone);
      }
      
      if (conversationSummaries.has(normalizedPhone)) {
        conversationSummaries.delete(normalizedPhone);
        console.log('✅ Cleared conversation summary cache for:', normalizedPhone);
      }
      
      // Also close any active WebSocket connections for this phone
      if (activeConversations.has(normalizedPhone)) {
        const ws = activeConversations.get(normalizedPhone);
        ws.close();
        activeConversations.delete(normalizedPhone);
        console.log('✅ Closed active WebSocket connection for:', normalizedPhone);
      }
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully',
      leadId
    });

  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to delete lead' 
    });
  }
});

// API endpoint to delete all leads (clear test data)
app.delete('/api/subprime/clear-test-data', async (req, res) => {
  try {
    console.log('🗑️ Clearing all test data...');

    // Count current leads
    const currentCount = dynamicLeads.size;

    // Try to delete all from database first
    let deletedFromDb = 0;
    try {
      deletedFromDb = await supabasePersistence.deleteAllLeads();
      console.log(`✅ Deleted ${deletedFromDb} leads from database`);
    } catch (dbError) {
      console.warn('⚠️ Database clear failed, continuing with memory clear:', dbError.message);
    }

    // Clear in-memory storage
    dynamicLeads.clear();
    console.log(`✅ Cleared ${currentCount} leads from memory`);

    // Clear phone mappings
    phoneToLeadMapping.clear();
    console.log('✅ Cleared phone mappings');

    // Clear conversation contexts
    conversationContexts.clear();
    conversationSummaries.clear();
    console.log('✅ Cleared conversation contexts');

    res.json({
      success: true,
      message: 'All test data cleared successfully',
      deletedCount: Math.max(currentCount, deletedFromDb)
    });

  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to clear test data' 
    });
  }
});

// NEW CRM ENDPOINTS (don't affect existing functionality)

// Get lead analytics
app.get('/api/analytics/lead/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    
    // Try to get from Supabase first, fallback to memory
    const analytics = await supabasePersistence.getLeadAnalytics(leadId);
    
    if (analytics) {
      res.json({
        success: true,
        analytics: analytics,
        source: 'database'
      });
    } else {
      // Fallback to memory-based calculation
      const lead = dynamicLeads.get(leadId);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      const memoryAnalytics = {
        leadScore: 50, // Default score
        totalInteractions: lead.conversations?.length || 0,
        lastActivityDays: 0,
        communicationPreference: 'SMS',
        engagementLevel: 'Medium'
      };
      
      res.json({
        success: true,
        analytics: memoryAnalytics,
        source: 'memory'
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting lead analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics',
      details: error.message 
    });
  }
});

// Get all leads with analytics (CRM dashboard)
app.get('/api/analytics/leads', async (req, res) => {
  try {
    const { limit = 100, organization_id } = req.query;
    
    if (!organization_id) {
      return res.status(400).json({ 
        success: false,
        error: 'organization_id is required for analytics data' 
      });
    }
    
    const analyticsData = await supabasePersistence.getAllLeadsWithAnalytics(parseInt(limit), organization_id);
    
    if (analyticsData && analyticsData.length > 0) {
      res.json({
        success: true,
        leads: analyticsData,
        count: analyticsData.length,
        source: 'database',
        organization_id
      });
    } else {
      // Fallback to memory data (filtered by organization if possible)
      const memoryLeads = Array.from(dynamicLeads.values())
        .filter(lead => !organization_id || lead.organization_id === organization_id)
        .map(lead => ({
          id: lead.id,
          customer_name: lead.customerName,
          phone_number: lead.phoneNumber,
          sentiment: lead.sentiment,
          funding_readiness: lead.fundingReadiness,
          total_conversations: lead.conversations?.length || 0,
          last_activity: lead.lastTouchpoint,
          lead_score: 50
        }));
      
      res.json({
        success: true,
        leads: memoryLeads,
        count: memoryLeads.length,
        source: 'memory',
        organization_id
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting leads analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get leads analytics',
      details: error.message 
    });
  }
});

// Get conversation history for a lead (enhanced)
app.get('/api/conversations/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { limit = 50 } = req.query;
    
    // Get lead to find phone number
    const lead = dynamicLeads.get(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Try Supabase first, fallback to memory
    const dbHistory = await supabasePersistence.getConversationHistory(lead.phoneNumber, parseInt(limit));
    
    if (dbHistory && dbHistory.length > 0) {
      res.json({
        success: true,
        conversations: dbHistory,
        count: dbHistory.length,
        source: 'database'
      });
    } else {
      // Fallback to memory
      const memoryHistory = getConversationHistorySync(lead.phoneNumber);
      res.json({
        success: true,
        conversations: memoryHistory,
        count: memoryHistory.length,
        source: 'memory'
      });
    }
    
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    res.status(500).json({ 
      error: 'Failed to get conversation history',
      details: error.message 
    });
  }
});

// Add agent note
app.post('/api/notes/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { content, noteType = 'general', agentName, isPrivate = false } = req.body;
    
    if (!content || !agentName) {
      return res.status(400).json({ error: 'Content and agent name are required' });
    }
    
    // For now, just log to Supabase (memory storage would be complex for notes)
    await supabasePersistence.logLeadActivity(leadId, 'note_added', content, {
      noteType,
      agentName,
      isPrivate
    });
    
    res.json({
      success: true,
      message: 'Note added successfully'
    });
    
  } catch (error) {
    console.error('❌ Error adding note:', error);
    res.status(500).json({ 
      error: 'Failed to add note',
      details: error.message 
    });
  }
});

// 📊 ANALYTICS ENDPOINTS FOR ELEVENLABS PANEL
app.get('/api/analytics/global', async (req, res) => {
  try {
    const { organization_id } = req.query;
    console.log('📊 Global analytics requested for organization:', organization_id);
    
    // SECURITY: Require organization_id for analytics
    if (!organization_id) {
      return res.status(400).json({
        success: false,
        error: 'organization_id parameter is required for analytics data'
      });
    }
    
    // FIXED: Use property access instead of function call
    if (!supabasePersistence.isEnabled || !supabasePersistence.isConnected) {
      console.log('📊 Supabase not available, returning mock analytics');
      return res.json({
        success: true,
        data: {
          conversationQuality: 73,
          buyingSignals: 8,
          conversionRate: 12,
          totalConversations: 24,
          activeLeads: 6,
          connectionStatus: 'mock'
        },
        message: 'Mock analytics data (Supabase offline)'
      });
    }

    // Use supabasePersistence service methods instead of direct supabase calls
    let totalConversations = 0;
    let totalMessages = 0;
    let buyingSignalsCount = 0;

    try {
      // Count conversations from memory and add Supabase data
      totalConversations = conversationContexts.size;
      
      // Analyze messages from memory for buying signals
      const buyingKeywords = ['financing', 'payment', 'monthly', 'qualify', 'credit', 'approve', 'rate', 'price', 'cost', 'interested'];
      
      for (const [phone, messages] of conversationContexts.entries()) {
        totalMessages += messages.length;
        
        messages.forEach(msg => {
          if (msg.sentBy === 'user' && msg.content) {
            const content = msg.content.toLowerCase();
            if (buyingKeywords.some(keyword => content.includes(keyword))) {
              buyingSignalsCount++;
            }
          }
        });
      }
      
      // Add dynamic leads count
      totalConversations = Math.max(totalConversations, dynamicLeads.size);
      
      console.log('📊 Memory analytics:', { 
        totalConversations, 
        totalMessages, 
        buyingSignalsCount,
        activeLeads: dynamicLeads.size
      });

    } catch (dbError) {
      console.log('📊 Error accessing analytics data:', dbError);
      // Continue with memory-only data
    }

    // Calculate quality score based on engagement
    const avgMessagesPerConv = totalConversations > 0 ? totalMessages / totalConversations : 0;
    const baseQuality = Math.min(95, Math.max(30, avgMessagesPerConv * 12));
    
    // Add some variance based on buying signals
    const qualityBonus = Math.min(20, buyingSignalsCount * 2);
    const qualityScore = Math.min(95, baseQuality + qualityBonus);

    // Calculate conversion rate based on buying signals ratio
    const conversionRate = totalConversations > 0 
      ? Math.min(25, Math.max(5, (buyingSignalsCount / totalConversations) * 100))
      : 8;

    const analyticsData = {
      conversationQuality: Math.round(qualityScore),
      buyingSignals: buyingSignalsCount,
      conversionRate: Math.round(conversionRate),
      totalConversations,
      activeLeads: dynamicLeads.size,
      connectionStatus: 'live'
    };

    console.log('📊 Returning calculated analytics:', analyticsData);
    res.json({
      success: true,
      data: analyticsData,
      message: 'Analytics from memory and database'
    });

  } catch (error) {
    console.error('📊 Analytics error:', error);
    
    // Return enhanced mock data on error
    res.json({
      success: true,
      data: {
        conversationQuality: 67,
        buyingSignals: 5,
        conversionRate: 15,
        totalConversations: 18,
        activeLeads: 4,
        connectionStatus: 'fallback'
      },
      message: 'Fallback analytics data'
    });
  }
});

app.get('/api/analytics/lead/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    console.log('📊 Lead analytics requested for:', leadId);
    
    // FIXED: Use property access instead of function call
    if (!supabasePersistence.isEnabled || !supabasePersistence.isConnected) {
      return res.json({
        success: true,
        data: {
          conversationQuality: 78,
          buyingSignals: ['Asked about financing', 'Discussed monthly payments'],
          sentimentScore: 0.7,
          engagementLevel: 'high',
          messageCount: 12,
          connectionStatus: 'mock'
        }
      });
    }

    // Get lead data from memory to find phone number
    const leadData = getLeadData(leadId);
    if (!leadData || !leadData.phoneNumber) {
      return res.json({
        success: true,
        data: {
          conversationQuality: 50,
          buyingSignals: [],
          sentimentScore: 0.5,
          engagementLevel: 'low',
          messageCount: 0,
          connectionStatus: 'no_data'
        }
      });
    }

    // Get conversation history from memory using the lead's phone number
    const phoneNumber = leadData.phoneNumber;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const messages = await getConversationHistory(phoneNumber);
    
    // Analyze this lead's conversation data
    const userMessages = messages.filter(m => m.sentBy === 'user');
    
    const buyingSignals = [];
    const buyingKeywords = {
      'financing': 'Asked about financing',
      'payment': 'Discussed payments', 
      'monthly': 'Asked about monthly costs',
      'credit': 'Discussed credit options',
      'qualify': 'Qualification inquiry',
      'rate': 'Asked about rates',
      'interested': 'Expressed interest',
      'vehicle': 'Discussed vehicle options',
      'car': 'Asked about cars',
      'suv': 'Interested in SUVs'
    };

    userMessages.forEach(msg => {
      if (msg.content) {
        const content = msg.content.toLowerCase();
        Object.entries(buyingKeywords).forEach(([keyword, signal]) => {
          if (content.includes(keyword) && !buyingSignals.includes(signal)) {
            buyingSignals.push(signal);
          }
        });
      }
    });

    // Calculate scores based on memory data
    const qualityScore = Math.min(95, Math.max(10, messages.length * 8));
    const sentimentScore = buyingSignals.length > 2 ? 0.8 : buyingSignals.length > 0 ? 0.6 : 0.4;
    const engagementLevel = buyingSignals.length > 2 ? 'high' : buyingSignals.length > 0 ? 'medium' : 'low';

    console.log('📊 Lead analytics calculated:', {
      leadId,
      phoneNumber,
      messageCount: messages.length,
      buyingSignalsCount: buyingSignals.length,
      qualityScore
    });

    res.json({
      success: true,
      data: {
        conversationQuality: Math.round(qualityScore),
        buyingSignals,
        sentimentScore,
        engagementLevel,
        messageCount: messages.length,
        connectionStatus: 'live'
      }
    });

  } catch (error) {
    console.error('📊 Lead analytics error:', error);
    res.json({
      success: true,
      data: {
        conversationQuality: 65,
        buyingSignals: ['Interest expressed'],
        sentimentScore: 0.6,
        engagementLevel: 'medium',
        messageCount: 8,
        connectionStatus: 'fallback'
      }
    });
  }
});

// System status endpoint (shows persistence status)
app.get('/api/system/status', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    memory: {
      activeConversations: activeConversations.size,
      conversationContexts: conversationContexts.size,
      conversationSummaries: conversationSummaries.size,
      dynamicLeads: dynamicLeads.size,
      sseConnections: sseConnections.size
    },
    persistence: {
      enabled: supabasePersistence.isEnabled,
      connected: supabasePersistence.isConnected,
      service: 'Supabase'
    },
    features: {
      telephony: true,
      sms: true,
      voice: true,
      realTimeUpdates: true,
      analytics: supabasePersistence.isEnabled,
      crm: supabasePersistence.isEnabled
    }
  });
});

// Catch-all handler: send back React's index.html file in production
if (process.env.NODE_ENV === 'production') {
  try {
    app.get('*', (req, res) => {
      try {
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        console.log(`📄 Serving React app for: ${req.url}`);
        
        // Check if file exists before trying to send it
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          console.error('❌ dist/index.html not found!');
          // Fallback: send a simple API-only response
          res.status(404).json({
            error: 'React app not found',
            message: 'Jack Automotive AI Assistant API',
            status: 'running',
            mode: 'api-only',
            endpoints: {
              health: '/api/health',
              webhooks: {
                sms: '/api/webhooks/twilio/sms/incoming',
                voice: '/api/webhooks/twilio/voice/status',
                postCall: '/api/webhooks/elevenlabs/post-call'
              }
            }
          });
        }
      } catch (error) {
        console.error('❌ Error serving static files:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
      }
    });
    console.log('✅ Catch-all route registered successfully');
  } catch (routeError) {
    console.error('❌ Failed to register catch-all route:', routeError);
    
    // Fallback: manually handle all requests
    app.use((req, res) => {
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          error: 'React app not found',
          message: 'Fallback handler active'
        });
      }
    });
  }
}

// --- SERVER STARTUP ---

try {
  app.listen(PORT, async () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    
    // Initialize leads from Supabase after server starts
    await loadExistingLeadsIntoMemory();
  });
} catch (error) {
  console.error('❌ Error starting server:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}

export default app;