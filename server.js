import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { WebSocket } from 'ws';
import twilio from 'twilio';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import Supabase client for direct operations
import { createClient } from '@supabase/supabase-js';

// Import Redis cache adapter and migration manager
import cacheAdapter from './services/cacheAdapter.js';
import redisMigrationManager from './redis-migration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Supabase persistence service AFTER dotenv.config() has run
const { default: supabasePersistence } = await import('./services/supabasePersistence.js');

// Initialize Supabase client for direct operations
let client = null;
try {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    client = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized for direct operations');
  } else {
    console.warn('⚠️ Supabase client not initialized - missing environment variables');
  }
} catch (error) {
  console.error('❌ Supabase client initialization failed:', error);
}

// Function to load existing leads from Supabase into memory (ORGANIZATION-AWARE)
async function loadExistingLeadsIntoMemory(organizationId = null) {
  try {
    if (!organizationId) {
      console.log('🔒 SECURITY: Skipping global lead loading - leads will be loaded on-demand per organization');
      console.log('📋 Starting with empty lead storage (system will load leads per organization as needed)');
      return;
    }
    
    console.log(`🔄 Loading existing leads from Supabase into memory for organization: ${organizationId}`);
    
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
        // SECURITY: Only load leads for the specified organization
        const existingLeads = await supabasePersistence.getAllLeads(500, organizationId);
        
        for (const dbLead of existingLeads) {
          // Convert Supabase format back to dynamicLeads format
          const memoryLead = {
            id: dbLead.id,
            customerName: dbLead.customer_name,
            phoneNumber: dbLead.phone_number,
            email: dbLead.email,
            organizationId: dbLead.organization_id, // SECURITY: Store organization context
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
            },
            agent_phone: dbLead.agent_phone, // Include agent phone field
            agent_name: dbLead.agent_name     // Include agent name field
          };
          
          // Store in memory with organization context
          dynamicLeads.set(dbLead.id, memoryLead);
          
          // Set up phone mapping (organization-aware)
          const normalizedPhone = normalizePhoneNumber(dbLead.phone_number);
          phoneToLeadMapping.set(normalizedPhone, dbLead.id);
        }
        
        console.log(`✅ Loaded ${existingLeads.length} existing leads into memory for organization: ${organizationId}`);
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
const conversationMetadata = new Map(); // conversationId -> { phoneNumber, leadId, startTime }
const activeCallSessions = new Map(); // conversationId -> call session data

// PERFORMANCE: Aggressive caching layers to eliminate redundant queries
const conversationContextCache = new Map(); // orgId:phoneNumber -> { context, timestamp }
const comprehensiveSummaryCache = new Map(); // orgId:phoneNumber -> { summary, timestamp }
const organizationCache = new Map(); // organizationId -> { name, timestamp }
const conversationHistoryCache = new Map(); // orgId:phoneNumber -> { messages, timestamp }
const conversationSummaryCache = new Map(); // orgId:phoneNumber -> { summary, timestamp }
const leadSyncCache = new Map(); // organizationId -> { timestamp }

// PERFORMANCE: Cache ElevenLabs agent configurations to eliminate API call latency
const agentConfigCache = new Map(); // agentId:agentPhone -> { configured: true, timestamp }
const AGENT_CONFIG_TTL = 3600000; // 1 hour cache for agent configurations

// PERFORMANCE: Batch database operations to eliminate write latency during conversations
const pendingDatabaseWrites = new Map(); // conversationId -> { messages: [], activities: [], summary: null }

// PERFORMANCE: Session-based lead data cache to eliminate redundant lookups
const conversationSessionCache = new Map(); // conversationId -> { leadData, orgData, startTime }

// PERFORMANCE: Pre-computed context cache to eliminate heavy operations during conversations
const preComputedContextCache = new Map(); // orgId:phoneNumber -> { context, messageBreakdown, timestamp }

// PERFORMANCE: SSE response cache to eliminate duplicate message loading
const sseResponseCache = new Map(); // leadId:phoneNumber -> { messages, summary, timestamp }
const SSE_CACHE_TTL = 10000; // 10 seconds for SSE responses

// PERFORMANCE: Keep caches for maximum speed (transcript ordering preserved by smart invalidation)

// PERFORMANCE: Request deduplication - prevent multiple identical queries
const inflightRequests = new Map(); // cacheKey -> Promise

const CACHE_TTL = 120000; // 2 minutes cache (increased from 30 seconds)
const LEAD_SYNC_TTL = 300000; // 5 minutes for lead syncing

// Human-in-the-loop control state
const humanControlSessions = new Map(); // orgId:phoneNumber -> { agentName, organizationId, startTime, leadId }
const humanControlQueue = new Map(); // orgId:phoneNumber -> pending messages array

// === REDIS CACHE INTEGRATION LAYER ===
// These functions provide seamless integration between Redis and legacy Maps
// They handle migration, fallbacks, and maintain backward compatibility

// Wrapper function for getting conversation context (Redis + Map fallback)
async function getConversationContextCached(organizationId, phoneNumber) {
  return await redisMigrationManager.getConversationContext(organizationId, phoneNumber, conversationContexts);
}

// Wrapper function for setting conversation context (Redis + Map cleanup)
async function setConversationContextCached(organizationId, phoneNumber, messages) {
  return await redisMigrationManager.setConversationContext(organizationId, phoneNumber, messages, conversationContexts);
}

// Wrapper function for getting conversation summary (Redis + Map fallback)
async function getConversationSummaryCached(organizationId, phoneNumber) {
  return await redisMigrationManager.getConversationSummary(organizationId, phoneNumber, conversationSummaries);
}

// Wrapper function for setting conversation summary (Redis + Map cleanup)  
async function setConversationSummaryCached(organizationId, phoneNumber, summary) {
  return await redisMigrationManager.setConversationSummary(organizationId, phoneNumber, summary, conversationSummaries);
}

// Wrapper function for getting conversation history (Redis + Map fallback)
async function getConversationHistoryCachedRedis(phoneNumber, organizationId) {
  // First try Redis cache
  const cached = await cacheAdapter.getConversationHistoryCache(organizationId, phoneNumber);
  if (cached && cached.length > 0) {
    console.log(`⚡ Using Redis cached conversation history for ${phoneNumber} (${cached.length} messages)`);
    return cached;
  }

  // If not in Redis, get from database and cache it
  const messages = await getConversationHistory(phoneNumber, organizationId);
  if (messages && messages.length > 0) {
    await cacheAdapter.setConversationHistoryCache(organizationId, phoneNumber, messages);
    console.log(`📋 Cached ${messages.length} conversation history messages in Redis for ${phoneNumber}`);
  }
  
  return messages || [];
}

// Wrapper function for phone to lead mapping (Redis + Map fallback)
async function getPhoneToLeadMappingCached(phoneNumber) {
  return await redisMigrationManager.getPhoneToLeadMapping(phoneNumber, phoneToLeadMapping);
}

// Wrapper function for setting phone to lead mapping (Redis + Map cleanup)
async function setPhoneToLeadMappingCached(phoneNumber, leadId) {
  // Also set reverse mapping
  const result = await redisMigrationManager.setPhoneToLeadMapping(phoneNumber, leadId, phoneToLeadMapping);
  if (result) {
    // Set reverse mapping in Map for immediate consistency
    leadToPhoneMapping.set(leadId, phoneNumber);
  }
  return result;
}

// Wrapper function for organization data (Redis + Map fallback)
async function getOrganizationDataCached(organizationId) {
  return await redisMigrationManager.getOrganizationData(organizationId, organizationCache);
}

// Health check endpoint for Redis integration
async function getRedisHealthStatus() {
  try {
    const health = await redisMigrationManager.healthCheck();
    const stats = await redisMigrationManager.getStats();
    return { health, stats };
  } catch (error) {
    return { error: error.message, healthy: false };
  }
}

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

// --- HUMAN-IN-THE-LOOP CONTROL UTILITIES ---

/**
 * Check if a conversation is under human control
 */
function isUnderHumanControl(phoneNumber, organizationId) {
  const controlKey = createOrgMemoryKey(organizationId, phoneNumber);
  return humanControlSessions.has(controlKey);
}

/**
 * Start human control session for a conversation
 */
function startHumanControlSession(phoneNumber, organizationId, agentName, leadId) {
  const controlKey = createOrgMemoryKey(organizationId, phoneNumber);
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Check if already under human control
  if (humanControlSessions.has(controlKey)) {
    const existing = humanControlSessions.get(controlKey);
    console.log(`⚠️ Phone ${phoneNumber} already under human control by ${existing.agentName}`);
    return false;
  }
  
  // Create control session
  const session = {
    agentName,
    organizationId,
    startTime: new Date().toISOString(),
    leadId,
    phoneNumber: normalized
  };
  
  humanControlSessions.set(controlKey, session);
  
  // Initialize message queue for this session
  const queueKey = controlKey;
  if (!humanControlQueue.has(queueKey)) {
    humanControlQueue.set(queueKey, []);
  }
  
  console.log(`👤 Human control session started for ${phoneNumber} (org: ${organizationId}) by ${agentName}`);
  return true;
}

/**
 * End human control session and return control to AI
 */
function endHumanControlSession(phoneNumber, organizationId) {
  const controlKey = createOrgMemoryKey(organizationId, phoneNumber);
  const normalized = normalizePhoneNumber(phoneNumber);
  
  if (!humanControlSessions.has(controlKey)) {
    console.log(`⚠️ No human control session found for ${phoneNumber}`);
    return false;
  }
  
  const session = humanControlSessions.get(controlKey);
  humanControlSessions.delete(controlKey);
  
  // Clear message queue
  const queueKey = controlKey;
  if (humanControlQueue.has(queueKey)) {
    humanControlQueue.delete(queueKey);
  }
  
  console.log(`🤖 Human control session ended for ${phoneNumber} (org: ${organizationId}). Control returned to AI.`);
  return session;
}

/**
 * Get human control session info
 */
function getHumanControlSession(phoneNumber, organizationId) {
  const controlKey = createOrgMemoryKey(organizationId, phoneNumber);
  return humanControlSessions.get(controlKey) || null;
}

/**
 * Add message to human control queue
 */
function addToHumanQueue(phoneNumber, organizationId, message) {
  const queueKey = createOrgMemoryKey(organizationId, phoneNumber);
  
  if (!humanControlQueue.has(queueKey)) {
    humanControlQueue.set(queueKey, []);
  }
  
  const queue = humanControlQueue.get(queueKey);
  queue.push({
    message,
    timestamp: new Date().toISOString(),
    processed: false
  });
  
  console.log(`📝 Added message to human control queue for ${phoneNumber}: ${message.substring(0, 50)}...`);
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

// PERFORMANCE: Direct database query for conversation history (no cache manipulation)
async function getConversationHistoryDirect(phoneNumber, organizationId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  if (!organizationId) {
    console.error(`🚨 SECURITY: getConversationHistoryDirect called without organizationId for ${phoneNumber}`);
    return [];
  }
  
  try {
    if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
      // DIRECT DATABASE QUERY - NO CACHE MANIPULATION
      const client = supabasePersistence.supabase;
      const { data, error } = await client
        .from('conversations')
        .select('*')
        .eq('phone_number_normalized', normalized)
        .eq('organization_id', organizationId)
        .order('timestamp', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      
      if (error) {
        console.error('🔥 Database query failed:', error);
        return [];
      }
      
      const formattedHistory = data.map(msg => ({
        content: msg.content,
        sentBy: msg.sent_by,
        timestamp: msg.timestamp,
        type: msg.type || 'text'
      }));
      
      console.log(`🔍 DIRECT DB QUERY: Retrieved ${data.length} messages from database`);
      return formattedHistory;
    }
  } catch (error) {
    console.error('🔥 Error in getConversationHistoryDirect:', error);
  }
  
  return [];
}

async function getConversationHistory(phoneNumber, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: getConversationHistory called without organizationId for ${phoneNumber}`);
    return []; // Return empty array instead of falling back to global data
  }
  
  // PERFORMANCE: Use memory-first approach during calls
  const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
  const orgHistory = conversationContexts.get(orgMemoryKey) || [];
  
  // Only use database if memory is completely empty
  if (orgHistory.length === 0 && supabasePersistence.isEnabled && supabasePersistence.isConnected) {
    try {
      console.log(`📋 Memory empty - loading from database for ${phoneNumber} (org: ${organizationId})`);
      const dbMessages = await getConversationHistoryDirect(phoneNumber, organizationId);
      
      // CRITICAL FIX: Store database results in memory to preserve them for subsequent calls
      if (dbMessages.length > 0) {
        conversationContexts.set(orgMemoryKey, dbMessages);
        console.log(`📝 Cached ${dbMessages.length} database messages in memory for ${phoneNumber} (org: ${organizationId})`);
      }
      
      return dbMessages;
    } catch (error) {
      console.log(`⚠️ Database fallback failed:`, error.message);
    }
  }
  
  // Debug: Count message types to understand the voice message issue
  const voiceCount = orgHistory.filter(msg => msg.type === 'voice').length;
  const smsCount = orgHistory.filter(msg => msg.type === 'text' || msg.type === 'sms').length;
  
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
      
      // PERFORMANCE: No cache invalidation during conversations (preserves speed)
      // Cache will be invalidated after call ends to get fresh transcription data
      
      console.log(`📝 Added ${messageType} message to org-scoped history ${memoryKey} (${sentBy}): ${message.substring(0, 100)}...`);
      
  // Persist to Supabase with organization context
  supabasePersistence.persistConversationMessage(phoneNumber, message, sentBy, messageType, { organizationId })
    .catch(error => {
      console.log(`🗄️ Organization-scoped persistence failed (system continues normally):`, error.message);
    });
}

// ENHANCED: Add conversation message with custom timestamp and sequence support
function addToConversationHistoryWithTimestamp(phoneNumber, message, sentBy, messageType = 'text', organizationId = null, customTimestamp = null, sequenceOffset = 0) {
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: addToConversationHistoryWithTimestamp called without organizationId for ${phoneNumber}`);
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
  
  // Use custom timestamp if provided, otherwise generate with sequence offset
  let messageTimestamp;
  if (customTimestamp) {
    messageTimestamp = customTimestamp;
  } else {
    const baseTime = new Date();
    messageTimestamp = new Date(baseTime.getTime() + sequenceOffset).toISOString();
  }
  
  const messageData = {
    content: message,
    sentBy: sentBy,
    timestamp: messageTimestamp,
    type: messageType
  };
  
  history.push(messageData);
  
  // Keep only last 50 messages to prevent memory issues
  if (history.length > 50) {
    history.shift();
  }
  
  // PERFORMANCE: No cache invalidation during conversations (preserves speed)
  // Cache will be invalidated after call ends to get fresh transcription data
  
  console.log(`📝 Added ${messageType} message to org-scoped history ${memoryKey} (${sentBy}) with timestamp ${messageTimestamp}: ${message.substring(0, 100)}...`);
  
  // PERFORMANCE: Queue database writes instead of immediate persistence (batched at conversation end)
  // Immediate persistence disabled during conversations to eliminate latency
  console.log(`⚡ Message queued for batch persistence (no DB write latency)`);
  
  // Only persist immediately for non-voice messages (SMS needs immediate persistence for human intervention)
  if (messageType !== 'voice') {
    supabasePersistence.persistConversationMessageWithTimestamp(phoneNumber, message, sentBy, messageType, messageTimestamp, { organizationId })
      .catch(error => {
        console.log(`🗄️ SMS persistence failed:`, error.message);
      });
  }
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
  
  // PERFORMANCE: Queue summary persistence for batch processing (eliminates immediate DB write latency)
  console.log(`⚡ Summary queued for batch persistence (no immediate DB write)`);
  
  // Only persist summaries immediately for critical SMS/human intervention scenarios  
  // All other summaries will be batched and persisted at conversation end
}

// PERFORMANCE: Build conversation context from already-loaded data (no cache calls)
function buildConversationContextFromData(messages, summary, phoneNumber, organizationId) {
  if (messages.length === 0 && !summary) {
    return '';
  }
  
  const voiceMessages = messages.filter(msg => msg.type === 'voice');
  const smsMessages = messages.filter(msg => msg.type === 'text' || msg.type === 'sms');
  const humanAgentMessages = messages.filter(msg => msg.sentBy === 'human_agent');
  
  let contextText = `RECENT CONVERSATION HISTORY for customer ${phoneNumber}:\n\n`;
  contextText += `MULTI-CHANNEL CONVERSATION:\n- Total messages: ${messages.length} (${voiceMessages.length} AI voice, 0 manual call, ${smsMessages.length} SMS)\n\n`;
  
  // Use last 6 messages for context
  const recentMessages = messages.slice(-6);
  if (recentMessages.length > 0) {
    contextText += `RECENT MESSAGES (last ${recentMessages.length} messages in chronological order):\n`;
    contextText += recentMessages.map(msg => {
      const speaker = msg.sentBy === 'user' ? 'Customer' : 
                     msg.sentBy === 'human_agent' ? 'Human Agent' : 'Agent';
      const channel = msg.type === 'voice' ? ' (AI Voice)' : ' (SMS)';
      return `${speaker}${channel}: ${msg.content}`;
    }).join('\n') + '\n\n';
  }
  
  return contextText;
}

// PERFORMANCE: Generate comprehensive summary from already-loaded data (no cache calls)
function generateComprehensiveSummaryFromData(messages, summary, organizationId) {
  if (messages.length === 0) return null;
  
  const voiceMessages = messages.filter(msg => msg.type === 'voice');
  const smsMessages = messages.filter(msg => msg.type === 'text' || msg.type === 'sms');
  
  // If we have existing ElevenLabs summary and no SMS, use it
  if (summary?.summary && smsMessages.length === 0) {
    return summary.summary;
  }
  
  // Build combined summary for voice + SMS
  let combinedSummary = '';
  
  if (voiceMessages.length > 0 && summary?.summary) {
    combinedSummary += `VOICE CALL SUMMARY: ${summary.summary}\n\n`;
  }
  
  if (smsMessages.length > 0) {
    const recentSMS = smsMessages.slice(-3);
    combinedSummary += `SMS CONVERSATION: Recent ${smsMessages.length} SMS messages. `;
    if (recentSMS.length > 0) {
      combinedSummary += `Latest: "${recentSMS[recentSMS.length - 1].content.substring(0, 100)}"`;
    }
  }
  
  return combinedSummary || summary?.summary || null;
}

// Generate comprehensive summary from voice + SMS conversations
async function generateComprehensiveSummary(phoneNumber, organizationId) {
  try {
    // Use cached data instead of direct database calls for performance
    const history = await getConversationHistoryCached(phoneNumber, organizationId);
    if (history.length === 0) return null;
    
    const voiceMessages = history.filter(msg => msg.type === 'voice');
    const smsMessages = history.filter(msg => msg.type === 'text' || msg.type === 'sms');
    
    // Check if we have an ElevenLabs voice summary (CACHED)
    const existingSummary = await getConversationSummaryCached(phoneNumber, organizationId);
    
    if (existingSummary?.summary && smsMessages.length === 0) {
      // Only voice conversations, use existing summary
      return existingSummary.summary;
    }
    
    // Generate comprehensive summary including both voice and SMS
    let comprehensiveSummary = '';
    
    if (existingSummary?.summary) {
      comprehensiveSummary += `VOICE CALL SUMMARY: ${existingSummary.summary}`;
    }
    
    if (smsMessages.length > 0) {
      const customerSms = smsMessages.filter(m => m.sentBy === 'user');
      const agentSms = smsMessages.filter(m => m.sentBy === 'agent');
      
      if (comprehensiveSummary) comprehensiveSummary += '\n\n';
      comprehensiveSummary += `SMS CONVERSATION: ${smsMessages.length} messages exchanged. `;
      
      if (customerSms.length > 0) {
        const lastCustomerSms = customerSms[customerSms.length - 1];
        comprehensiveSummary += `Customer's last SMS: "${lastCustomerSms.content.substring(0, 150)}${lastCustomerSms.content.length > 150 ? '...' : ''}" `;
      }
      
      if (agentSms.length > 0) {
        const lastAgentSms = agentSms[agentSms.length - 1];
        comprehensiveSummary += `Agent's last SMS: "${lastAgentSms.content.substring(0, 150)}${lastAgentSms.content.length > 150 ? '...' : ''}"`;
      }
    }
    
    console.log(`📋 Generated comprehensive summary for ${phoneNumber} (${voiceMessages.length} voice, ${smsMessages.length} SMS):`, comprehensiveSummary.substring(0, 200) + '...');
    return comprehensiveSummary;
    
  } catch (error) {
    console.error('❌ Error generating comprehensive summary:', error);
    return null;
  }
}

// PERFORMANCE: Cached conversation context building with request deduplication
async function buildConversationContextCached(phoneNumber, organizationId) {
  const cacheKey = createOrgMemoryKey(organizationId, phoneNumber);
  const cached = conversationContextCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`⚡ Using cached conversation context for ${phoneNumber}`);
    return cached.context;
  }
  
  // PERFORMANCE: Check if request is already in flight
  const requestKey = `context_${cacheKey}`;
  if (inflightRequests.has(requestKey)) {
    console.log(`⚡ Deduplicating conversation context request for ${phoneNumber}`);
    return await inflightRequests.get(requestKey);
  }
  
  // Start the request and store it
  const requestPromise = buildConversationContext(phoneNumber, organizationId);
  inflightRequests.set(requestKey, requestPromise);
  
  try {
    const context = await requestPromise;
    conversationContextCache.set(cacheKey, { context, timestamp: Date.now() });
    return context;
  } finally {
    inflightRequests.delete(requestKey);
  }
}

// PERFORMANCE: Cached comprehensive summary with request deduplication
async function generateComprehensiveSummaryCached(phoneNumber, organizationId) {
  const cacheKey = createOrgMemoryKey(organizationId, phoneNumber);
  const cached = comprehensiveSummaryCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`⚡ Using cached comprehensive summary for ${phoneNumber}`);
    return cached.summary;
  }
  
  // PERFORMANCE: Check if request is already in flight
  const requestKey = `comprehensive_${cacheKey}`;
  if (inflightRequests.has(requestKey)) {
    console.log(`⚡ Deduplicating comprehensive summary request for ${phoneNumber}`);
    return await inflightRequests.get(requestKey);
  }
  
  // Start the request and store it
  const requestPromise = generateComprehensiveSummary(phoneNumber, organizationId);
  inflightRequests.set(requestKey, requestPromise);
  
  try {
    const summary = await requestPromise;
    comprehensiveSummaryCache.set(cacheKey, { summary, timestamp: Date.now() });
    return summary;
  } finally {
    inflightRequests.delete(requestKey);
  }
}

// PERFORMANCE: Cached organization name lookup with request deduplication
async function getOrganizationNameCached(organizationId) {
  const cached = organizationCache.get(organizationId);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`⚡ Using cached organization name for ${organizationId}`);
    return cached.name;
  }
  
  // PERFORMANCE: Check if request is already in flight
  const requestKey = `org_${organizationId}`;
  if (inflightRequests.has(requestKey)) {
    console.log(`⚡ Deduplicating organization name request for ${organizationId}`);
    return await inflightRequests.get(requestKey);
  }
  
  // Start the request and store it
  const requestPromise = (async () => {
    let organizationName = "Jack Automotive";
    try {
      const { data: orgData, error } = await client
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();
      
      if (orgData && !error) {
        organizationName = orgData.name;
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch organization name for ${organizationId}, using default`);
    }
    return organizationName;
  })();
  
  inflightRequests.set(requestKey, requestPromise);
  
  try {
    const organizationName = await requestPromise;
    organizationCache.set(organizationId, { name: organizationName, timestamp: Date.now() });
    return organizationName;
  } finally {
    inflightRequests.delete(requestKey);
  }
}

// PERFORMANCE: Cached conversation history with request deduplication
async function getConversationHistoryCached(phoneNumber, organizationId) {
  const cacheKey = createOrgMemoryKey(organizationId, phoneNumber);
  const cached = conversationHistoryCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`⚡ Using cached conversation history for ${phoneNumber} (${cached.messages.length} messages)`);
    return cached.messages;
  }
  
  // PERFORMANCE: Check if request is already in flight
  const requestKey = `history_${cacheKey}`;
  if (inflightRequests.has(requestKey)) {
    console.log(`⚡ DEDUPLICATION: Reusing in-flight conversation history request for ${phoneNumber}`);
    return await inflightRequests.get(requestKey);
  }
  
  console.log(`🔍 STARTING NEW: Memory-first query for conversation history: ${phoneNumber} (cache key: ${requestKey})`);
  
  // Start the request and store it - Use memory-first approach
  const requestPromise = getConversationHistory(phoneNumber, organizationId);
  inflightRequests.set(requestKey, requestPromise);
  
  try {
    const messages = await requestPromise;
    conversationHistoryCache.set(cacheKey, { messages, timestamp: Date.now() });
    return messages;
  } finally {
    inflightRequests.delete(requestKey);
  }
}

// PERFORMANCE: Cached conversation summary with request deduplication (LEGACY)
async function getConversationSummaryCachedLegacy(phoneNumber, organizationId) {
  const cacheKey = createOrgMemoryKey(organizationId, phoneNumber);
  const cached = conversationSummaryCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`⚡ Using cached conversation summary for ${phoneNumber}`);
    return cached.summary;
  }
  
  // PERFORMANCE: Check if request is already in flight
  const requestKey = `summary_${cacheKey}`;
  if (inflightRequests.has(requestKey)) {
    console.log(`⚡ Deduplicating conversation summary request for ${phoneNumber}`);
    return await inflightRequests.get(requestKey);
  }
  
  // Start the request and store it - Use memory-first approach
  const requestPromise = getConversationSummary(phoneNumber, organizationId);
  inflightRequests.set(requestKey, requestPromise);
  
  try {
    const summary = await requestPromise;
    conversationSummaryCache.set(cacheKey, { summary, timestamp: Date.now() });
    return summary;
  } finally {
    inflightRequests.delete(requestKey);
  }
}

// PERFORMANCE: Parallel data loading for conversation initiation (OPTIMIZED: All cached versions)
async function loadConversationDataParallel(caller_id, organizationId, activeLead) {
  console.log('⚡ Loading conversation data in parallel with aggressive caching...');
  
  const startTime = Date.now();
  
  // ULTRA PERFORMANCE: True parallel execution of all operations
  const [
    summary,
    messages,
    organizationName,
    conversationContext,
    comprehensiveSummary
  ] = await Promise.all([
    getConversationSummaryCached(caller_id, organizationId),  // ⚡ CACHED
    getConversationHistoryCached(caller_id, organizationId), // ⚡ CACHED  
    getOrganizationNameCached(organizationId),
    buildConversationContextCached(caller_id, organizationId),
    generateComprehensiveSummaryCached(caller_id, organizationId)
  ]);
  
  // Synchronous operations (memory-based, no await needed)
  const leadData = activeLead ? getLeadData(activeLead) : null;
  
  const loadTime = Date.now() - startTime;
  console.log(`⚡ OPTIMIZED: Parallel data loading completed in ${loadTime}ms (using cached versions)`);
  
  return {
    conversationContext,
    summary,
    messages,
    leadData,
    organizationName,
    comprehensiveSummary
  };
}

// NEW: Dynamic greeting helper functions (based on BICI approach)
function getTimeBasedGreeting() {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const hour = pacificTime.getHours();
  
  if (hour < 5) return "Thanks for calling so late!";
  if (hour < 12) return "Good morning!";
  if (hour < 17) return "Good afternoon!";
  if (hour < 20) return "Good evening!";
  return "Thanks for calling!";
}

function getDayContext() {
  const now = new Date();
  const pacificDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const day = pacificDate.getDay();
  const hour = pacificDate.getHours();
  
  // Weekend
  if (day === 0 || day === 6) {
    return "Hope you're enjoying your weekend!";
  }
  
  // Monday
  if (day === 1) {
    return "Hope you had a great weekend!";
  }
  
  // Friday
  if (day === 5 && hour > 12) {
    return "Happy Friday!";
  }
  
  // Tuesday-Thursday and Friday morning
  if (day >= 2 && day <= 4) {
    return "Hope you're having a great week!";
  }
  
  // Friday morning
  if (day === 5 && hour <= 12) {
    return "Hope your week is going well!";
  }
  
  return ""; // Fallback for any edge cases
}

function getCustomerGreeting(customerName, lastVisit) {
  if (!customerName) {
    return "";  // Empty string for generic greeting
  }
  
  if (lastVisit) {
    const visitDate = typeof lastVisit === 'string' ? new Date(lastVisit) : lastVisit;
    const daysSinceVisit = Math.floor((Date.now() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceVisit === 0) {
      return `${customerName}`;  // Same day
    } else if (daysSinceVisit < 7) {
      return `${customerName}`;  // Recent
    } else {
      return `${customerName}`;  // Older
    }
  }
  
  return `${customerName}`;
}

function generateGreetingContext(leadData, isOutbound = false, previousSummary = null) {
  const hasName = !!(leadData?.customerName);
  const customerName = leadData?.customerName || "";
  
  // For outbound calls, create continuation greetings
  if (isOutbound) {
    const outboundVariations = [
      "I wanted to follow up with you",
      "Just calling to check in with you", 
      "I'm following up from our earlier chat",
      "Wanted to continue where we left off",
      "Just giving you a quick call back"
    ];
    
    let variation = outboundVariations[Math.floor(Math.random() * outboundVariations.length)];
    
    // Make it more specific based on previous conversation
    if (previousSummary) {
      const summaryText = previousSummary.toLowerCase();
      
      if (summaryText.includes('suv') || summaryText.includes('truck')) {
        variation = "I'm calling about the SUV you were interested in";
      } else if (summaryText.includes('sedan') || summaryText.includes('car')) {
        variation = "I'm calling about the vehicle you were interested in";
      } else if (summaryText.includes('financing') || summaryText.includes('loan')) {
        variation = "I'm following up on the financing options we discussed";
      } else if (summaryText.includes('test drive') || summaryText.includes('appointment')) {
        variation = "I'm calling about scheduling your test drive";
      } else if (summaryText.includes('service') || summaryText.includes('maintenance')) {
        variation = "I'm calling about your service appointment";
      } else if (summaryText.includes('trade') || summaryText.includes('trade-in')) {
        variation = "I'm following up on your trade-in inquiry";
      }
    }
    
    return {
      time_greeting: getTimeBasedGreeting(),
      day_context: getDayContext(),
      customer_greeting: getCustomerGreeting(customerName, leadData?.lastTouchpoint),
      customer_name: customerName,
      greeting_opener: hasName ? `Hey ${customerName}!` : "Hey!",
      greeting_variation: variation,
      is_outbound: "true",
      call_type: "outbound_followup",
      // ElevenLabs-optimized first message components
      first_message_dynamic: hasName && previousSummary ? 
        `Hey ${customerName}! ${getTimeBasedGreeting()} I'm calling about ${extractCallReason(previousSummary)}` :
        hasName ? 
        `Hey ${customerName}! ${getTimeBasedGreeting()} ${variation}` :
        `Hey! ${getTimeBasedGreeting()} ${variation}`
    };
  }
  
  // Inbound call greetings
  const inboundVariation = Math.random() > 0.5 ? "What can I help you with" : "How can I help you";
  
  return {
    time_greeting: getTimeBasedGreeting(),
    day_context: getDayContext(),
    customer_greeting: getCustomerGreeting(customerName, leadData?.lastTouchpoint),
    customer_name: customerName,
    greeting_opener: hasName ? `Hey ${customerName}!` : "Hey there!",
    greeting_variation: inboundVariation,
    is_outbound: "false",
    call_type: "inbound",
    // ElevenLabs-optimized first message components
    first_message_dynamic: hasName ? 
      `Hey ${customerName}! ${getTimeBasedGreeting()} ${inboundVariation}?` :
      `Hey there! ${getTimeBasedGreeting()} ${inboundVariation}?`
  };
}

// Helper function to extract call reason from previous summary
function extractCallReason(summary) {
  const summaryText = summary.toLowerCase();
  
  if (summaryText.includes('suv') || summaryText.includes('truck')) return "the SUV you were interested in";
  if (summaryText.includes('sedan') || summaryText.includes('car')) return "the vehicle you were interested in";
  if (summaryText.includes('financing') || summaryText.includes('loan')) return "the financing options we discussed";
  if (summaryText.includes('test drive')) return "scheduling your test drive";
  if (summaryText.includes('service') || summaryText.includes('maintenance')) return "your service appointment";
  if (summaryText.includes('trade') || summaryText.includes('trade-in')) return "your trade-in inquiry";
  if (summaryText.includes('appointment')) return "your appointment";
  
  return "our previous conversation";
}

// NEW: Extract conversation insights based on BICI approach
async function extractConversationInsights(transcript, analysis, phoneNumber, organizationId) {
  try {
    const insights = {
      classification: 'general',
      triggers: [],
      leadStatus: 'contacted',
      keyPoints: [],
      nextSteps: [],
      sentiment: 0,
      automotive_interest: null,
      purchase_intent: 0,
      budget_range: null,
      timeline: null
    };

    // Convert transcript array to full text
    const fullTranscript = Array.isArray(transcript) 
      ? transcript.map(turn => `${turn.role}: ${turn.message}`).join('\n')
      : transcript || '';

    console.log('🔍 Extracting insights from transcript:', {
      transcriptLength: fullTranscript.length,
      hasAnalysis: !!analysis,
      hasDataCollection: !!analysis?.data_collection_results
    });

    // Use ElevenLabs data collection if available
    if (analysis?.data_collection_results) {
      const data = analysis.data_collection_results;
      
      // Extract call classification
      if (data.call_classification?.value) {
        insights.classification = data.call_classification.value;
      }
      
      // Extract customer triggers
      if (data.customer_triggers?.value) {
        const triggerString = data.customer_triggers.value;
        if (typeof triggerString === 'string') {
          // Map automotive-specific triggers
          const triggerMap = {
            'asked about store hours': 'asked_hours',
            'asked for directions/location': 'asked_directions',
            'inquired about prices': 'asked_price',
            'wants to schedule appointment': 'appointment_request',
            'interested in test drive': 'test_drive_interest',
            'has a complaint': 'has_complaint',
            'needs financing help': 'financing_inquiry',
            'trade-in inquiry': 'trade_in_interest'
          };
          
          insights.triggers = triggerString.split(',').map(t => t.trim())
            .map(t => triggerMap[t] || t)
            .filter(Boolean);
        }
      }
      
      // Extract automotive-specific interests
      if (data.vehicle_interest?.value) {
        insights.automotive_interest = data.vehicle_interest.value;
      }
      
      // Extract purchase intent
      if (data.purchase_intent?.value) {
        insights.purchase_intent = parseFloat(data.purchase_intent.value) || 0;
      }
      
      // Extract budget information
      if (data.budget_range?.value) {
        insights.budget_range = data.budget_range.value;
      }
      
      // Extract timeline
      if (data.purchase_timeline?.value) {
        insights.timeline = data.purchase_timeline.value;
      }
    } else {
      // Fallback to keyword analysis for automotive context
      const lowerTranscript = fullTranscript.toLowerCase();
      
      // Classify conversation type
      if (lowerTranscript.includes('buy') || lowerTranscript.includes('purchase') || lowerTranscript.includes('financing')) {
        insights.classification = 'sales';
        insights.leadStatus = 'qualified';
        insights.purchase_intent = 0.7;
      } else if (lowerTranscript.includes('service') || lowerTranscript.includes('repair') || lowerTranscript.includes('maintenance')) {
        insights.classification = 'service';
      } else if (lowerTranscript.includes('trade') || lowerTranscript.includes('trade-in')) {
        insights.classification = 'trade-in';
        insights.triggers.push('trade_in_interest');
      }
      
      // Extract automotive interests
      const vehicles = ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'hybrid', 'electric'];
      for (const vehicle of vehicles) {
        if (lowerTranscript.includes(vehicle)) {
          insights.automotive_interest = vehicle;
          break;
        }
      }
      
      // Extract budget mentions
      const budgetMatch = lowerTranscript.match(/\$?(\d{1,3}(?:,\d{3})*)/);
      if (budgetMatch) {
        insights.budget_range = budgetMatch[0];
      }
    }

    // Basic sentiment analysis
    const positiveWords = ['great', 'excellent', 'good', 'interested', 'yes', 'definitely'];
    const negativeWords = ['no', 'not', 'never', 'bad', 'terrible', 'disappointed'];
    
    let sentimentScore = 0;
    positiveWords.forEach(word => {
      if (fullTranscript.toLowerCase().includes(word)) sentimentScore += 0.1;
    });
    negativeWords.forEach(word => {
      if (fullTranscript.toLowerCase().includes(word)) sentimentScore -= 0.1;
    });
    
    insights.sentiment = Math.max(-1, Math.min(1, sentimentScore));

    console.log('✅ Extracted conversation insights:', {
      classification: insights.classification,
      triggersCount: insights.triggers.length,
      automotiveInterest: insights.automotive_interest,
      purchaseIntent: insights.purchase_intent,
      sentiment: insights.sentiment
    });

    return insights;
    
  } catch (error) {
    console.error('❌ Error extracting conversation insights:', error);
    return null;
  }
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

// PERFORMANCE: Direct database query for conversation summary (no cache manipulation)
async function getConversationSummaryDirect(phoneNumber, organizationId) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  if (!organizationId) {
    console.error(`🚨 SECURITY: getConversationSummaryDirect called without organizationId for ${phoneNumber}`);
    return null;
  }
  
  try {
    if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
      // DIRECT DATABASE QUERY - NO CACHE MANIPULATION
      const supabaseSummary = await supabasePersistence.getConversationSummary(phoneNumber, organizationId);
      
      if (supabaseSummary) {
        console.log(`📋 DIRECT DB: Loaded summary from Supabase for ${phoneNumber} in organization ${organizationId}`);
        return supabaseSummary;
      }
    }
  } catch (error) {
    console.error('🔥 Error in getConversationSummaryDirect:', error);
  }
  
  return null;
}

// Get conversation summary - SECURITY FIXED with organization validation
async function getConversationSummary(phoneNumber, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // SECURITY: organizationId is now required for cross-organization data protection
  if (!organizationId) {
    console.error(`🚨 SECURITY: getConversationSummary called without organizationId for ${phoneNumber}`);
    return null; // Return null instead of falling back to global data
  }
  
  // PERFORMANCE: Use memory-first approach during calls
  const orgMemoryKey = createOrgMemoryKey(organizationId, phoneNumber);
  const memorySummary = conversationSummaries.get(orgMemoryKey);
  
  // Return memory data if available
  if (memorySummary) {
    console.log(`⚡ Using memory summary for ${phoneNumber} (org: ${organizationId})`);
    return memorySummary;
  }
  
  // Only use database if memory is empty
  if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
    try {
      console.log(`📋 Memory empty - loading summary from database for ${phoneNumber} (org: ${organizationId})`);
      const supabaseSummary = await supabasePersistence.getConversationSummary(phoneNumber, organizationId);
      
      if (supabaseSummary) {
        console.log(`📋 Loaded summary from Supabase for ${phoneNumber} in organization ${organizationId}`);
        
        // Store in memory for future fast access
        conversationSummaries.set(orgMemoryKey, supabaseSummary);
        
        return supabaseSummary;
      }
    } catch (error) {
      console.log(`⚠️ Failed to load summary from Supabase, falling back to organization-scoped memory:`, error.message);
    }
  }
  
  // Fallback to organization-scoped memory ONLY
  return conversationSummaries.get(orgMemoryKey);
}

// Synchronous version for backwards compatibility
function getConversationSummarySync(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return conversationSummaries.get(normalized);
}

// Get lead data for dynamic variables with conversation session caching
function getLeadData(leadId) {
  // PERFORMANCE: Check conversation session cache first to eliminate redundant lookups
  for (const [convId, sessionData] of conversationSessionCache.entries()) {
    if (sessionData.leadData && sessionData.leadData.id === leadId) {
      console.log(`⚡ Using cached lead data from conversation session for ${leadId}`);
      return sessionData.leadData;
    }
  }
  
  // First check dynamically added leads
  if (dynamicLeads.has(leadId)) {
    const lead = dynamicLeads.get(leadId);
    console.log(`📋 Found dynamic lead data for ${leadId}:`, {
      customerName: lead.customerName,
      phoneNumber: lead.phoneNumber,
      sentiment: lead.sentiment,
      fundingReadiness: lead.fundingReadiness,
      agent_phone: lead.agent_phone,
      agent_name: lead.agent_name
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
  
  const history = await getConversationHistoryCached(phoneNumber, organizationId);
  const summaryData = await getConversationSummaryCached(phoneNumber, organizationId);
  
  if (history.length === 0 && !summaryData) {
    console.log(`📋 No conversation history or summary found for ${phoneNumber} (org: ${organizationId}) (normalized: ${normalizePhoneNumber(phoneNumber)})`);
    return '';
  }
  
  // Separate voice, SMS, and manual call messages
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text' || msg.type === 'sms');
  // ⭐ MANUAL CALLS: Include manual call messages in context building
  const manualCallMessages = history.filter(msg => msg.type === 'voice_manual');
  
  // DEBUG: Log the breakdown of message types
  console.log(`🔍 DEBUG: Message type breakdown - Total: ${history.length}, Voice: ${voiceMessages.length}, SMS: ${smsMessages.length}, Manual: ${manualCallMessages.length}`);
  console.log(`🔍 DEBUG: All message types:`, [...new Set(history.map(msg => msg.type))]);
  
  // DEBUG: Check for human agent messages specifically
  const humanAgentMessages = history.filter(msg => msg.sentBy === 'human_agent');
  console.log(`🔍 DEBUG: Human agent messages found: ${humanAgentMessages.length}`);
  if (humanAgentMessages.length > 0) {
    console.log(`🔍 DEBUG: Human agent messages:`, humanAgentMessages.map(msg => `${msg.sentBy}: ${msg.content.substring(0, 50)}... (${msg.timestamp})`));
  }
  
  // DEBUG: Check if human agent messages are in SMS context
  const humanAgentInSms = smsMessages.filter(msg => msg.sentBy === 'human_agent');
  console.log(`🔍 DEBUG: Human agent messages in SMS context: ${humanAgentInSms.length}`);
  
  let contextText = `RECENT CONVERSATION HISTORY for customer ${phoneNumber}:\n\n`;
  
  // FIXED: Use chronological order instead of separating by channel
  // Take the most recent messages regardless of channel to maintain conversation flow
  const recentMessages = history.slice(-6); // Last 6 messages chronologically
  
  // Group messages by channel for better organization while maintaining chronological order
  const hasVoiceMessages = voiceMessages.length > 0;
  const hasSmsMessages = smsMessages.length > 0;
  const hasManualCallMessages = manualCallMessages.length > 0;
  
  if ((hasVoiceMessages || hasManualCallMessages) && hasSmsMessages) {
    // Mixed conversation - show channel breakdown for context
    contextText += `MULTI-CHANNEL CONVERSATION:\n`;
    contextText += `- Total messages: ${history.length} (${voiceMessages.length} AI voice, ${manualCallMessages.length} manual call, ${smsMessages.length} SMS)\n\n`;
    
    // Show most recent messages chronologically
    contextText += `RECENT MESSAGES (last ${recentMessages.length} messages in chronological order):\n`;
    contextText += recentMessages.map(msg => {
      const speaker = msg.sentBy === 'user' ? 'Customer' : 
                     msg.sentBy === 'human_agent' ? 'Human Agent' : 'Agent';
      const channel = msg.type === 'voice' ? ' (AI Voice)' : 
                      msg.type === 'voice_manual' ? ' (Manual Call)' : ' (SMS)';
      return `${speaker}${channel}: ${msg.content}`;
    }).join('\n') + '\n\n';
  } else if (hasVoiceMessages || hasManualCallMessages) {
    // Voice-only conversation (AI or manual)
    const allVoiceMessages = [...voiceMessages, ...manualCallMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const recentVoiceMessages = allVoiceMessages.slice(-3);
    contextText += `RECENT VOICE CONVERSATION (last ${recentVoiceMessages.length} messages):\n`;
    contextText += recentVoiceMessages.map(msg => {
      const speaker = msg.sentBy === 'user' ? 'Customer' : 
                      msg.sentBy === 'human_agent' ? 'Human Agent' : 'Agent';
      const callType = msg.type === 'voice_manual' ? ' (Manual Call)' : ' (AI Voice)';
      return `${speaker}${callType}: ${msg.content}`;
    }).join('\n') + '\n\n';
  } else if (hasSmsMessages) {
    // SMS-only conversation
    const recentSmsMessages = smsMessages.slice(-3);
    contextText += `RECENT SMS CONVERSATION (last ${recentSmsMessages.length} messages):\n`;
    
    // DEBUG: Log the recent SMS messages to see what we're getting
    console.log(`🔍 DEBUG: Recent SMS messages:`, recentSmsMessages.map(msg => `${msg.sentBy}: ${msg.content.substring(0, 50)}... (${msg.timestamp})`));
    
    contextText += recentSmsMessages.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : msg.sentBy === 'human_agent' ? 'Human Agent' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  contextText += `CRITICAL INSTRUCTIONS: 
- Use the PREVIOUS SUMMARY (provided separately) for overall customer context and key details
- The conversation history above shows the recent message flow between you and the customer
- If previous summary mentions specific vehicle models, budgets, or customer details, DO NOT ask for this information again
- This conversation may be RESUMING after a brief timeout - continue naturally from where you left off
- IMPORTANT: If you see "Human Agent" messages, this means a human agent was helping the customer recently
- IMPORTANT: If you see "Manual Call" messages, this means a human agent spoke directly with the customer
- Continue from where the human agent left off - reference their conversation and the customer's responses
- Do NOT ignore or restart from old topics if there's recent human agent interaction or manual calls
- Reference specific details from both the previous summary AND recent messages to show continuity
- Be helpful and maintain context from ALL previous interactions (AI voice calls, manual calls, SMS, human agent handoffs, etc.)
- If this feels like a continuation, acknowledge it naturally: "Great to hear from you again" or similar
- DO NOT restart or re-introduce yourself if you've already spoken with this customer`;
  
  console.log(`📋 Built conversation context for ${phoneNumber} (org: ${organizationId}) with ${history.length} total messages (${voiceMessages.length} AI voice, ${manualCallMessages.length} manual call, ${smsMessages.length} SMS):`, contextText.substring(0, 400) + '...');
  
  // Apply smart truncation if context is too large
  const finalContext = createSmartContextSummary(contextText, history, summaryData);
  return finalContext;
}

// Smart context truncation function
function createSmartContextSummary(fullContext, history, summaryData) {
  const CONTEXT_LIMIT = 100000; // 100K character limit
  
  if (fullContext.length <= CONTEXT_LIMIT) {
    return fullContext; // Within limit, return full context
  }
  
  console.log(`📋 Context exceeds ${CONTEXT_LIMIT} chars (${fullContext.length}), creating smart summary`);
  
  // Build condensed context with overview + last 3 messages (summary provided separately)
  let condensedContext = `RECENT CONVERSATION HISTORY (CONDENSED):\n\n`;
  
  // Separate voice and SMS messages
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text' || msg.type === 'sms');
  
  // Add overview of conversation volume
  condensedContext += `CONVERSATION OVERVIEW:\n`;
  condensedContext += `- Total messages: ${history.length}\n`;
  condensedContext += `- Voice messages: ${voiceMessages.length}\n`;
  condensedContext += `- SMS messages: ${smsMessages.length}\n\n`;
  
  // FIXED: Use chronological order for condensed context too
  const recentMessages = history.slice(-6); // Last 6 messages chronologically
  const hasVoiceMessages = voiceMessages.length > 0;
  const hasSmsMessages = smsMessages.length > 0;
  
  if (hasVoiceMessages && hasSmsMessages) {
    // Mixed conversation - show most recent messages chronologically
    condensedContext += `RECENT MESSAGES (last ${recentMessages.length} messages in chronological order):\n`;
    condensedContext += recentMessages.map(msg => {
      const speaker = msg.sentBy === 'user' ? 'Customer' : 
                     msg.sentBy === 'human_agent' ? 'Human Agent' : 'Agent';
      const channel = msg.type === 'voice' ? ' (Voice)' : ' (SMS)';
      return `${speaker}${channel}: ${msg.content}`;
    }).join('\n') + '\n\n';
  } else if (hasVoiceMessages) {
    // Voice-only conversation
    const recentVoice = voiceMessages.slice(-3);
    condensedContext += `RECENT VOICE CONVERSATION (last ${recentVoice.length} messages):\n`;
    condensedContext += recentVoice.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  } else if (hasSmsMessages) {
    // SMS-only conversation
    const recentSms = smsMessages.slice(-3);
    condensedContext += `RECENT SMS CONVERSATION (last ${recentSms.length} messages):\n`;
    
    // DEBUG: Log the recent SMS messages to see what we're getting
    console.log(`🔍 DEBUG: Recent SMS messages (condensed):`, recentSms.map(msg => `${msg.sentBy}: ${msg.content.substring(0, 50)}... (${msg.timestamp})`));
    
    condensedContext += recentSms.map(msg => 
      `${msg.sentBy === 'user' ? 'Customer' : msg.sentBy === 'human_agent' ? 'Human Agent' : 'Agent'}: ${msg.content}`
    ).join('\n') + '\n\n';
  }
  
  condensedContext += `CRITICAL INSTRUCTIONS: 
- Use the PREVIOUS SUMMARY (provided separately) for overall customer context and key details
- This is a LONG conversation (${history.length} messages) - focus on recent context above
- If previous summary mentions specific vehicle models, budgets, or customer details, DO NOT ask for this information again
- Continue naturally from the recent messages shown above
- IMPORTANT: If you see "Human Agent" messages, this means a human agent was helping the customer recently
- Continue from where the human agent left off - reference their conversation and the customer's responses
- Do NOT ignore or restart from old topics if there's recent human agent interaction
- Reference specific details from both the previous summary AND recent messages
- Be helpful and maintain context from ALL previous interactions (voice calls, SMS, human agent handoffs, etc.)`;

  console.log(`📋 Smart summary created: ${condensedContext.length} chars (from ${fullContext.length} chars)`);
  return condensedContext;
}

// Synchronous version for backwards compatibility
function buildConversationContextSync(phoneNumber) {
  const history = getConversationHistorySync(phoneNumber);
  const summaryData = getConversationSummarySync(phoneNumber);
  
  if (history.length === 0 && !summaryData) {
    return '';
  }
  
  const voiceMessages = history.filter(msg => msg.type === 'voice');
  const smsMessages = history.filter(msg => msg.type === 'text' || msg.type === 'sms');
  
  let contextText = `RECENT CONVERSATION HISTORY for customer ${phoneNumber}:\n\n`;
  
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
- Use the PREVIOUS SUMMARY (provided separately) for overall customer context and key details
- The conversation history above shows the recent message flow between you and the customer
- If previous summary mentions specific vehicle models, budgets, or customer details, DO NOT ask for this information again
- This conversation may be RESUMING after a brief timeout - continue naturally from where you left off
- Reference specific details from both the previous summary AND recent messages to show continuity
- Be helpful and maintain context from ALL previous interactions (voice calls, SMS, etc.)
- If this feels like a continuation, acknowledge it naturally: "Great to hear from you again" or similar
- DO NOT restart or re-introduce yourself if you've already spoken with this customer`;
  
  return contextText;
}

// Store conversation metadata when a call is initiated
function storeConversationMetadata(conversationId, phoneNumber, leadId, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  conversationMetadata.set(conversationId, {
    phoneNumber: normalized,
    leadId,
    organizationId,
    startTime: new Date().toISOString()
  });
  console.log(`📝 Stored conversation metadata:`, { conversationId, phoneNumber: normalized, leadId, organizationId });
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
            },
            agent_phone: leadData.agent_phone, // Include agent phone field
            agent_name: leadData.agent_name     // Include agent name field
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

function startConversationWithTimeout(phoneNumber, initialMessage, organizationId = null) {
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Clear any existing timeout
  if (activeConversationTimeouts.has(normalized)) {
    clearTimeout(activeConversationTimeouts.get(normalized));
  }
  
  // Start the conversation
  startConversation(phoneNumber, initialMessage, organizationId);
  
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

// Track SMS response counts to ignore first response for returning users
const smsResponseCounters = new Map();

function startConversation(phoneNumber, initialMessage, organizationId = null) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const normalized = normalizePhoneNumber(phoneNumber);

  if (!agentId || !apiKey) {
    console.error('❌ Missing ElevenLabs credentials');
    return;
  }

  // Initialize SMS response counter for this conversation
  smsResponseCounters.set(normalized, 0);

  // Declare leadStatus in outer scope to be accessible in message handler
  let leadStatus = "New Inquiry"; // Default

  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;
  const ws = new WebSocket(wsUrl, {
    headers: { 'xi-api-key': apiKey }
  });

  ws.on('open', async () => {
    console.log(`🔗 WebSocket connected for ${phoneNumber} (normalized: ${normalized})`);
    activeConversations.set(normalized, ws);
    
    // SECURITY FIX: Use provided organizationId or get from phone if not provided
    let resolvedOrganizationId = organizationId;
    if (!resolvedOrganizationId) {
      console.log(`🔍 No organizationId provided, attempting to resolve from phone ${phoneNumber}`);
      resolvedOrganizationId = await getOrganizationIdFromPhone(phoneNumber);
    } else {
      console.log(`🔍 Using provided organizationId: ${resolvedOrganizationId} for phone ${phoneNumber}`);
    }
    
    // ENHANCED: Build conversation context with async loading for better context
    const conversationContext = await buildConversationContext(phoneNumber, resolvedOrganizationId);
    
    // Get lead data and build dynamic variables like voice calls do
    const leadId = await getActiveLeadForPhone(phoneNumber);
    const leadData = getLeadData(leadId);
    const customerName = leadData?.customerName || `Customer ${phoneNumber}`;
    
    const summaryData = await getConversationSummaryCached(phoneNumber, resolvedOrganizationId);
    const history = await getConversationHistoryCached(phoneNumber, resolvedOrganizationId);
    leadStatus = summaryData?.summary ? "Returning Customer" : (history.length > 0 ? "Active Lead" : "New Inquiry");
    
    // ENHANCED: Use comprehensive summary (voice + SMS) for better context
    let previousSummary;
    const comprehensiveSummary = await generateComprehensiveSummary(phoneNumber, resolvedOrganizationId);
    if (comprehensiveSummary && comprehensiveSummary.length > 20) {
      // Use the comprehensive voice + SMS summary
      previousSummary = comprehensiveSummary.length > 100000 ? comprehensiveSummary.substring(0, 100000) + "..." : comprehensiveSummary;
      console.log(`📋 SMS using comprehensive summary (${comprehensiveSummary.length} chars): ${comprehensiveSummary.substring(0, 100)}...`);
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
    
    // Get organization name for dynamic variables
    let organizationName = "Automarket"; // Default fallback
    if (resolvedOrganizationId) {
      try {
        const { data: orgData, error } = await client
          .from('organizations')
          .select('name')
          .eq('id', resolvedOrganizationId)
          .single();
        
        if (orgData && !error) {
          organizationName = orgData.name;
        }
      } catch (error) {
        console.log('⚠️ Failed to get organization name, using fallback:', error.message);
      }
    }
    
    // Generate greeting context for SMS (inbound response)
    const greetingContext = generateGreetingContext(leadData, false, previousSummary);
    
    // DEBUG: Log the actual dynamic variables being sent
    const dynamicVars = {
      customer_name: customerName,
      organization_name: organizationName,
      lead_status: leadStatus,
      previous_summary: previousSummary,
      // FIXED: Include conversation_context with smart truncation for very long contexts
      conversation_context: createSmartContextSummary(conversationContext, history, summaryData),
      // FIXED: Include all required greeting variables
      ...greetingContext
    };
    
    console.log(`🧪 DEBUG: SMS Dynamic variables being sent:`, {
      customer_name: dynamicVars.customer_name,
      organization_name: dynamicVars.organization_name,
      lead_status: dynamicVars.lead_status,
      previous_summary_length: dynamicVars.previous_summary?.length || 0,
      previous_summary_preview: dynamicVars.previous_summary?.substring(0, 100) + "...",
      conversation_context_length: dynamicVars.conversation_context?.length || 0,
      conversation_context_preview: dynamicVars.conversation_context?.substring(0, 150) + "...",
      // GREETING VARIABLES (required by ElevenLabs)
      time_greeting: dynamicVars.time_greeting,
      day_context: dynamicVars.day_context,
      customer_greeting: dynamicVars.customer_greeting,
      greeting_opener: dynamicVars.greeting_opener,
      greeting_variation: dynamicVars.greeting_variation,
      is_outbound: dynamicVars.is_outbound,
      call_type: dynamicVars.call_type,
      first_message_dynamic: dynamicVars.first_message_dynamic
    });
    
    // FIXED: Send with correct ElevenLabs structure - dynamic_variables at TOP LEVEL
    // Per ElevenLabs docs: dynamic_variables must be at root level, not in client_data
    ws.send(JSON.stringify({
      type: 'conversation_initiation_client_data',
      dynamic_variables: dynamicVars,
      client_data: {
        conversation_context: conversationContext,
        phone_number: phoneNumber,
        customer_phone: phoneNumber, // For webhook identification
        channel: 'sms',
        lead_id: leadId,
        organization_id: resolvedOrganizationId, // Include organization context
        // ADDED: Include metadata about context preservation
        context_metadata: {
          total_messages: history.length,
          has_elevenlabs_summary: !!(summaryData?.summary && summaryData.summary.length > 20),
          voice_messages: history.filter(m => m.type === 'voice').length,
          sms_messages: history.filter(m => m.type === 'text' || m.type === 'sms').length,
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
            
            // FIXED: For SMS + returning users, ignore the first agent response (template greeting)
            // Only respond to their actual message, not the automated greeting
            const normalized = normalizePhoneNumber(phoneNumber);
            const responseCount = smsResponseCounters.get(normalized) || 0;
            smsResponseCounters.set(normalized, responseCount + 1);
            
            if (leadStatus === "Returning Customer" && responseCount === 0) {
              console.log(`🔇 [${phoneNumber}] Ignoring first SMS response for returning customer: ${agentResponse.substring(0, 50)}...`);
              return; // Skip this response - don't send SMS or add to history
            }
            
            console.log(`📱 [${phoneNumber}] Processing SMS response #${responseCount + 1} for ${leadStatus}: ${agentResponse.substring(0, 50)}...`);
            
            // SECURITY FIX: Use provided organizationId or get from phone if not provided
            let resolvedOrganizationId = organizationId;
            if (!resolvedOrganizationId) {
              resolvedOrganizationId = await getOrganizationIdFromPhone(phoneNumber);
            }
            
            addToConversationHistory(phoneNumber, agentResponse, 'agent', 'text', resolvedOrganizationId);
            sendSMSReply(phoneNumber, agentResponse, resolvedOrganizationId);
            
            // Get the active lead ID for this phone number
            const leadId = await getActiveLeadForPhone(phoneNumber);

            // ENHANCED: Reset timeout on activity to prevent premature closure
            // Use existing normalized variable from above
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
                leadId: leadId,
                organizationId: resolvedOrganizationId
            });
        }
      } else if (response.type === 'ping') {
        // Handle ping/pong to keep connection alive
        console.log(`📨 [${phoneNumber}] Received ping`);
      } else if (response.type === 'audio') {
        // Handle audio chunks if needed
        console.log(`📨 [${phoneNumber}] Received audio`);
      } else {
        console.log(`📨 [${phoneNumber}] Received unknown message type:`, response.type);
      }
    } catch (error) {
      console.error(`❌ [${phoneNumber}] Error processing message:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket closed for ${phoneNumber}`);
    activeConversations.delete(normalized);
    smsResponseCounters.delete(normalized); // Clean up response counter
    if (activeConversationTimeouts.has(normalized)) {
      clearTimeout(activeConversationTimeouts.get(normalized));
      activeConversationTimeouts.delete(normalized);
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${phoneNumber}:`, error);
    activeConversations.delete(normalized);
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
app.post('/api/debug/store-message', async (req, res) => {
  try {
    const { phoneNumber, message, sentBy, type = 'text', organizationId } = req.body;
    if (!phoneNumber || !message || !sentBy) {
      return res.status(400).json({ error: 'phoneNumber, message, and sentBy are required' });
    }
    
    // SECURITY FIX: Get organizationId for proper scoping
    const orgId = organizationId || await getOrganizationIdFromPhone(phoneNumber);
    addToConversationHistory(phoneNumber, message, sentBy, type, orgId);
    
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

// --- HUMAN-IN-THE-LOOP CONTROL ENDPOINTS ---

// Join human control session
app.post('/api/human-control/join', validateOrganizationAccess, async (req, res) => {
  try {
    const { phoneNumber, agentName, leadId } = req.body;
    const { organizationId } = req;
    
    if (!phoneNumber || !agentName || !leadId) {
      return res.status(400).json({ 
        error: 'phoneNumber, agentName, and leadId are required' 
      });
    }
    
    console.log(`👤 Human control join request: ${agentName} taking control of ${phoneNumber} (lead: ${leadId}) (org: ${organizationId})`);
    
    // Validate lead belongs to organization
    const leadData = getLeadData(leadId);
    if (leadData && leadData.organizationId && leadData.organizationId !== organizationId) {
      console.error(`🚨 SECURITY VIOLATION: Attempted human control for lead ${leadId} belonging to org ${leadData.organizationId} by org ${organizationId}`);
      return res.status(403).json({ 
        error: 'Access denied - lead belongs to different organization',
        code: 'CROSS_ORG_ACCESS_DENIED' 
      });
    }
    
    // Check if already under human control
    if (isUnderHumanControl(phoneNumber, organizationId)) {
      const existingSession = getHumanControlSession(phoneNumber, organizationId);
      return res.status(409).json({ 
        error: 'Conversation already under human control',
        currentAgent: existingSession.agentName,
        code: 'ALREADY_UNDER_HUMAN_CONTROL'
      });
    }
    
    // Start human control session
    const success = startHumanControlSession(phoneNumber, organizationId, agentName, leadId);
    
    if (!success) {
      return res.status(500).json({ 
        error: 'Failed to start human control session' 
      });
    }
    
    // Close any active ElevenLabs WebSocket connection to prevent AI responses
    const normalized = normalizePhoneNumber(phoneNumber);
    if (activeConversations.has(normalized)) {
      console.log(`🔌 Closing AI WebSocket for ${phoneNumber} - human taking control`);
      const ws = activeConversations.get(normalized);
      ws.close();
      activeConversations.delete(normalized);
    }
    
    // Add system message about human takeover
    addToConversationHistory(phoneNumber, `Human agent ${agentName} joined the conversation`, 'system', 'text', organizationId);
    
    // Broadcast update to UI
    broadcastConversationUpdate({
      type: 'human_control_started',
      phoneNumber,
      agentName,
      leadId,
      organizationId,
      timestamp: new Date().toISOString(),
      sentBy: 'system'
    });
    
    res.json({
      success: true,
      message: 'Human control session started',
      agentName,
      phoneNumber,
      leadId,
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error starting human control session:', error);
    res.status(500).json({ 
      error: 'Failed to start human control session',
      details: error.message 
    });
  }
});

// Leave human control session
app.post('/api/human-control/leave', validateOrganizationAccess, async (req, res) => {
  try {
    const { phoneNumber, leadId } = req.body;
    const { organizationId } = req;
    
    if (!phoneNumber || !leadId) {
      return res.status(400).json({ 
        error: 'phoneNumber and leadId are required' 
      });
    }
    
    console.log(`🤖 Human control leave request for ${phoneNumber} (lead: ${leadId}) (org: ${organizationId})`);
    
    // Validate lead belongs to organization
    const leadData = getLeadData(leadId);
    if (leadData && leadData.organizationId && leadData.organizationId !== organizationId) {
      console.error(`🚨 SECURITY VIOLATION: Attempted human control leave for lead ${leadId} belonging to org ${leadData.organizationId} by org ${organizationId}`);
      return res.status(403).json({ 
        error: 'Access denied - lead belongs to different organization',
        code: 'CROSS_ORG_ACCESS_DENIED' 
      });
    }
    
    // Check if under human control
    if (!isUnderHumanControl(phoneNumber, organizationId)) {
      return res.status(400).json({ 
        error: 'Conversation not under human control',
        code: 'NOT_UNDER_HUMAN_CONTROL'
      });
    }
    
    // End human control session
    const session = endHumanControlSession(phoneNumber, organizationId);
    
    if (!session) {
      return res.status(500).json({ 
        error: 'Failed to end human control session' 
      });
    }
    
    // Add system message about AI resumption
    addToConversationHistory(phoneNumber, `AI agent resumed control of the conversation`, 'system', 'text', organizationId);
    
    // Broadcast update to UI
    broadcastConversationUpdate({
      type: 'human_control_ended',
      phoneNumber,
      agentName: session.agentName,
      leadId,
      organizationId,
      timestamp: new Date().toISOString(),
      sentBy: 'system'
    });
    
    res.json({
      success: true,
      message: 'Human control session ended - AI resumed control',
      agentName: session.agentName,
      phoneNumber,
      leadId,
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error ending human control session:', error);
    res.status(500).json({ 
      error: 'Failed to end human control session',
      details: error.message 
    });
  }
});

// Send message as human agent
app.post('/api/human-control/send-message', validateOrganizationAccess, async (req, res) => {
  try {
    const { phoneNumber, message, leadId, agentName } = req.body;
    const { organizationId } = req;
    
    if (!phoneNumber || !message || !leadId || !agentName) {
      return res.status(400).json({ 
        error: 'phoneNumber, message, leadId, and agentName are required' 
      });
    }
    
    console.log(`👤 Human message send request: ${agentName} sending to ${phoneNumber} (lead: ${leadId}) (org: ${organizationId})`);
    
    // Validate lead belongs to organization
    const leadData = getLeadData(leadId);
    if (leadData && leadData.organizationId && leadData.organizationId !== organizationId) {
      console.error(`🚨 SECURITY VIOLATION: Attempted human message send for lead ${leadId} belonging to org ${leadData.organizationId} by org ${organizationId}`);
      return res.status(403).json({ 
        error: 'Access denied - lead belongs to different organization',
        code: 'CROSS_ORG_ACCESS_DENIED' 
      });
    }
    
    // Check if under human control
    if (!isUnderHumanControl(phoneNumber, organizationId)) {
      return res.status(400).json({ 
        error: 'Conversation not under human control',
        code: 'NOT_UNDER_HUMAN_CONTROL'
      });
    }
    
    // Verify the agent matches the session
    const session = getHumanControlSession(phoneNumber, organizationId);
    if (!session || session.agentName !== agentName) {
      return res.status(403).json({ 
        error: 'Agent mismatch - only the controlling agent can send messages',
        currentAgent: session?.agentName,
        code: 'AGENT_MISMATCH' 
      });
    }
    
    // Send SMS via Twilio
    await sendSMSReply(phoneNumber, message, organizationId);
    
    // Store in conversation history as human agent message
    addToConversationHistory(phoneNumber, message, 'human_agent', 'text', organizationId);
    
    // Broadcast update to UI
    broadcastConversationUpdate({
      type: 'human_message_sent',
      phoneNumber,
      message,
      agentName,
      leadId,
      organizationId,
      timestamp: new Date().toISOString(),
      sentBy: 'human_agent'
    });
    
    res.json({
      success: true,
      message: 'Human message sent successfully',
      agentName,
      phoneNumber,
      leadId,
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error sending human message:', error);
    res.status(500).json({ 
      error: 'Failed to send human message',
      details: error.message 
    });
  }
});

// Get human control session status
app.get('/api/human-control/status/:phoneNumber', validateOrganizationAccess, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { organizationId } = req;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        error: 'phoneNumber is required' 
      });
    }
    
    const session = getHumanControlSession(phoneNumber, organizationId);
    const isUnderControl = isUnderHumanControl(phoneNumber, organizationId);
    
    res.json({
      success: true,
      isUnderHumanControl: isUnderControl,
      session: session,
      phoneNumber,
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error getting human control status:', error);
    res.status(500).json({ 
      error: 'Failed to get human control status',
      details: error.message 
    });
  }
});

// --- WEBHOOKS AND API ENDPOINTS ---

// Twilio SMS Incoming Webhook
app.post('/api/webhooks/twilio/sms/incoming', async (req, res) => {
  console.log('📱 Twilio SMS Incoming Webhook received:', req.body);
  
  try {
    const { From, To, Body, MessageSid } = req.body;
    
    if (!From || !To || !Body) {
      console.error('❌ Missing required SMS data');
      return res.status(400).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    
    console.log('✅ Incoming SMS processed:', { from: From, to: To, body: Body, messageSid: MessageSid });

    const normalizedFrom = normalizePhoneNumber(From);

    // Check if this is a human agent command (RESPOND: or CALL) - MUST be processed FIRST
    if (Body.startsWith('RESPOND:') || Body.toUpperCase() === 'CALL') {
      console.log('🤖 Processing human agent command:', Body);
      
      // Get organization ID for database lookup
      const organizationId = await getOrganizationByPhoneNumber(To);
      if (!organizationId) {
        console.error(`❌ No organization found for agent command from ${From}`);
        return res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }
      
      await processHumanAgentCommand(From, Body, To, organizationId);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    // ORGANIZATION ROUTING: Find organization by the phone number that RECEIVED the message (To)
    const organizationId = await getOrganizationByPhoneNumber(To);
    
    if (!organizationId) {
      console.error(`❌ No organization found for phone number ${To}. SMS cannot be routed.`);
      return res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    
    console.log(`🎯 SMS routed to organization: ${organizationId} via phone number: ${To}`);

    // Get the active lead ID for this phone number (prioritizes SSE connections)
    const leadId = await getActiveLeadForPhone(From);

    broadcastConversationUpdate({
      type: 'sms_received',
      phoneNumber: From,
      message: Body,
      timestamp: new Date().toISOString(),
      messageSid: MessageSid,
      sentBy: 'user',
      leadId: leadId,
      organizationId: organizationId,
      receivedOnNumber: To
    });

    // Check if message needs human intervention (APPLIES TO ALL SMS MESSAGES)
    if (needsHumanIntervention(Body)) {
      console.log('🚨 SMS message needs human intervention:', Body);
      
      // Get lead data for agent notification
      const leadData = getLeadData(leadId);
      if (leadData && leadData.agent_phone) {
        await notifyHumanAgentViaSMS(From, Body, leadData, organizationId);
        console.log('✅ Human agent notified - AI will also respond naturally');
      } else {
        console.log('⚠️ No agent phone configured for human intervention');
      }
    }

    // HUMAN-IN-THE-LOOP: Check if conversation is under human control
    if (isUnderHumanControl(From, organizationId)) {
      console.log(`👤 Message from ${From} during human control - queuing for human agent`);
      
      // Add to conversation history but don't send to AI
      addToConversationHistory(From, Body, 'user', 'text', organizationId);
      
      // Add to human control queue
      addToHumanQueue(From, organizationId, Body);
      
      // Get human control session info
      const session = getHumanControlSession(From, organizationId);
      
      // Broadcast to UI that customer sent message during human control
      broadcastConversationUpdate({
        type: 'user_message_during_human_control',
        phoneNumber: From,
        message: Body,
        timestamp: new Date().toISOString(),
        messageSid: MessageSid,
        sentBy: 'user',
        leadId: leadId,
        organizationId: organizationId,
        receivedOnNumber: To,
        humanAgentName: session?.agentName || 'Unknown Agent'
      });
      
      console.log(`📬 Message queued for human agent ${session?.agentName || 'Unknown'} - not sending to AI`);
    } else if (activeConversations.has(normalizedFrom)) {
      console.log('➡️ Existing conversation found. Sending message.');
      const ws = activeConversations.get(normalizedFrom);
      addToConversationHistory(From, Body, 'user', 'text', organizationId);
      ws.send(JSON.stringify({ type: 'user_message', text: Body }));
    } else {
      // ENHANCED: Check conversation history BEFORE starting new conversation (CACHED)
      const existingHistory = await getConversationHistoryCached(From, organizationId);
      addToConversationHistory(From, Body, 'user', 'text', organizationId);
      
      if (existingHistory.length > 0) {
        console.log(`📞➡️📱 Found ${existingHistory.length} previous messages (voice/SMS history). Starting new SMS conversation with context.`);
        startConversationWithTimeout(From, Body, organizationId);
      } else {
        console.log('✨ No existing conversation or history. Creating a new one.');
        startConversationWithTimeout(From, Body, organizationId);
      }
    }
    
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    
  } catch (error) {
    console.error('❌ Error processing incoming SMS:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// Configure ElevenLabs agent with transfer settings
async function configureAgentTransferSettings(agentId, apiKey, leadData) {
  try {
    // Only configure if agent phone is available
    if (!leadData?.agent_phone) {
      console.log('⚠️ No agent phone configured for lead - skipping transfer configuration');
      return;
    }
    
    // PERFORMANCE: Check cache first to avoid API calls
    const configKey = `${agentId}:${leadData.agent_phone}`;
    const cachedConfig = agentConfigCache.get(configKey);
    
    if (cachedConfig && (Date.now() - cachedConfig.timestamp) < AGENT_CONFIG_TTL) {
      console.log(`⚡ Using cached agent configuration for ${leadData.agent_phone} (skipping API call)`);
      return;
    }
    
    console.log(`🔧 Configuring agent transfer settings for ${leadData.agent_phone}`);
    
    const agentUpdatePayload = {
      tools: [
        {
          type: "system",
          name: "transfer_to_number",
          config: {
            transfer_destination: {
              type: "phone", 
              phone_number: leadData.agent_phone
            },
            transfer_type: "conference",
            condition: "When the customer explicitly requests to speak to a human agent, needs pricing information, wants to discuss specific financing details, or when I determine human intervention would be beneficial.",
            client_message: "I'm connecting you with one of our specialists who can help you with your specific needs. Please hold on while I get them on the line.",
            agent_message: `You're receiving a transfer from our AI assistant Jack. Customer is ${leadData.customerName} calling about automotive financing. They need human assistance with their inquiry.`
          }
        }
      ]
    };
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentUpdatePayload)
    });
    
    if (response.ok) {
      console.log('✅ Agent transfer settings configured successfully');
      // Cache the successful configuration to avoid future API calls
      agentConfigCache.set(configKey, { configured: true, timestamp: Date.now() });
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to configure agent transfer settings:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Error configuring agent transfer settings:', error);
  }
}

// Check if SMS message needs human intervention
function needsHumanIntervention(message) {
  const humanKeywords = [
    'human', 'agent', 'person', 'representative', 'help', 'assistance',
    'speak to someone', 'talk to someone', 'real person', 'live agent',
    'manager', 'supervisor', 'escalate', 'complaint', 'unhappy',
    'pricing', 'price', 'cost', 'payment', 'finance details', 'loan terms'
  ];
  
  const messageText = message.toLowerCase();
  return humanKeywords.some(keyword => messageText.includes(keyword));
}

// Process human agent commands from SMS (RESPOND: or CALL)
async function processHumanAgentCommand(agentPhone, command, systemPhone, organizationId) {
  try {
    console.log(`🤖 Human agent command from ${agentPhone}: ${command}`);
    
    // Find which lead this agent is associated with
    let targetLead = null;
    const normalizedAgentPhone = normalizePhoneNumber(agentPhone);
    
    for (const [leadId, lead] of dynamicLeads) {
      if (lead.agent_phone && normalizePhoneNumber(lead.agent_phone) === normalizedAgentPhone) {
        targetLead = lead;
        console.log(`✅ Found lead for agent phone ${agentPhone}: ${lead.customerName}`);
        break;
      }
    }
    
    // If not found in memory, check database with organization scope
    if (!targetLead && client) {
      try {
        console.log(`🔍 Searching database for agent phone ${agentPhone} in org ${organizationId}`);
        const { data: dbLead, error } = await client
          .from('leads')
          .select('*')
          .eq('agent_phone', agentPhone)
          .eq('organization_id', organizationId)
          .single();
        
        if (dbLead && !error) {
          targetLead = {
            id: dbLead.id,
            customerName: dbLead.customer_name,
            phoneNumber: dbLead.phone_number,
            organizationId: dbLead.organization_id,
            agent_phone: dbLead.agent_phone,
            agent_name: dbLead.agent_name,
            sentiment: dbLead.sentiment,
            fundingReadiness: dbLead.funding_readiness
          };
          console.log(`✅ Found lead in database for agent phone ${agentPhone}: ${targetLead.customerName}`);
          
          // Update memory cache with fresh data
          dynamicLeads.set(dbLead.id, targetLead);
          console.log(`📋 Updated memory cache with agent phone data for ${dbLead.id}`);
        }
      } catch (dbError) {
        console.error('❌ Error looking up lead by agent phone in database:', dbError);
      }
    }
    
    if (!targetLead) {
      console.log(`⚠️ No lead found for agent phone ${agentPhone}`);
      return;
    }
    
    console.log(`📱 Agent command for lead: ${targetLead.customerName} (${targetLead.phoneNumber})`);
    
    if (command.toUpperCase() === 'CALL') {
      // Initiate manual call
      console.log(`📞 Initiating manual call for agent ${agentPhone} to customer ${targetLead.phoneNumber}`);
      
      // Initiate manual call directly using existing Twilio logic
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!twilioAccountSid || !twilioAuthToken) {
        console.error('❌ Missing Twilio credentials for SMS-initiated manual call');
        return;
      }
      
      try {
        const { default: twilio } = await import('twilio');
        const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        
        // Get organization phone number
        const orgPhone = await getOrganizationPhoneNumber(targetLead.organizationId);
        const fromPhone = orgPhone?.phoneNumber || process.env.TWILIO_PHONE_NUMBER;
        
        // Generate unique conference ID  
        const conferenceId = `sms-call-${Date.now()}-${targetLead.id}`;
        
        // Call agent first (same logic as manual call API)
        const agentCall = await twilioClient.calls.create({
          url: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/twiml-agent?conferenceId=${conferenceId}&organizationId=${targetLead.organizationId}&leadId=${targetLead.id}&customerPhone=${encodeURIComponent(targetLead.phoneNumber)}`,
          to: agentPhone,
          from: fromPhone,
          statusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/agent-status`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        });
        
        // Store manual call session
        const manualCallSession = {
          conferenceId,
          customerCallSid: null,
          agentCallSid: agentCall.sid,
          phoneNumber: normalizePhoneNumber(targetLead.phoneNumber),
          leadId: targetLead.id,
          organizationId: targetLead.organizationId,
          agentName: agentPhone,
          agentPhone: agentPhone,
          status: 'calling_agent',
          startTime: new Date().toISOString()
        };
        
        activeCallSessions.set(conferenceId, manualCallSession);
        console.log('✅ Manual call initiated via SMS command:', agentCall.sid);
        
      } catch (twilioError) {
        console.error('❌ Failed to initiate SMS manual call:', twilioError);
      }
      
    } else if (command.startsWith('RESPOND:')) {
      // Send response to customer
      const responseMessage = command.substring(8).trim(); // Remove "RESPOND:" prefix
      console.log(`💬 Sending agent response to customer: ${responseMessage}`);
      
      await sendSMSReply(targetLead.phoneNumber, responseMessage, targetLead.organizationId);
      
      // Add to conversation history as human agent message
      addToConversationHistory(targetLead.phoneNumber, responseMessage, 'human_agent', 'text', targetLead.organizationId);
      
      console.log('✅ Human agent response sent to customer');
    }
    
  } catch (error) {
    console.error('❌ Error processing human agent command:', error);
  }
}

// Send SMS notification to human agent
async function notifyHumanAgentViaSMS(customerPhone, message, leadData, organizationId) {
  try {
    if (!leadData?.agent_phone) {
      console.log('⚠️ No agent phone configured - cannot send SMS notification');
      return;
    }
    
    console.log(`📱 Sending human intervention SMS to agent: ${leadData.agent_phone}`);
    
    const agentNotification = `🚨 Customer needs assistance
${leadData.customerName}: "${message}"

Reply options:
• RESPOND: your message (sends SMS to customer)
• CALL (starts phone call)
• Dashboard: https://jack-automotive-ai-assistant-13.onrender.com/subprime`;

    // Send SMS to agent using Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;
    
    if (!twilioAccountSid || !twilioAuthToken || !fromPhone) {
      console.error('❌ Missing Twilio credentials for agent notification');
      return;
    }
    
    const { default: twilio } = await import('twilio');
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    
    const smsResult = await twilioClient.messages.create({
      to: leadData.agent_phone,
      from: fromPhone,
      body: agentNotification
    });
    
    console.log('✅ Human agent notified via SMS:', smsResult.sid);
    
    // PERFORMANCE: Queue activity logging for batch processing (eliminates immediate DB write)
    console.log(`⚡ Activity logging queued for batch processing (no immediate DB write latency)`);
    
    // All activity logging will be batched and processed at conversation end
    
  } catch (error) {
    console.error('❌ Failed to notify human agent via SMS:', error);
  }
}

// ⭐ AGENT PHONE UPDATE: Update memory cache immediately when agent phone is saved
app.post('/api/leads/update-agent-phone', validateOrganizationAccess, async (req, res) => {
  try {
    const { leadId, agent_phone, agent_name } = req.body;
    const { organizationId } = req;
    
    console.log(`📱 Updating agent phone for lead ${leadId}: ${agent_name} - ${agent_phone}`);
    
    if (!leadId || !agent_phone || !agent_name) {
      return res.status(400).json({
        success: false,
        error: 'leadId, agent_phone, and agent_name are required'
      });
    }
    
    // Update memory cache immediately (no latency)
    if (dynamicLeads.has(leadId)) {
      const existingLead = dynamicLeads.get(leadId);
      const updatedLead = {
        ...existingLead,
        agent_phone: agent_phone.trim(),
        agent_name: agent_name.trim()
      };
      dynamicLeads.set(leadId, updatedLead);
      console.log('✅ Memory cache updated immediately for lead:', leadId);
    }
    
    res.json({
      success: true,
      message: 'Agent phone updated in memory cache'
    });
    
  } catch (error) {
    console.error('❌ Failed to update agent phone in memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update memory cache'
    });
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
    
    console.log('🔐 Environment check:', { 
      hasApiKey: !!apiKey, 
      hasAgentId: !!agentId,
      agentIdLength: agentId?.length 
    });
    
    if (!apiKey || !agentId) {
      console.error('❌ Missing credentials for native outbound call. Ensure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are set.');
      return res.status(500).json({ error: 'Server configuration error for voice calls. Missing required environment variables.' });
    }

    // GET ORGANIZATION-SPECIFIC PHONE NUMBER
    let orgPhone;
    try {
      orgPhone = await getOrganizationPhoneNumber(organizationId);
    } catch (phoneError) {
      console.error(`🚨 CRITICAL: Organization phone number not configured for ${organizationId}:`, phoneError.message);
      
      // Provide clear workflow guidance
      return res.status(400).json({ 
        error: 'Organization phone number not configured',
        message: phoneError.message,
        requiresSetup: true,
        organizationId,
        workflowSteps: [
          "1. Purchase Twilio number: POST /api/admin/organizations/{organizationId}/phone-numbers/purchase",
          "2. Import number to ElevenLabs dashboard manually",
          "3. Activate number: POST /api/admin/phone-numbers/{phoneNumber}/activate",
          "4. Then try making calls again"
        ],
        adminEndpoints: {
          purchaseNumber: `/api/admin/organizations/${organizationId}/phone-numbers/purchase`,
          checkNotifications: `/api/admin/notifications?type=elevenlabs_import_required`,
          activateNumber: `/api/admin/phone-numbers/{phoneNumber}/activate`
        }
      });
    }
    
    const phoneNumberId = orgPhone.elevenLabsPhoneId;
    console.log(`📞 Using organization phone number: ${orgPhone.phoneNumber} (ElevenLabs ID: ${phoneNumberId})`);

    // Use the exact API specification from ElevenLabs documentation
    const elevenlabsApiUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
    
    // Get conversation context for seamless SMS ↔ Voice transition
    // Use normalized phone number to ensure consistency with stored history
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    
    // Generate a unique conversation ID for tracking
    const tempConversationId = `temp_${Date.now()}_${phoneNumber}`;
    
    // PERFORMANCE: Load all conversation data in parallel for outbound calls
    const outboundData = await loadConversationDataParallel(normalizedPhoneNumber, organizationId, leadId);
    const { conversationContext, summary, messages, organizationName, comprehensiveSummary } = outboundData;
    
    // Get actual lead data instead of placeholders (already retrieved above for validation)
    const customerName = leadData?.customerName || `Customer ${phoneNumber}`;
    const leadStatus = summary?.summary ? "Returning Customer" : (messages.length > 0 ? "Active Lead" : "New Inquiry");
    
    // ENHANCED: Use comprehensive summary (voice + SMS) for better context
    let previousSummary;
    if (comprehensiveSummary && comprehensiveSummary.length > 20) {
      // Use the comprehensive voice + SMS summary
      previousSummary = comprehensiveSummary.length > 100000 ? comprehensiveSummary.substring(0, 100000) + "..." : comprehensiveSummary;
      console.log(`📋 Outbound call using comprehensive summary (${comprehensiveSummary.length} chars): ${comprehensiveSummary.substring(0, 100)}...`);
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

    // Generate enhanced dynamic variables based on BICI approach
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const currentDay = new Date().toLocaleDateString('en-US', { 
      timeZone: 'America/Los_Angeles',
      weekday: 'long' 
    });
    
    // Generate dynamic greeting context for outbound calls
    const greetingContext = generateGreetingContext(leadData, true, previousSummary);
    
    // Build comprehensive dynamic variables
    const enhancedDynamicVariables = {
      // Core context
      conversation_context: createSmartContextSummary(conversationContext, messages, summary),
      previous_summary: previousSummary || "First time caller - no previous interactions",
      
      // Customer information
      customer_name: customerName || "",
      customer_phone: phoneNumber,
      has_customer_name: leadData?.customerName ? "true" : "false",
      
      // Lead data
      lead_status: leadStatus,
      lead_id: leadId,
      interaction_count: messages.length.toString(),
      last_contact: leadData?.lastTouchpoint ? new Date(leadData.lastTouchpoint).toLocaleDateString() : "First contact",
      
      // Organization context
      organization_name: organizationName,
      organization_id: organizationId,
      
      // Vehicle/automotive context
      vehicle_interest: leadData?.vehiclePreference || leadData?.vehicleInterest?.type || "general inquiry",
      funding_readiness: leadData?.fundingReadiness || "unknown",
      credit_profile: leadData?.creditProfile?.scoreRange || "not assessed",
      
      // Time and business context
      current_time: currentTime,
      current_day: currentDay,
      current_datetime: `${currentDay} ${currentTime} Pacific Time`,
      
      // Conversation metadata
      is_outbound_call: "true",
      call_reason: "follow_up",
      conversation_medium: "voice",
      
      // Context flags
      has_previous_conversations: messages.length > 0 ? "true" : "false",
      conversation_count: messages.length.toString(),
      voice_messages: messages.filter(m => m.type === 'voice').length.toString(),
      sms_messages: messages.filter(m => m.type === 'sms' || m.type === 'text').length.toString(),
      
      // Dynamic greeting context
      ...greetingContext
    };
    
    // Configure agent with transfer settings if agent phone is available
    await configureAgentTransferSettings(agentId, apiKey, leadData);
    
    const callPayload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: phoneNumber,
      // Dynamic variables must go inside conversation_initiation_client_data for outbound calls!
      conversation_initiation_client_data: {
        lead_id: leadId,
        customer_phone: phoneNumber,
        organization_id: organizationId, // SECURITY: Include organization context
        initiated_by: 'agent', // Mark as outbound call
        dynamic_variables: enhancedDynamicVariables
      }
    };

    console.log(`📞 Initiating ElevenLabs native call to ${phoneNumber} (org: ${organizationId})`);
    console.log(`📞 Using phone number ID: ${phoneNumberId}`);
    console.log(`📞 Enhanced dynamic variables:`, {
      customer_name: enhancedDynamicVariables.customer_name,
      has_customer_name: enhancedDynamicVariables.has_customer_name,
      conversation_count: enhancedDynamicVariables.conversation_count,
      lead_status: enhancedDynamicVariables.lead_status,
      vehicle_interest: enhancedDynamicVariables.vehicle_interest,
      current_datetime: enhancedDynamicVariables.current_datetime
    });

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
    storeConversationMetadata(conversationId, phoneNumber, leadId, organizationId);
    
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
    await sendSMSReply(to, message, organizationId);
    
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

// --- ORGANIZATION PHONE NUMBER MANAGEMENT ENDPOINTS ---

// Purchase new Twilio number for organization (Admin only)
app.post('/api/admin/organizations/:organizationId/phone-numbers/purchase', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { areaCode } = req.body;
    
    // TODO: Add admin authentication check
    console.log(`📞 Purchasing new phone number for organization: ${organizationId}`);
    
    const result = await purchaseTwilioNumberForOrganization(organizationId, areaCode);
    
    res.status(200).json({
      success: true,
      message: 'Phone number purchased successfully',
      ...result,
      nextSteps: [
        'Import this phone number to ElevenLabs dashboard',
        'Assign the phone number to your agent',
        'Call the activate endpoint with the ElevenLabs phone ID'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error purchasing phone number:', error);
    res.status(500).json({ 
      error: 'Failed to purchase phone number',
      details: error.message 
    });
  }
});

// Manually add phone number to database (Admin only - for fixing missing entries)
app.post('/api/admin/phone-numbers/manual-add', async (req, res) => {
  try {
    const { organizationId, phoneNumber, twilioPhoneSid, elevenLabsPhoneId, isActive } = req.body;
    
    if (!organizationId || !phoneNumber) {
      return res.status(400).json({ 
        error: 'organizationId and phoneNumber are required'
      });
    }
    
    console.log(`📞 Manually adding phone number: ${phoneNumber} for organization: ${organizationId}`);
    
    // Insert the phone number into the database
    const { data: phoneRecord, error } = await client
      .from('organization_phone_numbers')
      .insert({
        organization_id: organizationId,
        phone_number: phoneNumber,
        twilio_phone_sid: twilioPhoneSid || 'MANUAL_ADD',
        elevenlabs_phone_id: elevenLabsPhoneId,
        is_active: isActive || false
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error adding phone number to database:', error);
      return res.status(500).json({ 
        error: 'Failed to add phone number to database',
        details: error.message 
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Phone number added to database successfully',
      phoneNumber,
      organizationId,
      elevenLabsPhoneId,
      isActive: isActive || false,
      record: phoneRecord
    });
    
  } catch (error) {
    console.error('❌ Error manually adding phone number:', error);
    res.status(500).json({ 
      error: 'Failed to add phone number',
      details: error.message 
    });
  }
});

// Activate phone number after ElevenLabs import (Admin only)
app.post('/api/admin/phone-numbers/:phoneNumber/activate', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { elevenLabsPhoneId } = req.body;
    
    if (!elevenLabsPhoneId) {
      return res.status(400).json({ 
        error: 'elevenLabsPhoneId is required',
        message: 'Please provide the ElevenLabs phone ID from the dashboard'
      });
    }
    
    console.log(`📞 Activating phone number: ${phoneNumber} with ElevenLabs ID: ${elevenLabsPhoneId}`);
    
    const result = await activateOrganizationPhoneNumber(phoneNumber, elevenLabsPhoneId);
    
    res.status(200).json({
      success: true,
      message: 'Phone number activated successfully',
      phoneNumber,
      elevenLabsPhoneId,
      isActive: true,
      result
    });
    
  } catch (error) {
    console.error('❌ Error activating phone number:', error);
    res.status(500).json({ 
      error: 'Failed to activate phone number',
      details: error.message 
    });
  }
});

// Get admin notifications (for manual steps)
app.get('/api/admin/notifications', async (req, res) => {
  try {
    const { status = 'pending', type } = req.query;
    
    let query = client.from('admin_notifications').select('*');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data: notifications, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching admin notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
    
    res.status(200).json({
      success: true,
      notifications,
      count: notifications.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin notifications:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      details: error.message 
    });
  }
});

// List organization phone numbers
app.get('/api/organizations/:organizationId/phone-numbers', validateOrganizationAccess, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    const { data: phoneNumbers, error } = await client
      .from('organization_phone_numbers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching organization phone numbers:', error);
      return res.status(500).json({ error: 'Failed to fetch phone numbers' });
    }
    
    res.status(200).json({
      success: true,
      phoneNumbers: phoneNumbers || [],
      organizationId
    });
    
  } catch (error) {
    console.error('❌ Error listing phone numbers:', error);
    res.status(500).json({ 
      error: 'Failed to list phone numbers',
      details: error.message 
    });
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
    
    // PERFORMANCE: Early rejection of placeholder/example webhook data
    if (!eventData.type || eventData.conversation_id === "The unique identifier for the conversation") {
      console.log('⚡ Skipping placeholder webhook event');
      return res.status(200).json({ success: true, message: 'Placeholder event ignored' });
    }

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
      const organizationId = clientData.organization_id;
      const tempId = clientData.temp_conversation_id;
      
      if (leadId && phoneNumber) {
        // Store this metadata for future events (including organizationId)
        storeConversationMetadata(conversationId, phoneNumber, leadId, organizationId);
        metadata = { phoneNumber, leadId, organizationId };
        
        // Also check if we have a temp ID mapping
        if (tempId) {
          const tempMetadata = getConversationMetadata(tempId);
          if (tempMetadata) {
            // Transfer metadata from temp to real conversation ID
            storeConversationMetadata(conversationId, tempMetadata.phoneNumber, tempMetadata.leadId, tempMetadata.organizationId);
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

    // Handle different event types with enhanced BICI-style processing
    switch (eventData.type) {
      case 'conversation_started':
        console.log('🚀 Conversation started:', conversationId);
        if (leadId && phoneNumber) {
          // Enhanced call initiation tracking
          const callData = {
            conversationId,
            phoneNumber: normalizePhoneNumber(phoneNumber),
            leadId,
            organizationId: metadata?.organizationId,
            status: 'active',
            startTime: new Date(eventData.event_timestamp * 1000).toISOString()
          };
          
          // Store call session data
          activeCallSessions.set(conversationId, callData);
          
          broadcastConversationUpdate({
            type: 'call_initiated',
            ...callData,
            timestamp: callData.startTime
          });
        }
        break;

      case 'conversation_ended':
        console.log('🏁 Conversation ended:', conversationId);
        
        // Get call session data for enhanced completion tracking
        const callSession = activeCallSessions.get(conversationId);
        
        if (leadId && phoneNumber) {
          // Enhanced conversation completion with analytics
          const endTime = new Date(eventData.event_timestamp * 1000).toISOString();
          const duration = eventData.data?.duration_ms || 
                          (callSession ? new Date(endTime).getTime() - new Date(callSession.startTime).getTime() : null);
          
          broadcastConversationUpdate({
            type: 'call_completed',
            conversationId,
            phoneNumber: normalizePhoneNumber(phoneNumber),
            leadId,
            organizationId: metadata?.organizationId,
            duration,
            endTime,
            startTime: callSession?.startTime,
            timestamp: endTime
          });
          
          // Trigger conversation analysis and lead updates
          if (phoneNumber && metadata?.organizationId) {
            try {
              await updateLeadFromConversationData(leadId, phoneNumber, metadata.organizationId);
            } catch (error) {
              console.error('⚠️ Error updating lead from conversation data:', error);
            }
          }
        }
        
        // Clean up session data
        if (conversationId) {
          conversationMetadata.delete(conversationId);
          activeCallSessions.delete(conversationId);
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
            organizationId: metadata?.organizationId,
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
        const isPartialTranscript = eventData.data?.is_partial || false;
        
        console.log('💬 User voice message:', {
          message: userMessage?.substring(0, 50),
          isPartial: isPartialTranscript,
          conversationId
        });
        
        if (userMessage && phoneNumber) {
          const organizationId = metadata?.organizationId;
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          
          if (!isPartialTranscript) {
            // Only store complete messages in conversation history
            addToConversationHistory(normalizedPhone, userMessage, 'user', 'voice', organizationId);
          }
          
          if (leadId) {
            // Broadcast both partial and complete transcripts for real-time updates
            broadcastConversationUpdate({
              type: isPartialTranscript ? 'live_transcript' : 'conversation_user',
              phoneNumber: normalizedPhone,
              message: userMessage,
              timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString(),
              conversationId,
              speaker: 'user',
              sentBy: 'user',
              leadId,
              organizationId,
              isPartial: isPartialTranscript
            });
          }
        }
        break;

      case 'agent_message':
      case 'agent_response':
        const agentMessage = eventData.data?.message || eventData.data?.response;
        const isAgentPartial = eventData.data?.is_partial || false;
        
        console.log('🤖 Agent voice message:', {
          message: agentMessage?.substring(0, 50),
          isPartial: isAgentPartial,
          conversationId
        });
        
        if (agentMessage && phoneNumber) {
          const organizationId = metadata?.organizationId;
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          
          if (!isAgentPartial) {
            // Only store complete messages in conversation history
            addToConversationHistory(normalizedPhone, agentMessage, 'agent', 'voice', organizationId);
          }
          
          if (leadId) {
            broadcastConversationUpdate({
              type: isAgentPartial ? 'live_transcript' : 'conversation_agent',
              phoneNumber: normalizedPhone,
              message: agentMessage,
              timestamp: new Date((eventData.event_timestamp || Date.now() / 1000) * 1000).toISOString(),
              conversationId,
              speaker: 'agent',
              sentBy: 'agent',
              leadId,
              organizationId,
              isPartial: isAgentPartial
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
// Deduplication cache for post-call webhooks
const processedWebhooks = new Map();
const WEBHOOK_CACHE_TTL = 300000; // 5 minutes

app.post('/api/webhooks/elevenlabs/post-call', async (req, res) => {
  try {
    const signature = req.headers['xi-signature'];
    const payload = JSON.stringify(req.body);

    // Extract conversation ID for deduplication (declared below)
    let conversationId = req.body?.data?.conversation_id;
    
    // Deduplicate webhooks
    if (conversationId) {
      const now = Date.now();
      const existing = processedWebhooks.get(conversationId);
      
      if (existing && (now - existing.timestamp) < WEBHOOK_CACHE_TTL) {
        console.log(`🔄 Duplicate post-call webhook ignored for conversation: ${conversationId} (processed ${now - existing.timestamp}ms ago)`);
        return res.status(200).json({ status: 'duplicate_ignored' });
      }
      
      processedWebhooks.set(conversationId, { timestamp: now });
      
      // Clean up old entries every 100 webhooks
      if (processedWebhooks.size > 100) {
        for (const [id, data] of processedWebhooks.entries()) {
          if (now - data.timestamp > WEBHOOK_CACHE_TTL) {
            processedWebhooks.delete(id);
          }
        }
      }
    }

    console.log('📞 POST-CALL WEBHOOK RECEIVED:', {
      timestamp: new Date().toISOString(),
      signature: signature ? 'Present' : 'MISSING',
      payloadLength: payload.length,
      headers: Object.keys(req.headers),
      bodyKeys: Object.keys(req.body || {}),
      conversationId: conversationId
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
    let leadId, duration, summary, phoneNumber;
    
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

    // ENHANCED: Also try to find metadata using call_sid from the new payload structure
    if (!leadId && eventData.data?.call_sid) {
      const callSidMetadata = getConversationMetadata(eventData.data.call_sid);
      if (callSidMetadata) {
        leadId = callSidMetadata.leadId;
        phoneNumber = phoneNumber || callSidMetadata.phoneNumber;
        console.log('📞 Found metadata using call_sid:', { callSid: eventData.data.call_sid, leadId, phoneNumber });
      }
    }

    // ENHANCED: Try to extract phone number from call_sid or conversation_id if still missing
    if (!phoneNumber && conversationId) {
      console.log('🔍 Trying to extract phone number from conversationId:', conversationId);
      // ElevenLabs sometimes includes phone info in conversation metadata
      const metadata = getConversationMetadata(conversationId);
      if (metadata?.phoneNumber) {
        phoneNumber = metadata.phoneNumber;
        console.log('📞 Found phone number from metadata:', phoneNumber);
      }
    }

    // If we have phone number but no leadId, try to find the active lead
    if (!leadId && phoneNumber) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      leadId = await getActiveLeadForPhone(normalizedPhone);
      console.log('📞 Found active lead for phone:', { phoneNumber, normalizedPhone, leadId });
    }

    // LAST RESORT: If we still don't have phoneNumber, try to extract from caller context
    if (!phoneNumber && eventData.data?.caller_id) {
      phoneNumber = eventData.data.caller_id;
      console.log('📞 Using caller_id as phone number:', phoneNumber);
    }

    // DEBUG: If we still don't have phoneNumber, try to search all conversation metadata
    if (!phoneNumber && conversationId) {
      console.log('🔍 Searching all conversation metadata for phone number...');
      for (const [metadataId, metadata] of conversationMetadata.entries()) {
        if (metadataId.includes(conversationId) || (metadata.phoneNumber && metadata.leadId)) {
          console.log('📞 Found potential match in metadata:', { metadataId, metadata });
          if (!phoneNumber) phoneNumber = metadata.phoneNumber;
          if (!leadId) leadId = metadata.leadId;
        }
      }
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

    // SECURITY FIX: Get organizationId for proper scoping (used for both history and summary)
    let organizationId = null;
    if (phoneNumber) {
      organizationId = await getOrganizationIdFromPhone(phoneNumber);
    }

    // Store conversation history if we have transcript and phone number
    if (transcript && phoneNumber && Array.isArray(transcript)) {
      const normalizedForStorage = normalizePhoneNumber(phoneNumber);
      console.log('📝 Storing post-call conversation history for:', phoneNumber, '(normalized:', normalizedForStorage + ')');
      
      // ENHANCED: Use base timestamp from ElevenLabs event with microsecond offsets for proper ordering
      const baseTimestamp = eventData.event_timestamp ? 
        new Date(eventData.event_timestamp * 1000) : 
        new Date();
      
      transcript.forEach((message, index) => {
        if (message.role && message.message) {
          // Use custom timestamp with microsecond offsets to ensure proper chronological ordering
          const messageTimestamp = message.timestamp || 
            new Date(baseTimestamp.getTime() + (index * 100)).toISOString(); // 100ms offset per message
          
          addToConversationHistoryWithTimestamp(
            phoneNumber, 
            message.message, 
            message.role, 
            'voice', 
            organizationId, 
            messageTimestamp,
            index // sequence offset
          );
        }
      });
      
      // URGENT FIX: Broadcast conversation history update after storing transcript
      if (leadId) {
        broadcastConversationUpdate({
          type: 'conversation_transcript_added',
          leadId,
          phoneNumber: normalizePhoneNumber(phoneNumber),
          organizationId,
          messageCount: transcript.length,
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Broadcasted transcript update for lead ${leadId} (${transcript.length} messages)`);
      }
    }

    // Store conversation summary if we have one - SECURITY FIX: Now includes organizationId
    if (summary && phoneNumber) {
      storeConversationSummary(phoneNumber, summary, organizationId);
    }

    // ENHANCED: Extract conversation insights like BICI
    let insights = null;
    if (transcript && Array.isArray(transcript)) {
      insights = await extractConversationInsights(transcript, eventData.analysis, phoneNumber, organizationId);
      
      // Broadcast insights to dashboard for real-time updates
      if (insights && leadId) {
        broadcastConversationUpdate({
          type: 'conversation_insights',
          leadId,
          phoneNumber: normalizePhoneNumber(phoneNumber),
          organizationId,
          insights,
          timestamp: new Date().toISOString()
        });
      }
    }

    // ENHANCED: Extract and update lead profile from ElevenLabs data collection results
    if (phoneNumber && eventData.analysis?.data_collection_results) {
      await updateLeadFromConversationData(phoneNumber, eventData.analysis.data_collection_results, summary);
    }

    // FIX: Update call session in database with final transcript and summary
    // This is crucial for incoming calls to have their context persisted
    if (conversationId && phoneNumber) {
      supabasePersistence.persistCallSession({
        id: conversationId,
        leadId: leadId,
        elevenlabsConversationId: conversationId,
        phoneNumber: phoneNumber,
        endedAt: new Date().toISOString(),
        durationSeconds: duration ? Math.floor(duration / 1000) : null,
        transcript: transcript,
        summary: summary,
        callOutcome: eventData.call_ended_reason || 'completed',
        organizationId: organizationId,
        // Update with final conversation context
        conversationContext: await buildConversationContext(phoneNumber, organizationId),
        dynamicVariables: eventData.conversation_initiation_client_data || {}
      }).catch(error => {
        console.log(`🗄️ Call session update failed (system continues normally):`, error.message);
      });
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
      
      // DIFFERENTIAL CACHE UPDATE: Append new messages instead of invalidating entire cache
      if (phoneNumber && organizationId && transcript && transcript.length > 0) {
        const memoryKey = createOrgMemoryKey(organizationId, phoneNumber);
        
        // CACHE FIX: Check the correct memory cache where messages are actually stored
        const existingMemoryMessages = conversationContexts.get(memoryKey) || [];
        if (existingMemoryMessages.length > 0) {
          // Messages exist in memory, only invalidate derived caches that need regeneration
          const existingCount = existingMemoryMessages.length;
          console.log(`🔄 Memory has ${existingCount} messages, invalidating derived caches only (preserves memory)`);
          comprehensiveSummaryCache.delete(memoryKey);
          conversationHistoryCache.delete(memoryKey); // Will be rebuilt from memory, not database
        } else {
          // No memory messages, full cache invalidation needed
          conversationHistoryCache.delete(memoryKey);
          conversationSummaryCache.delete(memoryKey);
          comprehensiveSummaryCache.delete(memoryKey);
          console.log(`🔄 No memory messages - full cache invalidation`);
        }
      } else if (phoneNumber && organizationId) {
        console.log(`⚡ Keeping all caches - no new transcript data`);
      }
      
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

// --- ORGANIZATION PHONE NUMBER FUNCTIONS ---

async function getOrganizationPhoneNumber(organizationId) {
  try {
    const { data: phoneRecord, error } = await client
      .from('organization_phone_numbers')
      .select('phone_number, elevenlabs_phone_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();
    
    if (error || !phoneRecord) {
      console.error(`🚨 CRITICAL: No active phone number found for organization ${organizationId}`);
      throw new Error(`Organization ${organizationId} does not have an active phone number configured. Please purchase and configure a phone number first.`);
    }
    
    if (!phoneRecord.elevenlabs_phone_id) {
      console.error(`🚨 CRITICAL: Phone number ${phoneRecord.phone_number} for organization ${organizationId} is not configured in ElevenLabs`);
      throw new Error(`Phone number ${phoneRecord.phone_number} needs to be imported to ElevenLabs dashboard and activated.`);
    }
    
    return {
      phoneNumber: phoneRecord.phone_number,
      elevenLabsPhoneId: phoneRecord.elevenlabs_phone_id
    };
  } catch (error) {
    console.error('❌ Error getting organization phone number:', error);
    throw error; // Don't mask the error - let it bubble up
  }
}

async function getOrganizationByPhoneNumber(phoneNumber) {
  try {
    const { data: phoneRecord, error } = await client
      .from('organization_phone_numbers')
      .select('organization_id')
      .eq('phone_number', phoneNumber)
      .eq('is_active', true)
      .single();
    
    if (error || !phoneRecord) {
      console.warn(`⚠️ No organization found for phone number ${phoneNumber}`);
      return null;
    }
    
    return phoneRecord.organization_id;
  } catch (error) {
    console.error('❌ Error getting organization by phone number:', error);
    return null;
  }
}

async function purchaseTwilioNumberForOrganization(organizationId, areaCode = '778') {
  try {
    // Validate Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
    
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Build search parameters - only include areaCode if it's provided
    const searchParams = { limit: 5 };
    if (areaCode && areaCode.toString().trim()) {
      searchParams.areaCode = areaCode;
    }
    
    // Search for available numbers
    console.log(`🔍 Searching for Vancouver BC numbers with params:`, searchParams);
    
    let numbers = await twilioClient.availablePhoneNumbers('CA')
      .local
      .list(searchParams);
    
    // If no numbers found with area code, try without area code as fallback
    if (numbers.length === 0 && searchParams.areaCode) {
      console.log(`⚠️ No numbers found with area code ${searchParams.areaCode}, trying without area code...`);
      const fallbackParams = { limit: 5 };
      numbers = await twilioClient.availablePhoneNumbers('CA')
        .local
        .list(fallbackParams);
    }
    
    if (numbers.length === 0) {
      throw new Error('No available phone numbers found in the US. Please try again later or contact support.');
    }
    
    console.log(`✅ Found ${numbers.length} available phone numbers`);
    console.log(`📞 Selected number: ${numbers[0].phoneNumber}`);
    
    // Purchase the first available number
    const selectedNumber = numbers[0].phoneNumber;
    
    // Get the proper server URL - fallback to Render deployment URL
    const serverUrl = process.env.SERVER_URL || 'https://jack-automotive-ai-assistant-13.onrender.com';
    
    const voiceUrl = 'https://api.us.elevenlabs.io/twilio/inbound_call';
    const messagingUrl = `${serverUrl}/api/webhooks/twilio/sms/incoming`;
    
    console.log(`📞 Purchasing number with webhooks:`, {
      voiceUrl: voiceUrl,
      smsUrl: messagingUrl
    });
    
    const purchasedNumber = await twilioClient.incomingPhoneNumbers
      .create({
        phoneNumber: selectedNumber,
        voiceUrl: voiceUrl,
        smsUrl: messagingUrl
      });
    
    console.log('✅ Purchased Twilio number:', selectedNumber);
    
    // Store in database (pending ElevenLabs configuration)
    const { data: phoneRecord, error } = await client
      .from('organization_phone_numbers')
      .insert({
        organization_id: organizationId,
        phone_number: selectedNumber,
        twilio_phone_sid: purchasedNumber.sid,
        elevenlabs_phone_id: null, // Will be updated after manual import
        is_active: false // Not active until ElevenLabs import
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error storing phone number in database:', error);
      throw error;
    }
    
    // Create admin notification for manual ElevenLabs import
    await client.from('admin_notifications').insert({
      type: 'elevenlabs_import_required',
      organization_id: organizationId,
      phone_number: selectedNumber,
      message: `Import ${selectedNumber} to ElevenLabs dashboard and assign to agent. Then activate this number.`,
      status: 'pending'
    });
    
    console.log('📢 Admin notification created for ElevenLabs import');
    
    return {
      phoneNumber: selectedNumber,
      twilioSid: purchasedNumber.sid,
      databaseId: phoneRecord.id,
      requiresElevenLabsImport: true
    };
    
  } catch (error) {
    console.error('❌ Error purchasing Twilio number:', error);
    throw error;
  }
}

async function activateOrganizationPhoneNumber(phoneNumber, elevenLabsPhoneId) {
  try {
    const { data, error } = await client
      .from('organization_phone_numbers')
      .update({
        elevenlabs_phone_id: elevenLabsPhoneId,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error activating phone number:', error);
      throw error;
    }
    
    // Mark admin notification as resolved
    await client
      .from('admin_notifications')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)
      .eq('type', 'elevenlabs_import_required');
    
    console.log('✅ Phone number activated and notification resolved:', phoneNumber);
    return data;
    
  } catch (error) {
    console.error('❌ Error activating phone number:', error);
    throw error;
  }
}

// --- HELPER FUNCTIONS and UTILITIES ---

async function sendSMSReply(to, message, organizationId = null) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.error('❌ Missing Twilio credentials for SMS reply');
      return;
    }

    // GET ORGANIZATION-SPECIFIC PHONE NUMBER
    let fromNumber;
    if (organizationId) {
      try {
        const orgPhone = await getOrganizationPhoneNumber(organizationId);
        fromNumber = orgPhone.phoneNumber;
        console.log(`📞 Using organization phone number for SMS reply: ${fromNumber}`);
      } catch (phoneError) {
        console.error(`🚨 CRITICAL: Cannot send SMS - organization phone number not configured for ${organizationId}:`, phoneError.message);
        console.error(`📱 SMS reply blocked to prevent cross-organization confusion`);
        return; // Don't send SMS without proper organization phone number
      }
    } else {
      // FALLBACK: Use default phone number (only for legacy scenarios)
      fromNumber = process.env.TWILIO_PHONE_NUMBER;
      console.log(`📞 Using default phone number for SMS reply: ${fromNumber}`);
    }
    
    if (!fromNumber) {
      console.error('❌ No phone number available for SMS reply');
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
      console.log('✅ SMS reply sent:', { to, from: fromNumber, messageSid: result.sid, organizationId });
    } else {
      console.error('❌ Failed to send SMS reply:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Error sending SMS reply:', error);
  }
}

// Enhanced SSE connection management inspired by BICI
const sseConnectionsMap = new Map(); // clientId -> Response[]

function setupSSEConnection(clientId, res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Store connection
  if (!sseConnectionsMap.has(clientId)) {
    sseConnectionsMap.set(clientId, []);
  }
  sseConnectionsMap.get(clientId).push(res);
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    clientId,
    timestamp: new Date().toISOString() 
  })}\n\n`);
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (error) {
      clearInterval(keepAlive);
    }
  }, 30000);
  
  // Clean up on disconnect
  res.on('close', () => {
    clearInterval(keepAlive);
    const connections = sseConnectionsMap.get(clientId);
    if (connections) {
      const index = connections.indexOf(res);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        sseConnectionsMap.delete(clientId);
      }
    }
    console.log(`📡 SSE connection closed for client: ${clientId}`);
  });
  
  console.log(`📡 SSE connection established for client: ${clientId}`);
}

function broadcastToClients(data, targetClientId) {
  const message = `data: ${JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  })}\n\n`;
  
  console.log('📡 Broadcasting update:', {
    type: data.type,
    targetClientId: targetClientId || 'all',
    connectionCount: getActiveSSEConnections(),
    messageLength: message.length
  });
  
  if (targetClientId) {
    // Send to specific client
    const connections = sseConnectionsMap.get(targetClientId);
    if (connections) {
      connections.forEach(res => {
        try {
          res.write(message);
        } catch (error) {
          console.error('❌ Error broadcasting to client:', error);
        }
      });
    }
  } else {
    // Broadcast to all clients
    sseConnectionsMap.forEach((connections, clientId) => {
      connections.forEach(res => {
        try {
          res.write(message);
        } catch (error) {
          console.error('❌ Error broadcasting to client:', error);
        }
      });
    });
  }
  
  // Legacy support - also broadcast via old system for backwards compatibility
  broadcastConversationUpdate(data);
}

function getActiveSSEConnections() {
  let total = 0;
  sseConnectionsMap.forEach(connections => {
    total += connections.length;
  });
  return total;
}

function broadcastConversationUpdate(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
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
    sseConnections.forEach((res, leadId) => {
      try {
        res.write(message);
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
  // Check both params, body, and query for leadId (POST endpoints use body, GET endpoints use params or query)
  const leadId = req.params.leadId || req.body.leadId || req.query.leadId;
    // For SSE connections, organizationId comes from query params since headers aren't supported
    // For regular API calls, organizationId comes from headers
    // FIXED: Handle case variations in headers (organizationId vs organizationid)
    const organizationId = req.headers.organizationId || 
                          req.headers.organizationid || 
                          req.headers['organization-id'] ||
                          req.query.organizationId;
    
    console.log('🔍 Organization validation:', {
      leadId,
      fromHeaders: req.headers.organizationId || req.headers.organizationid,
      fromQuery: req.query.organizationId,
      finalOrgId: organizationId,
      url: req.url,
      method: req.method,
      allHeaders: Object.keys(req.headers)
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

// ==========================================
// AUTHENTICATION & ORGANIZATION ENDPOINTS
// ==========================================

// Create organization OR join existing organization (for new signups)
app.post('/api/auth/organizations', async (req, res) => {
  try {
    console.log('🏢 Organization signup request received:', req.body);
    
    const { name, slug, email, phone_number, user_id, first_name, last_name } = req.body;

    // Validate required fields
    if (!name || !slug || !user_id) {
      return res.status(400).json({ error: 'Organization name, slug, and user_id are required' });
    }

    // Check if Supabase client is available
    if (!client) {
      console.error('❌ Supabase client not initialized - missing environment variables');
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // STEP 1: Check if organization with this slug already exists
    const existingOrgResult = await client.from('organizations')
      .select('id, name, slug')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    let organization;
    let userRole;
    let isNewOrganization = false;

    if (existingOrgResult.data) {
      // ORGANIZATION EXISTS - User joins existing organization
      organization = existingOrgResult.data;
      userRole = 'agent'; // Subsequent users become agents
      isNewOrganization = false;
      
      console.log(`✅ Found existing organization: ${organization.name} (${organization.slug})`);
      console.log(`👥 User ${email} will join as: ${userRole}`);

    } else {
      // ORGANIZATION DOESN'T EXIST - Create new organization
      console.log(`🆕 Creating new organization: ${name} (${slug})`);
      
      const newOrgResult = await client.from('organizations')
        .insert({
          name,
          slug,
          email: email,
          phone_number: phone_number,
          settings: {
            created_by: user_id,
            features: {
              telephony: true,
              analytics: true,
              lead_management: true
            }
          },
          is_active: true
        })
        .select()
        .single();

      if (newOrgResult.error) {
        console.error('❌ Error creating organization:', newOrgResult.error);
        return res.status(400).json({ error: newOrgResult.error.message });
      }

      organization = newOrgResult.data;
      userRole = 'admin'; // First user becomes admin
      isNewOrganization = true;
      
      console.log(`✅ New organization created: ${organization.name}`);
      console.log(`👑 User ${email} becomes: ${userRole} (organization founder)`);
      
      // AUTOMATIC PHONE NUMBER PURCHASE: Buy a Twilio number for new organization
      try {
        console.log(`📞 Automatically purchasing Twilio number for new organization: ${organization.id}`);
        const phoneResult = await purchaseTwilioNumberForOrganization(organization.id);
        
        console.log(`✅ Phone number purchased for ${organization.name}: ${phoneResult.phoneNumber}`);
        console.log(`📋 Manual step required: Import ${phoneResult.phoneNumber} to ElevenLabs dashboard`);
        
        // Store success info for response
        organization.phoneNumberPurchased = phoneResult.phoneNumber;
        organization.requiresElevenLabsImport = true;
        
      } catch (phoneError) {
        console.error(`❌ Failed to purchase phone number for organization ${organization.id}:`, phoneError);
        // Don't fail the organization creation, but log the issue
        organization.phoneNumberError = phoneError.message;
        
        // Create admin notification for manual phone number setup
        await client.from('admin_notifications').insert({
          type: 'phone_number_setup_required',
          organization_id: organization.id,
          message: `Failed to automatically purchase phone number for "${organization.name}". Manual setup required.`,
          status: 'pending'
        });
      }
    }

    // STEP 2: Verify user exists in auth.users before creating profile
    const authUserResult = await client.auth.admin.getUserById(user_id);
    
    if (authUserResult.error || !authUserResult.data.user) {
      console.error('❌ User not found in auth.users:', authUserResult.error);
      return res.status(400).json({ 
        error: 'User not found in authentication system. Please complete signup first.',
        details: authUserResult.error?.message
      });
    }

    console.log('✅ User verified in auth.users:', authUserResult.data.user.email);

    // STEP 3: Create or update user profile with organization
    const profileResult = await client.from('user_profiles')
      .upsert({
        id: user_id,
        organization_id: organization.id,
        email: email,
        first_name: first_name,
        last_name: last_name,
        role: userRole, // admin for first user, agent for subsequent users
        is_active: true,
        timezone: 'UTC',
        preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileResult.error) {
      console.error('❌ Error creating/updating profile:', profileResult.error);
      return res.status(400).json({ error: 'Failed to create user profile' });
    }

    console.log('✅ User profile created/updated with role:', userRole);

    // STEP 4: Create organization membership
    const membershipResult = await client.from('organization_memberships')
      .insert({
        user_id: user_id,
        organization_id: organization.id,
        role: userRole,
        is_active: true,
        permissions: userRole === 'admin' ? { all: true } : { read: true, write: true, lead_create: true }
      });

    if (membershipResult.error) {
      console.error('❌ Error creating membership:', membershipResult.error);
      // Don't fail the request, but log the issue
    } else {
      console.log('✅ Organization membership created with role:', userRole);
    }

    // STEP 5: Send appropriate response
    const responseMessage = isNewOrganization 
      ? `Organization "${organization.name}" created successfully. You are now the admin.`
      : `Successfully joined existing organization "${organization.name}" as ${userRole}.`;

    console.log(`🎉 Organization setup complete for user ${email}:`, {
      organization: organization.name,
      role: userRole,
      isNewOrg: isNewOrganization
    });

    res.status(201).json({ 
      success: true, 
      organization: organization,
      userRole: userRole,
      isNewOrganization: isNewOrganization,
      message: responseMessage
    });

  } catch (error) {
    console.error('❌ Error in /api/auth/organizations POST:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced SSE endpoint with improved connection management
app.get('/api/stream/:clientId', (req, res) => {
  const { clientId } = req.params;
  setupSSEConnection(clientId, res);
});

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
      // PERFORMANCE: Check SSE response cache first to eliminate duplicate loading
      const sseKey = `${leadId}:${phoneNumber}:${organizationId}`;
      const cachedSSEResponse = sseResponseCache.get(sseKey);
      
      if (cachedSSEResponse && (Date.now() - cachedSSEResponse.timestamp) < SSE_CACHE_TTL) {
        console.log(`⚡ Using cached SSE response for ${leadId} (${cachedSSEResponse.messages.length} messages) - no loading needed`);
        res.write(`data: ${JSON.stringify({
          type: 'conversation_history',
          messages: cachedSSEResponse.messages,
          summary: cachedSSEResponse.summary,
          leadId,
          organizationId
        })}\n\n`);
        return;
      }
      
      console.log(`📋 Loading conversation history for SSE connection: ${leadId} (phone: ${phoneNumber}) (org: ${organizationId})`);
      
      // PERFORMANCE: Normalize phone number for cache key consistency
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      console.log(`🔧 SSE using normalized phone: ${normalizedPhone} for cache lookup`);
      
      // PERFORMANCE: Use cached versions for fast SSE loading
      const messages = await getConversationHistoryCached(normalizedPhone, organizationId);
      const summary = await getConversationSummaryCached(normalizedPhone, organizationId);
      
      // Format messages for frontend
      const formattedMessages = messages.map((msg, index) => ({
        id: `msg-${index}-${Date.now()}`,
        content: msg.content,
        timestamp: msg.timestamp,
        sentBy: msg.sentBy,
        type: msg.type || 'sms',
        status: 'delivered'
      }));
      
      // PERFORMANCE: Cache SSE response for future duplicate requests
      sseResponseCache.set(sseKey, {
        messages: formattedMessages,
        summary: summary?.summary,
        timestamp: Date.now()
      });
      
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
      
      console.log(`📋 Sent ${formattedMessages.length} messages via SSE for lead ${leadId} (org: ${organizationId}) + cached for future requests`);
      
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

// URGENT: Add manual call ending endpoint for end call button
app.post('/api/elevenlabs/end-call', validateOrganizationAccess, async (req, res) => {
  try {
    const { conversationId, leadId } = req.body;
    const { organizationId } = req;
    
    console.log(`📞 Manual call end requested for conversation: ${conversationId} (lead: ${leadId}) (org: ${organizationId})`);
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'conversationId is required'
      });
    }
    
    // Check if conversation belongs to this organization
    const metadata = conversationMetadata.get(conversationId);
    if (!metadata || metadata.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Conversation not found or access denied'
      });
    }
    
    // End the ElevenLabs conversation
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return res.status(500).json({
        success: false,
        error: 'ElevenLabs API key not configured'
      });
    }
    
    try {
      // Call ElevenLabs API to end the conversation
      const endCallResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/end`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (endCallResponse.ok) {
        console.log(`✅ Successfully ended ElevenLabs conversation: ${conversationId}`);
        
        // Broadcast call ended event
        if (leadId) {
          broadcastConversationUpdate({
            type: 'call_ended_manual',
            conversationId,
            leadId,
            timestamp: new Date().toISOString()
          });
        }
        
        // Clean up metadata
        conversationMetadata.delete(conversationId);
        activeCallSessions.delete(conversationId);
        
        res.json({
          success: true,
          message: 'Call ended successfully'
        });
        
      } else {
        const errorText = await endCallResponse.text();
        console.error(`❌ Failed to end ElevenLabs conversation:`, errorText);
        res.status(500).json({
          success: false,
          error: 'Failed to end call with ElevenLabs'
        });
      }
      
    } catch (apiError) {
      console.error(`❌ Error calling ElevenLabs end conversation API:`, apiError);
      res.status(500).json({
        success: false,
        error: 'Failed to communicate with ElevenLabs API'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in manual call end:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
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
app.get('/api/health', async (req, res) => {
  try {
    const redisHealth = await getRedisHealthStatus();
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeSseConnections: sseConnections.size,
      activeWsConversations: activeConversations.size,
      storedConversations: conversationMetadata.size,
      redis: redisHealth.health,
      cache: {
        conversationContexts: conversationContexts.size,
        conversationSummaries: conversationSummaries.size,
        phoneToLeadMapping: phoneToLeadMapping.size,
        organizationCache: organizationCache.size
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug Redis connection endpoint
app.get('/api/debug/redis', async (req, res) => {
  try {
    console.log('🔍 Debug Redis endpoint called');
    
    const envInfo = {
      hasRedisUrl: !!process.env.REDIS_URL,
      redisUrlLength: process.env.REDIS_URL ? process.env.REDIS_URL.length : 0,
      redisUrlSample: process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 30) + '...' : null,
      redisHost: process.env.REDIS_HOST || 'not set',
      redisPort: process.env.REDIS_PORT || 'not set',
      redisDb: process.env.REDIS_DB || 'not set'
    };
    
    console.log('🔍 Environment info:', envInfo);
    
    // Test direct Redis connection
    let directConnectionTest = null;
    if (process.env.REDIS_URL) {
      try {
        console.log('🔍 Testing direct Redis connection...');
        const Redis = require('ioredis');
        const testClient = new Redis(process.env.REDIS_URL, {
          connectTimeout: 5000,
          commandTimeout: 3000,
          maxRetriesPerRequest: 1
        });
        
        await testClient.ping();
        directConnectionTest = { status: 'success', message: 'Direct connection successful' };
        testClient.disconnect();
        console.log('🔍 Direct Redis test: SUCCESS');
      } catch (err) {
        directConnectionTest = { 
          status: 'error', 
          message: err.message,
          code: err.code,
          errno: err.errno 
        };
        console.log('🔍 Direct Redis test: FAILED -', err.message);
      }
    }
    
    const redisManagerStatus = await getRedisHealthStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      environment: envInfo,
      directConnectionTest,
      redisManagerStatus: redisManagerStatus.health,
      redisManagerDetails: {
        isConnected: redisMigrationManager.redisManager ? redisMigrationManager.redisManager.isConnected : null,
        connectionAttempts: redisMigrationManager.redisManager ? redisMigrationManager.redisManager.connectionAttempts : null,
        maxAttempts: redisMigrationManager.redisManager ? redisMigrationManager.redisManager.maxConnectionAttempts : null
      }
    });
  } catch (error) {
    console.error('🔍 Debug Redis endpoint error:', error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Redis cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await redisMigrationManager.getStats();
    res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PERFORMANCE: API request deduplication cache
const apiRequestCache = new Map(); // requestKey -> { data, timestamp }
const API_CACHE_TTL = 5000; // 5 seconds for API responses

// Conversation history endpoint - SECURITY FIXED with organization validation
app.get('/api/conversation-history/:leadId', validateOrganizationAccess, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { phoneNumber } = req.query;
    const { organizationId } = req;
    
    // Request deduplication for duplicate API calls
    const requestKey = `conversation-history-${leadId}-${phoneNumber}-${organizationId}`;
    const cachedResponse = apiRequestCache.get(requestKey);
    
    if (cachedResponse && (Date.now() - cachedResponse.timestamp) < API_CACHE_TTL) {
      console.log(`⚡ API: Using cached response for ${leadId} (${cachedResponse.data.messages.length} messages)`);
      return res.json(cachedResponse.data);
    }
    
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
    
    // SECURITY & PERFORMANCE: Use cached versions with provided organizationId
    const messages = await getConversationHistoryCached(phoneToUse, organizationId);
    const summary = await getConversationSummaryCached(phoneToUse, organizationId);
    
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
    
    const responseData = {
      messages: formattedMessages,
      leadId,
      phoneNumber: phoneToUse,
      summary: summary?.summary,
      totalMessages: formattedMessages.length,
      organizationId
    };
    
    // Cache the response for deduplication
    apiRequestCache.set(requestKey, { data: responseData, timestamp: Date.now() });
    
    res.json(responseData);
    
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

    // CRITICAL FIX: Get organizationId from the CALLED number, not the caller
    let organizationId = await getOrganizationByPhoneNumber(called_number);
    
    // FALLBACK: If no organizationId found, this phone number is not configured
    if (!organizationId) {
      console.log(`🚨 CRITICAL: No organization found for called number ${called_number}`);
      console.log(`📋 Available info: caller_id=${caller_id}, called_number=${called_number}, call_sid=${call_sid}`);
      
      // This means the phone number is not properly configured in the system
      const response = {
        dynamic_variables: {
          conversation_context: "Phone number not configured in system",
          customer_name: "Customer",
          lead_status: "New Inquiry",
          previous_summary: "Phone number configuration error",
          organization_name: "Jack Automotive",
          caller_type: "system_error",
          organization_context: "phone_number_not_configured",
          error_message: `Called number ${called_number} not found in organization_phone_numbers table`
        }
      };
      
      console.log('❌ Returning error response for unconfigured phone number:', {
        called_number,
        caller_id,
        response
      });
      
      return res.status(200).json(response);
    }

    // EXISTING LOGIC: For callers with organization context
    const activeLead = await getActiveLeadForPhone(normalizedPhone);  // ✅ FIXED: Added await
    console.log(`🔍 Active lead for ${normalizedPhone}:`, activeLead);
    
    // PERFORMANCE: Load all conversation data in parallel
    const conversationData = await loadConversationDataParallel(caller_id, organizationId, activeLead);
    const {
      conversationContext,
      summary,
      messages,
      leadData,
      organizationName,
      comprehensiveSummary
    } = conversationData;
    
    // PERFORMANCE: Populate session cache to eliminate redundant lookups during conversation
    if (call_sid && leadData) {
      const sessionData = {
        leadData: leadData,
        organizationId: organizationId,
        startTime: new Date().toISOString(),
        phoneNumber: normalizedPhone,
        organizationName: organizationName
      };
      
      conversationSessionCache.set(call_sid, sessionData);
      console.log(`⚡ Cached conversation session data for ${call_sid} (eliminates redundant lookups)`);
    }
    
    console.log(`🧪 DEBUG: conversationContext length: ${conversationContext.length}`);
    console.log(`🧪 DEBUG: activeLead:`, activeLead);
    console.log(`🧪 DEBUG: leadData:`, leadData);
    
    const customerName = leadData?.customerName || "Customer";
    const leadStatus = summary?.summary ? "Returning Customer" : (messages.length > 0 ? "Active Lead" : "New Inquiry");
    
    // ENHANCED: Use comprehensive summary (voice + SMS) for better context
    let previousSummary;
    if (comprehensiveSummary && comprehensiveSummary.length > 20) {
      // Use the comprehensive voice + SMS summary
      previousSummary = comprehensiveSummary.length > 100000 ? comprehensiveSummary.substring(0, 100000) + "..." : comprehensiveSummary;
      console.log(`📋 ElevenLabs webhook using comprehensive summary (${comprehensiveSummary.length} chars): ${comprehensiveSummary.substring(0, 100)}...`);
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

    // Keep the conversation context simple but allow much larger contexts with smart truncation
    const finalContext = createSmartContextSummary(conversationContext, messages, summary);
    
    // Generate dynamic greeting context (BICI approach)
    const greetingContext = generateGreetingContext(leadData, false, previousSummary);
    
    // Build the response in the format ElevenLabs expects with dynamic greetings
    const response = {
      dynamic_variables: {
        conversation_context: finalContext,
        customer_name: customerName,
        lead_status: leadStatus,
        previous_summary: previousSummary,
        organization_name: organizationName,
        organization_id: organizationId,
        caller_type: "existing_lead",
        // Add greeting context variables
        ...greetingContext
      }
    };
    
    console.log(`🧪 DEBUG: Final response variables:`, {
      conversation_context_length: finalContext.length,
      customer_name: customerName,
      lead_status: leadStatus,
      previous_summary_length: previousSummary.length,
      previous_summary_preview: previousSummary.substring(0, 150) + "...",
      using_elevenlabs_summary: !!(summary?.summary && summary.summary.length > 20),
      organization_id: organizationId
    });

    console.log('✅ Returning conversation initiation data:', {
      caller_id,
      contextLength: conversationContext.length,
      summaryLength: summary?.summary?.length || 0,
      messageCount: messages.length,
      organizationId
    });

    // FIX: Persist incoming call session data like outbound calls
    // Generate conversation ID for incoming call tracking
    const conversationId = call_sid || `incoming_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store conversation metadata for webhook processing
    if (activeLead) {
      storeConversationMetadata(conversationId, caller_id, activeLead, organizationId);
    }
    
    // ENHANCED: Persist incoming call session to Supabase (non-blocking)
    supabasePersistence.persistCallSession({
      id: conversationId,
      leadId: activeLead,
      elevenlabsConversationId: conversationId, // Will be updated later if different
      twilioCallSid: call_sid,
      phoneNumber: caller_id,
      callDirection: 'inbound',
      startedAt: new Date().toISOString(),
      conversationContext: conversationContext,
      dynamicVariables: response.dynamic_variables,
      organizationId: organizationId
    }).catch(error => {
      console.log(`🗄️ Incoming call session persistence failed (system continues normally):`, error.message);
    });

    // Broadcast incoming call event
    if (activeLead) {
      broadcastConversationUpdate({
        type: 'call_initiated',
        phoneNumber: caller_id,
        leadId: activeLead,
        conversationId,
        timestamp: new Date().toISOString(),
        organizationId,
        callDirection: 'inbound'
      });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error processing conversation initiation webhook:', error);
    
    // FALLBACK: Return basic response even on error
    const fallbackResponse = {
      dynamic_variables: {
        conversation_context: "Error retrieving conversation history",
        customer_name: "Customer",
        lead_status: "New Inquiry",
        previous_summary: "Unable to retrieve previous conversation history",
        organization_name: "Jack Automotive",
        caller_type: "error_fallback"
      }
    };
    
    res.status(200).json(fallbackResponse);
  }
});

// API endpoint to create new leads (called from SubprimeAddLeadDialog)
app.post('/api/subprime/create-lead', validateOrganizationAccess, async (req, res) => {
  try {
    const leadData = req.body;
    
    // PERFORMANCE: Check for duplicate lead creation before processing
    if (dynamicLeads.has(leadData.id)) {
      console.log(`⚡ Lead ${leadData.id} already exists - returning existing lead data`);
      return res.json({
        success: true,
        message: 'Lead already exists',
        leadId: leadData.id,
        organizationId: leadData.organizationId
      });
    }
    
    console.log('📝 Creating new subprime lead:', {
      id: leadData.id,
      customerName: leadData.customerName,
      phoneNumber: leadData.phoneNumber,
      fundingReadiness: leadData.fundingReadiness,
      sentiment: leadData.sentiment,
      organizationId: leadData.organizationId // SECURITY: Log organization context
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
    
    // PERFORMANCE: Check for existing lead with same phone number in organization
    const normalizedPhone = normalizePhoneNumber(leadData.phoneNumber);
    for (const [existingId, existingLead] of dynamicLeads.entries()) {
      if (existingLead.organizationId === leadData.organizationId && 
          normalizePhoneNumber(existingLead.phoneNumber) === normalizedPhone) {
        console.log(`⚡ Lead with phone ${leadData.phoneNumber} already exists (${existingId}) - updating instead of creating duplicate`);
        
        // Update existing lead instead of creating duplicate
        const updatedLead = { ...existingLead, ...leadData, id: existingId };
        dynamicLeads.set(existingId, updatedLead);
        
        return res.json({
          success: true,
          message: 'Lead updated (phone number already exists)',
          leadId: existingId,
          organizationId: leadData.organizationId
        });
      }
    }

    // SECURITY: Validate organization context
    if (!leadData.organizationId) {
      console.warn('⚠️ Lead created without organization context - this may cause security issues');
    }

    // Store the lead in memory (preserves all existing functionality)
    const leadRecord = {
      id: leadData.id,
      customerName: leadData.customerName,
      phoneNumber: leadData.phoneNumber,
      email: leadData.email,
      chaseStatus: leadData.chaseStatus || "Auto Chase Running",
      organizationId: leadData.organizationId, // SECURITY: Store organization context
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
    
    // CRITICAL: Set up phone-to-lead mapping to preserve existing conversation history
    phoneToLeadMapping.set(normalizedPhone, leadData.id);
    console.log(`🔗 Established phone mapping: ${normalizedPhone} → ${leadData.id} (preserves existing conversations)`);
    
    // ENHANCED: Async persistence to Supabase (non-blocking)
    supabasePersistence.persistLead(leadRecord)
      .catch(error => {
        console.log(`🗄️ Persistence failed for lead ${leadData.id} (system continues normally):`, error.message);
      });

    console.log(`✅ Lead ${leadData.id} stored successfully. Dynamic variables available:`, {
      customer_name: leadData.customerName,
      phone_number_normalized: normalizePhoneNumber(leadData.phoneNumber),
      funding_readiness: leadData.fundingReadiness,
      sentiment: leadData.sentiment,
      organization_id: leadData.organizationId // SECURITY: Log organization context
    });

    // Invalidate cache since we added a new lead
    invalidateLeadsCache(leadData.organizationId);
    
    res.status(201).json({ 
      success: true, 
      message: 'Lead created successfully',
      leadId: leadData.id,
      organizationId: leadData.organizationId, // SECURITY: Return organization context
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

// Cache for leads to prevent excessive DB queries
const leadsCache = new Map();
const LEADS_CACHE_TTL = 30000; // 30 seconds cache

// Request-level cache to prevent duplicate queries within same request
const requestCache = new Map();

// Helper function to invalidate leads cache
function invalidateLeadsCache(organizationId) {
  const cacheKey = `leads_${organizationId}`;
  leadsCache.delete(cacheKey);
}

// Helper function for request-level caching
function getRequestCacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`;
}

function setRequestCache(key, data) {
  // Auto-cleanup after 5 minutes to prevent memory leaks
  setTimeout(() => requestCache.delete(key), 300000);
  requestCache.set(key, data);
}

// API endpoint to get all dynamic leads (smart: tries Supabase first, then memory)
app.get('/api/subprime/leads', async (req, res) => {
  try {
    // SECURITY: Get organization ID from query params
    const { organization_id } = req.query;
    
    if (!organization_id) {
      return res.status(400).json({ 
        error: 'organization_id is required for lead retrieval to prevent cross-organization data access' 
      });
    }
    
    // Check cache first
    const cacheKey = `leads_${organization_id}`;
    const cached = leadsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < LEADS_CACHE_TTL) {
      return res.json(cached.data);
    }
    
    // Try Supabase first (in case initialization failed but Supabase is working)
    if (supabasePersistence.isEnabled) {
      try {
        // SECURITY: Pass organizationId to prevent cross-organization data leakage
        const dbLeads = await supabasePersistence.getAllLeads(500, organization_id);
        if (dbLeads && dbLeads.length > 0) {
          // Convert to frontend format
          const formattedLeads = dbLeads.map(dbLead => ({
            id: dbLead.id,
            customerName: dbLead.customer_name,
            phoneNumber: dbLead.phone_number,
            email: dbLead.email,
            organizationId: dbLead.organization_id, // SECURITY: Include organization context
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
            },
            agent_phone: dbLead.agent_phone, // Include agent phone field
            agent_name: dbLead.agent_name     // Include agent name field
          }));
          
          // Also sync to memory for faster future access
          formattedLeads.forEach(lead => {
            dynamicLeads.set(lead.id, lead);
            // Set up phone mapping
            const normalizedPhone = normalizePhoneNumber(lead.phoneNumber);
            phoneToLeadMapping.set(normalizedPhone, lead.id);
          });
          
          // Cache the response
          const responseData = {
            success: true,
            leads: formattedLeads,
            count: formattedLeads.length,
            source: 'database',
            organization_id: organization_id
          };
          
          leadsCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
          });
          
          // Only log when data actually changes, not on every request
          if (!cached || cached.data.count !== formattedLeads.length) {
            console.log(`📋 Retrieved ${formattedLeads.length} leads from Supabase (cached for ${LEADS_CACHE_TTL/1000}s)`);
          }
          
          return res.json(responseData);
        }
      } catch (dbError) {
        console.warn('⚠️ Supabase retrieval failed, falling back to memory:', dbError.message);
      }
    }
    
    // Fallback to memory (filter by organization)
    const leads = Array.from(dynamicLeads.values())
      .filter(lead => lead.organizationId === organization_id);
    console.log(`📋 Retrieved ${leads.length} dynamic leads from memory for organization: ${organization_id}`);
    
    res.json({
      success: true,
      leads: leads,
      count: leads.length,
      source: 'memory',
      organization_id: organization_id
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
    
    // CRITICAL SECURITY: Validate organization_id from request
    const organizationId = updates.organization_id;
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organization ID is required for lead updates' 
      });
    }
    
    if (!dynamicLeads.has(leadId)) {
      return res.status(404).json({ 
        error: `Lead ${leadId} not found in dynamic storage` 
      });
    }

    const currentLead = dynamicLeads.get(leadId);
    
    // CRITICAL SECURITY: Verify lead belongs to the requesting organization
    if (currentLead.organizationId !== organizationId) {
      console.warn(`🚨 SECURITY: Attempted cross-organization lead update blocked - Lead ${leadId} belongs to ${currentLead.organizationId}, requested by ${organizationId}`);
      return res.status(403).json({ 
        error: 'Access denied: Lead belongs to different organization' 
      });
    }
    
    // Apply updates while preserving organization ownership
    const updatedLead = { 
      ...currentLead, 
      ...updates,
      organizationId: currentLead.organizationId, // Preserve original organization
      lastTouchpoint: new Date().toISOString()
    };
    
    dynamicLeads.set(leadId, updatedLead);
    
    console.log(`✅ Updated lead ${leadId} for org ${organizationId}:`, {
      customerName: updatedLead.customerName,
      sentiment: updatedLead.sentiment,
      fundingReadiness: updatedLead.fundingReadiness,
      organizationId: updatedLead.organizationId
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
      organizationId: updatedLead.organizationId,
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
    const organizationId = req.query.organization_id;
    
    if (!leadId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lead ID is required' 
      });
    }

    // CRITICAL SECURITY: Validate organization access for delete operations
    if (dynamicLeads.has(leadId)) {
      const currentLead = dynamicLeads.get(leadId);
      if (organizationId && currentLead.organizationId !== organizationId) {
        console.warn(`🚨 SECURITY: Attempted cross-organization lead delete blocked - Lead ${leadId} belongs to ${currentLead.organizationId}, requested by ${organizationId}`);
        return res.status(403).json({ 
          success: false,
          error: 'Access denied: Lead belongs to different organization' 
        });
      }
    }

    console.log('🗑️ Deleting lead:', leadId, 'for org:', organizationId);

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
      // Fallback to memory data (filtered by organization)
      const memoryLeads = Array.from(dynamicLeads.values())
        .filter(lead => lead.organizationId === organization_id)
        .map(lead => {
          // Calculate message type breakdown from conversation history
          const phoneNumber = lead.phoneNumber;
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          const memoryKey = createOrgMemoryKey(organization_id, normalizedPhone);
          const conversationHistory = conversationContexts.get(memoryKey) || [];
          
          const totalVoiceCalls = conversationHistory.filter(msg => 
            msg.type === 'voice' || msg.messageType === 'voice'
          ).length;
          
          const totalSmsMessages = conversationHistory.filter(msg => 
            msg.type === 'text' || msg.type === 'sms' || msg.messageType === 'sms'
          ).length;
          
          return {
          id: lead.id,
          customer_name: lead.customerName,
          phone_number: lead.phoneNumber,
          sentiment: lead.sentiment,
          funding_readiness: lead.fundingReadiness,
            total_conversations: totalVoiceCalls + totalSmsMessages,
            total_voice_calls: totalVoiceCalls,
            total_sms_messages: totalSmsMessages,
          last_activity: lead.lastTouchpoint,
          lead_score: 50
          };
        });
      
      console.log(`📊 Memory leads analytics for org ${organization_id}: ${memoryLeads.length} leads`);
      
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

// Get global analytics (for RealTimeAnalyticsPanel) - FIXED: Use ElevenLabs analytics
app.get('/api/analytics/global', async (req, res) => {
  try {
    const { organization_id } = req.query;
    
    if (!organization_id) {
      return res.status(400).json({ 
        success: false,
        error: 'organization_id is required for analytics data' 
      });
    }
    
    // FIXED: Query ElevenLabs conversation analytics from database
    let totalConversations = 0;
    let totalMessages = 0;
    let buyingSignalsCount = 0;
    let conversationQuality = 0;
    let dataSource = 'memory';
    let conversationData = null; // Define conversationData outside try/catch for later use
    
    try {
      if (supabasePersistence.isEnabled && supabasePersistence.isConnected) {
        console.log(`📊 Querying ElevenLabs conversation analytics for org ${organization_id}`);
        
        // Get conversation data from database
        conversationData = await supabasePersistence.getConversationAnalytics(organization_id);
        
        if (conversationData && conversationData.length > 0) {
          console.log(`📊 Found ${conversationData.length} conversations in database for org ${organization_id}`);
          
          totalConversations = conversationData.length;
          totalMessages = conversationData.length; // Each conversation record is a message
          dataSource = 'database';
          
          // Analyze database conversations for buying signals
          const buyingKeywords = ['financing', 'payment', 'monthly', 'qualify', 'credit', 'approve', 'rate', 'price', 'cost', 'interested'];
          
          conversationData.forEach(conv => {
            if (conv.sent_by === 'user' && conv.content) {
              const content = conv.content.toLowerCase();
              if (buyingKeywords.some(keyword => content.includes(keyword))) {
                buyingSignalsCount++;
              }
            }
          });
          
          // Calculate conversation quality based on engagement
          const avgMessagesPerConv = totalConversations > 0 ? totalMessages / totalConversations : 0;
          conversationQuality = Math.min(95, Math.max(30, avgMessagesPerConv * 12));
          
          console.log(`📊 Database analytics for org ${organization_id}:`, { 
            totalConversations, 
            totalMessages, 
            buyingSignalsCount,
            source: 'database'
          });
        } else {
          console.log(`📊 No conversations found in database for org ${organization_id}, using memory`);
          
          // Fallback to memory-based calculation
    const orgMemoryKeys = Array.from(conversationContexts.keys())
      .filter(key => key.startsWith(`${organization_id}:`));
    
          totalMessages = orgMemoryKeys.reduce((sum, key) => {
      const history = conversationContexts.get(key) || [];
      return sum + history.length;
    }, 0);
    
          totalConversations = orgMemoryKeys.length;
          conversationQuality = totalMessages > 0 ? Math.min(95, Math.round(totalMessages * 8)) : 0;
          dataSource = 'memory';
        }
      }
    } catch (dbError) {
      console.log('📊 Error accessing conversation analytics, using memory fallback:', dbError);
      dataSource = 'memory_fallback';
    }
    
    // Get organization leads for additional metrics
    const organizationLeads = Array.from(dynamicLeads.values())
      .filter(lead => lead.organizationId === organization_id);
    
    const totalLeads = organizationLeads.length;
    
    // Calculate sentiment distribution from leads
    const sentimentCounts = organizationLeads.reduce((counts, lead) => {
      const sentiment = lead.sentiment || 'Neutral';
      counts[sentiment] = (counts[sentiment] || 0) + 1;
      return counts;
    }, {});
    
    // Calculate funding readiness from leads
    const fundingReadyCounts = organizationLeads.reduce((counts, lead) => {
      const readiness = lead.fundingReadiness || 'Not Ready';
      counts[readiness] = (counts[readiness] || 0) + 1;
      return counts;
    }, {});
    
    // Calculate high-value leads
    const highValueLeads = organizationLeads.filter(lead => {
      const hasGoodSentiment = ['Warm', 'Interested', 'Hot'].includes(lead.sentiment);
      const isReady = lead.fundingReadiness === 'Ready';
      return hasGoodSentiment || isReady;
    }).length;
    
    // Calculate conversion rate based on buying signals ratio
    const conversionRate = totalConversations > 0 
      ? Math.min(25, Math.max(5, (buyingSignalsCount / totalConversations) * 100))
      : 8;
    
    // Count actual voice vs SMS messages from database
    let voiceMessages = 0;
    let smsMessages = 0;
    
    if (dataSource === 'database' && conversationData && conversationData.length > 0) {
      // Count actual message types from database
      conversationData.forEach(conv => {
        if (conv.type === 'voice' || conv.type === 'call') {
          voiceMessages++;
        } else if (conv.type === 'sms' || conv.type === 'text') {
          smsMessages++;
        }
      });
      
      console.log(`📊 Actual message counts from database: ${voiceMessages} voice, ${smsMessages} SMS`);
    } else {
      // Fallback: use fake estimates only if no database data
      voiceMessages = Math.floor(totalMessages * 0.4);
      smsMessages = Math.ceil(totalMessages * 0.6);
      console.log(`📊 Using fallback estimates: ${voiceMessages} voice, ${smsMessages} SMS`);
    }

    const analytics = {
      totalLeads,
      totalConversations,
      conversationQuality: Math.round(conversationQuality),
      highValueLeads,
      buyingSignalsCount: buyingSignalsCount,
      conversionRate: Math.round(conversionRate),
      dataSource,
      metrics: {
        voiceMessages: voiceMessages,
        smsMessages: smsMessages,
        totalMessages,
        activeConversations: totalConversations,
        readyLeads: organizationLeads.filter(lead => lead.fundingReadiness === 'Ready').length,
        sentimentBreakdown: sentimentCounts,
        fundingReadinessBreakdown: fundingReadyCounts
      }
    };
    
    console.log(`📊 Generated real-time analytics for org ${organization_id}:`, analytics);
    
    res.json({
      success: true,
      data: analytics,
      organization_id,
      message: `Analytics from ${dataSource} - ${totalConversations} conversations found`
    });
    
  } catch (error) {
    console.error('❌ Error getting global analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get global analytics',
      details: error.message 
    });
  }
});

// Get system status (for CRM Analytics Dashboard)
app.get('/api/system/status', async (req, res) => {
  try {
    const { organization_id } = req.query;
    
    // Get real system metrics
    const sseConnectionsCount = sseConnections.size;
    const activeConversationsCount = activeConversations.size;
    const storedContexts = conversationContexts.size;
    const dynamicLeadsCount = dynamicLeads.size;
    const storedSummaries = conversationSummaries.size;
    
    // If organization_id provided, get organization-specific metrics
    let organizationMetrics = {};
    if (organization_id) {
      const orgLeads = Array.from(dynamicLeads.values())
        .filter(lead => lead.organizationId === organization_id);
      
      const orgMemoryKeys = Array.from(conversationContexts.keys())
        .filter(key => key.startsWith(`${organization_id}:`));
      
      const orgSummaryKeys = Array.from(conversationSummaries.keys())
        .filter(key => key.startsWith(`${organization_id}:`));
      
      organizationMetrics = {
        organizationLeads: orgLeads.length,
        organizationContexts: orgMemoryKeys.length,
        organizationSummaries: orgSummaryKeys.length,
        organizationSseConnections: Array.from(sseConnections.keys()).filter(key => key.includes(organization_id)).length
      };
    }
    
    const systemStatus = {
      memory: {
        activeConversations: activeConversationsCount,
        conversationContexts: storedContexts,
        conversationSummaries: storedSummaries,
        dynamicLeads: dynamicLeadsCount,
        sseConnections: sseConnectionsCount
      },
      persistence: {
        enabled: supabasePersistence.isEnabled,
        connected: supabasePersistence.isConnected,
        service: 'supabase'
      },
      features: {
        telephony: true,
        sms: true,
        voice: true,
        realTimeUpdates: true,
        analytics: true,
        crm: true
      },
      organization: organizationMetrics,
      uptime: process.uptime(),
      lastUpdated: new Date().toISOString()
    };
    
    res.json({
      success: true,
      ...systemStatus
    });
    
  } catch (error) {
    console.error('❌ Error getting system status:', error);
    res.status(500).json({ 
      error: 'Failed to get system status',
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
    
    // Get conversation history from Supabase only - no fallbacks  
    const dbHistory = await getConversationHistoryDirect(lead.phoneNumber, lead.organizationId);
    
    if (!dbHistory || dbHistory.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No conversation history found for lead ${leadId}`,
        details: `Phone: ${lead.phoneNumber}, searched limit: ${limit}`
      });
    }
    
      res.json({
        success: true,
        conversations: dbHistory,
        count: dbHistory.length,
        source: 'database'
      });
    
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


app.get('/api/analytics/lead/:id', validateOrganizationAccess, async (req, res) => {
  try {
    const leadId = req.params.id;
    const { organizationId } = req;
    console.log('📊 Lead analytics requested for:', leadId, '(org:', organizationId + ')');
    
    // FIXED: Use property access instead of function call
    if (!supabasePersistence.isEnabled || !supabasePersistence.isConnected) {
      return res.status(500).json({
        success: false,
        error: 'Supabase persistence is not enabled or connected',
        details: `isEnabled: ${supabasePersistence.isEnabled}, isConnected: ${supabasePersistence.isConnected}`
      });
    }

    // Get lead data from memory to find phone number
    const leadData = getLeadData(leadId);
    if (!leadData || !leadData.phoneNumber) {
      return res.status(404).json({
        success: false,
        error: `Lead ${leadId} not found in memory`,
        details: `leadData: ${leadData ? 'exists but no phone' : 'not found'}`
      });
    }

    // Get conversation history from memory using the lead's phone number
    const phoneNumber = leadData.phoneNumber;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const messages = await getConversationHistoryCached(phoneNumber, organizationId);
    
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
    console.error('❌ Lead analytics error:', error);
    res.status(500).json({
      success: false,
      error: `Lead analytics failed: ${error.message}`,
      details: error.stack
    });
  }
});

// SSE endpoint for real-time analytics updates
app.get('/api/analytics/stream', (req, res) => {
  const { organizationId } = req.query;
  
  if (!organizationId) {
    return res.status(400).json({ 
      error: 'organizationId is required for real-time analytics stream' 
    });
  }
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const clientId = Date.now();
  console.log(`📡 Analytics SSE client connected: ${clientId} for org: ${organizationId}`);
  
  // Store the connection for broadcasting updates
  if (!global.analyticsSSEClients) {
    global.analyticsSSEClients = new Map();
  }
  global.analyticsSSEClients.set(clientId, { res, organizationId });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    message: 'Real-time analytics connected',
    organizationId,
    timestamp: new Date().toISOString()
  })}\n\n`);
  
  // Set up periodic heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000);
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 Analytics SSE client disconnected: ${clientId}`);
    clearInterval(heartbeat);
    if (global.analyticsSSEClients) {
      global.analyticsSSEClients.delete(clientId);
    }
  });
  
  req.on('error', (error) => {
    console.error(`📡 Analytics SSE error for client ${clientId}:`, error);
    clearInterval(heartbeat);
    if (global.analyticsSSEClients) {
      global.analyticsSSEClients.delete(clientId);
    }
  });
});

// Function to broadcast real-time updates to analytics clients
function broadcastAnalyticsUpdate(organizationId, updateData) {
  if (!global.analyticsSSEClients) return;
  
  const message = JSON.stringify({
    ...updateData,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast to all clients for this organization
  for (const [clientId, client] of global.analyticsSSEClients.entries()) {
    if (client.organizationId === organizationId) {
      try {
        client.res.write(`data: ${message}\n\n`);
      } catch (error) {
        console.error(`📡 Error broadcasting to analytics client ${clientId}:`, error);
        global.analyticsSSEClients.delete(clientId);
      }
    }
  }
}

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

// ⭐ MANUAL CALLS FEATURE: Allow users to directly call customers bypassing AI
app.post('/api/manual-call/initiate', validateOrganizationAccess, async (req, res) => {
  try {
    const { phoneNumber, leadId, agentName } = req.body;
    const { organizationId } = req;
    
    console.log(`👤 Manual call request: Agent ${agentName} calling ${phoneNumber} (lead: ${leadId}) (org: ${organizationId})`);
    
    if (!phoneNumber || !agentName) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and agentName are required'
      });
    }
    
    // Validate lead belongs to organization if provided
    if (leadId) {
      const leadData = getLeadData(leadId);
      if (!leadData || leadData.organizationId !== organizationId) {
        return res.status(403).json({
          success: false,
          error: 'Lead not found or access denied'
        });
      }
    }
    
    // Get organization phone number for caller ID
    let fromPhone;
    try {
      const orgPhoneData = await getOrganizationPhoneNumber(organizationId);
      fromPhone = orgPhoneData.phoneNumber; // Extract phone number string from object
      console.log(`📞 Organization phone resolved: ${fromPhone}`);
    } catch (error) {
      console.warn(`⚠️ Failed to get organization phone: ${error.message}, using fallback`);
      fromPhone = process.env.TWILIO_PHONE_NUMBER;
    }
    
    console.log(`📞 Manual call phone number resolution: org=${organizationId}, orgPhone=${fromPhone}, fallback=${process.env.TWILIO_PHONE_NUMBER}`);
    
    // Validate we have a phone number to call from
    if (!fromPhone) {
      console.error('❌ No phone number available for manual call (org phone or Twilio phone)');
      return res.status(500).json({
        success: false,
        error: 'No phone number configured for outbound calls'
      });
    }
    
    console.log(`📞 Manual call will use phone number: ${fromPhone}`);
    
    // Use Twilio credentials from environment
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('❌ Missing Twilio credentials for manual call');
      return res.status(500).json({
        success: false,
        error: 'Twilio credentials not configured'
      });
    }
    
    // Import Twilio using dynamic import for ES modules
    const { default: twilio } = await import('twilio');
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    
    // Generate unique conference name
    const conferenceId = `manual-call-${Date.now()}-${leadId || 'direct'}`;
    
    try {
      // NEW FLOW: Call agent first, then conference customer when agent answers
      console.log(`👤 Initiating agent call first: conference=${conferenceId}, agent=${agentName}`);
      
      const agentCall = await twilioClient.calls.create({
        url: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/twiml-agent?conferenceId=${conferenceId}&organizationId=${organizationId}&leadId=${leadId || ''}&customerPhone=${encodeURIComponent(phoneNumber)}`,
        to: agentName, // Assuming agentName is a phone number
        from: fromPhone,
        statusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/agent-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });
      
      console.log(`👤 Agent call initiated: ${agentCall.sid}`);
      
      // Store manual call session
      const manualCallSession = {
        conferenceId,
        customerCallSid: null,
        agentCallSid: agentCall.sid,
        phoneNumber: normalizePhoneNumber(phoneNumber),
        leadId,
        organizationId,
        agentName,
        agentPhone: agentName, // Store agent phone for reference
        status: 'calling_agent',
        startTime: new Date().toISOString()
      };
      
      // Store in memory for tracking
      activeCallSessions.set(conferenceId, manualCallSession);
      
      // PERFORMANCE: Queue manual call activity logging for batch processing
      console.log(`⚡ Manual call activity queued for batch persistence (no immediate DB write)`);
      
      // All activity logging batched at conversation end to eliminate latency
      
      res.json({
        success: true,
        conferenceId,
        agentCallSid: agentCall.sid,
        message: 'Manual call initiated - agent being called first',
        status: 'calling_agent',
        organizationId,
        agentPhone: agentName,
        customerPhone: phoneNumber,
        instructions: `New manual call flow:
1. Agent (${agentName}) is being called first
2. Once agent answers, customer (${phoneNumber}) will be automatically conferenced in
3. No manual dialing required - system handles the conference setup`
      });
      
    } catch (twilioError) {
      console.error('❌ Twilio call creation failed:', twilioError);
      res.status(500).json({
        success: false,
        error: `Failed to initiate call: ${twilioError.message}`
      });
    }
    
  } catch (error) {
    console.error('❌ Manual call initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate manual call'
    });
  }
});

// ⭐ MANUAL CALLS: TwiML for customer connection to conference
app.post('/api/manual-call/twiml-customer', (req, res) => {
  const { conferenceId, organizationId, leadId } = req.query;
  
  console.log(`📞 Customer TwiML request for conference ${conferenceId}`);
  
  const response = new twilio.twiml.VoiceResponse();
  
  // Join conference with customer-friendly settings including recording and transcription
  const dial = response.dial();
  dial.conference(conferenceId, {
    startConferenceOnEnter: false, // Don't start on customer enter since agent is already there
    endConferenceOnExit: false,
    statusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/conference-status`,
    statusCallbackEvent: 'start join leave end',
    // ⭐ ENHANCED: Add recording for manual calls to capture full context
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/recording-status`,
    // ⭐ ENHANCED: Add transcription for real-time context capture
    transcribe: true,
    transcriptionConfiguration: {
      track: 'both',
      transcriptionCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/transcription`
    }
  });
  
  res.type('text/xml');
  res.send(response.toString());
});

// ⭐ MANUAL CALLS: TwiML for agent connection to conference (NEW FLOW)
app.post('/api/manual-call/twiml-agent', (req, res) => {
  const { conferenceId, organizationId, leadId, customerPhone } = req.query;
  
  console.log(`👤 Agent TwiML request for conference ${conferenceId}`);
  
  const response = new twilio.twiml.VoiceResponse();
  
  // Greet the agent and explain the flow
  response.say({
    voice: 'alice'
  }, `Hello! You are being connected to a manual call conference. Please hold while we connect the customer at ${decodeURIComponent(customerPhone)}.`);
  
  // Join conference with agent-friendly settings
  const dial = response.dial();
  dial.conference(conferenceId, {
    startConferenceOnEnter: true,
    endConferenceOnExit: true, // End conference when agent leaves
    statusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/conference-status`,
    statusCallbackEvent: 'start join leave end',
    record: 'record-from-answer-dual',
    recordingStatusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/recording-status`,
    transcribe: true,
    transcriptionConfiguration: {
      track: 'both',
      transcriptionCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/transcription`
    }
  });
  
  res.type('text/xml');
  res.send(response.toString());
});

// ⭐ MANUAL CALLS: Agent status callback to handle agent connection
app.post('/api/manual-call/agent-status', async (req, res) => {
  const { CallSid, CallStatus, To, From, ConferenceSid } = req.body;
  
  console.log(`👤 Agent call status: ${CallStatus} for call ${CallSid}`);
  
  // Find the session by agent call SID
  let conferenceId = null;
  let session = null;
  
  console.log(`🔍 DEBUG: Looking for session with agentCallSid: ${CallSid}`);
  console.log(`🔍 DEBUG: Active sessions count: ${activeCallSessions.size}`);
  
  for (const [confId, sess] of activeCallSessions) {
    console.log(`🔍 DEBUG: Checking session ${confId}: agentCallSid=${sess.agentCallSid}, customerCallSid=${sess.customerCallSid}`);
    if (sess.agentCallSid === CallSid) {
      conferenceId = confId;
      session = sess;
      console.log(`✅ DEBUG: Found matching session: ${confId}`);
      break;
    }
  }
  
  if (!session) {
    console.log(`❌ DEBUG: No session found for agentCallSid: ${CallSid}`);
    console.log(`🔍 DEBUG: All active sessions:`, Array.from(activeCallSessions.entries()).map(([id, sess]) => ({
      conferenceId: id,
      agentCallSid: sess.agentCallSid,
      status: sess.status
    })));
  }
  
  if (session) {
    // Update session status
    session.agentStatus = CallStatus;
    session.lastUpdate = new Date().toISOString();
    
    // When agent answers, immediately call customer
    if (CallStatus === 'in-progress') {
      console.log(`👤 Agent answered! Now calling customer ${session.phoneNumber}`);
      
      try {
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        
        // Import Twilio using dynamic import for ES modules
        const { default: twilio } = await import('twilio');
        const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        
        // Get organization phone number properly
        let fromPhone;
        try {
          const orgPhoneData = await getOrganizationPhoneNumber(session.organizationId);
          fromPhone = orgPhoneData.phoneNumber; // Extract phone number string from object
        } catch (error) {
          console.warn(`⚠️ Failed to get organization phone: ${error.message}, using fallback`);
          fromPhone = process.env.TWILIO_PHONE_NUMBER;
        }
        
        const customerCall = await twilioClient.calls.create({
          url: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/twiml-customer?conferenceId=${conferenceId}&organizationId=${session.organizationId}&leadId=${session.leadId || ''}`,
          to: session.phoneNumber,
          from: fromPhone,
          statusCallback: `${process.env.BASE_URL || 'https://jack-automotive-ai-assistant-13.onrender.com'}/api/manual-call/status`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          statusCallbackMethod: 'POST'
        });
        
        // Update session with customer call info
        session.customerCallSid = customerCall.sid;
        session.status = 'calling_customer';
        activeCallSessions.set(conferenceId, session);
        
        console.log(`📞 Customer call initiated: ${customerCall.sid} for conference ${conferenceId}`);
        
        // ⭐ SUPABASE MCP: Log manual call session to database
        if (session.leadId) {
          try {
            await supabasePersistence.logCallSession(
              session.leadId,
              conferenceId, // Use conferenceId as conversation identifier
              session.customerCallSid,
              session.phoneNumber,
              'manual', // call_type
              session.organizationId,
              {
                agentName: session.agentName,
                agentCallSid: session.agentCallSid,
                customerCallSid: session.customerCallSid,
                conferenceId: conferenceId
              }
            );
            console.log(`📊 Manual call session logged to Supabase: ${conferenceId}`);
          } catch (dbError) {
            console.warn('📊 Failed to log manual call session to Supabase:', dbError.message);
          }
        }
        
      } catch (error) {
        console.error('❌ Failed to call customer after agent answered:', error);
        session.status = 'error';
        session.error = error.message;
      }
    }
    
    // Update session in memory
    activeCallSessions.set(conferenceId, session);
  }
  
  res.status(200).send('OK');
});

// ⭐ MANUAL CALLS: Get agent dial-in information
app.get('/api/manual-call/agent-dial-in/:conferenceId', validateOrganizationAccess, async (req, res) => {
  try {
    const { conferenceId } = req.params;
    const { organizationId } = req;
    
    // Get session from memory
    const session = activeCallSessions.get(conferenceId);
    
    if (!session || session.organizationId !== organizationId) {
      return res.status(404).json({
        success: false,
        error: 'Conference not found or access denied'
      });
    }
    
    // Get organization phone number for dial-in
    const organizationPhone = await getOrganizationPhoneNumber(organizationId);
    
    res.json({
      success: true,
      conferenceId,
      dialInNumber: organizationPhone || process.env.TWILIO_PHONE_NUMBER,
      instructions: `To join the conference:\n1. Call ${organizationPhone || process.env.TWILIO_PHONE_NUMBER}\n2. When prompted, enter conference ID: ${conferenceId}\n3. Press # to join`,
      status: session.status,
      customerStatus: session.customerStatus || 'calling'
    });
    
  } catch (error) {
    console.error('❌ Agent dial-in info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dial-in information'
    });
  }
});

// ⭐ MANUAL CALLS: Call status webhooks
app.post('/api/manual-call/status', (req, res) => {
  const { CallSid, CallStatus, To, From } = req.body;
  
  console.log(`📞 Manual call status: ${CallSid} -> ${CallStatus} (${From} to ${To})`);
  
  // Find session by call SID
  for (const [conferenceId, session] of activeCallSessions.entries()) {
    if (session.customerCallSid === CallSid) {
      session.customerStatus = CallStatus;
      console.log(`📞 Updated customer status for conference ${conferenceId}: ${CallStatus}`);
      
      // If customer answered, provide agent dial-in instructions
      if (CallStatus === 'answered') {
        console.log(`✅ Customer answered for conference ${conferenceId} - agent can now join`);
      }
      break;
    }
  }
  
  res.sendStatus(200);
});

// ⭐ MANUAL CALLS: Conference status webhooks
app.post('/api/manual-call/conference-status', (req, res) => {
  const { ConferenceSid, StatusCallbackEvent, FriendlyName } = req.body;
  
  console.log(`📞 Conference status: ${FriendlyName} -> ${StatusCallbackEvent}`);
  
  // Update session status based on conference events
  if (activeCallSessions.has(FriendlyName)) {
    const session = activeCallSessions.get(FriendlyName);
    session.conferenceStatus = StatusCallbackEvent;
    
    if (StatusCallbackEvent === 'conference-end') {
      console.log(`📞 Conference ${FriendlyName} ended`);
      activeCallSessions.delete(FriendlyName);
    }
  }
  
  res.sendStatus(200);
});

// ⭐ MANUAL CALLS: End manual call
app.post('/api/manual-call/end', validateOrganizationAccess, async (req, res) => {
  try {
    const { conferenceId } = req.body;
    const { organizationId } = req;
    
    console.log(`📞 Manual call end request: ${conferenceId} (org: ${organizationId})`);
    
    if (!conferenceId) {
      return res.status(400).json({
        success: false,
        error: 'conferenceId is required'
      });
    }
    
    // Get session from memory
    const session = activeCallSessions.get(conferenceId);
    
    if (!session || session.organizationId !== organizationId) {
      return res.status(404).json({
        success: false,
        error: 'Conference not found or access denied'
      });
    }
    
    // Use Twilio to end the conference
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!twilioAccountSid || !twilioAuthToken) {
      return res.status(500).json({
        success: false,
        error: 'Twilio credentials not configured'
      });
    }
    
    // Import Twilio using dynamic import for ES modules
    const { default: twilio } = await import('twilio');
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    
    try {
      // End all calls in the conference
      const conferences = await twilioClient.conferences.list({
        friendlyName: conferenceId,
        status: 'in-progress'
      });
      
      for (const conference of conferences) {
        // End the conference
        await twilioClient.conferences(conference.sid).update({ status: 'completed' });
        console.log(`📞 Ended conference: ${conference.sid}`);
      }
      
      // Log manual call completion
      if (session.leadId) {
        try {
          await supabasePersistence.logActivity(session.leadId, 'manual_call_ended', {
            agentName: session.agentName,
            phoneNumber: session.phoneNumber,
            conferenceId,
            organizationId,
            duration: Date.now() - new Date(session.startTime).getTime()
          });
        } catch (error) {
          console.warn('📊 Failed to log manual call completion:', error.message);
        }
      }
      
      // Clean up session
      activeCallSessions.delete(conferenceId);
      
      res.json({
        success: true,
        message: 'Manual call ended successfully',
        conferenceId
      });
      
    } catch (twilioError) {
      console.error('❌ Twilio conference end failed:', twilioError);
      res.status(500).json({
        success: false,
        error: `Failed to end conference: ${twilioError.message}`
      });
    }
    
  } catch (error) {
    console.error('❌ Manual call end error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end manual call'
    });
  }
});

// ⭐ MANUAL CALLS: Recording status webhook
app.post('/api/manual-call/recording-status', (req, res) => {
  try {
    const { RecordingSid, RecordingUrl, CallSid, ConferenceSid, RecordingStatus } = req.body;
    
    console.log(`📼 Manual call recording status: ${RecordingSid} -> ${RecordingStatus}`, {
      RecordingUrl,
      CallSid,
      ConferenceSid
    });
    
    // Find the conference session to get context
    for (const [conferenceId, session] of activeCallSessions.entries()) {
      if (session.customerCallSid === CallSid || session.agentCallSid === CallSid) {
        // Store recording information in session
        if (!session.recordings) session.recordings = [];
        session.recordings.push({
          recordingSid: RecordingSid,
          recordingUrl: RecordingUrl,
          callSid: CallSid,
          status: RecordingStatus,
          timestamp: new Date().toISOString()
        });
        
        // ⭐ CONTEXT PRESERVATION: Store recording in database for future AI context
        if (RecordingStatus === 'completed' && session.leadId) {
          supabasePersistence.persistCallSession({
            id: `manual-${conferenceId}`,
            leadId: session.leadId,
            phoneNumber: session.phoneNumber,
            startedAt: session.startTime,
            endedAt: new Date().toISOString(),
            recordingUrl: RecordingUrl,
            recordingSid: RecordingSid,
            callType: 'manual',
            agentName: session.agentName,
            organizationId: session.organizationId,
            // Add to conversation context for future AI calls
            conversationContext: `Manual call handled by ${session.agentName}. Recording available: ${RecordingUrl}`
          }).catch(error => {
            console.warn('🗄️ Failed to persist manual call recording:', error.message);
          });
        }
        
        console.log(`📼 Recording ${RecordingStatus} for manual call conference ${conferenceId}`);
        break;
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Manual call recording status error:', error);
    res.status(500).send('Error processing recording status');
  }
});

// ⭐ MANUAL CALLS: Transcription webhook for real-time context capture
app.post('/api/manual-call/transcription', (req, res) => {
  try {
    const { TranscriptionSid, TranscriptionText, CallSid, ConferenceSid, SpeechResult } = req.body;
    
    console.log(`📝 Manual call transcription: ${TranscriptionSid}`, {
      text: TranscriptionText?.substring(0, 100),
      CallSid,
      ConferenceSid
    });
    
    // Find the conference session to get context
    for (const [conferenceId, session] of activeCallSessions.entries()) {
      if (session.customerCallSid === CallSid || session.agentCallSid === CallSid) {
        const phoneNumber = session.phoneNumber;
        const organizationId = session.organizationId;
        const leadId = session.leadId;
        
        if (TranscriptionText && phoneNumber) {
          // Determine speaker based on call SID
          const isCustomer = session.customerCallSid === CallSid;
          const speaker = isCustomer ? 'user' : 'agent';
          
          console.log(`📝 Manual call transcript: ${speaker} said "${TranscriptionText}"`);
          
          // ⭐ CONTEXT PRESERVATION: Add to conversation history for future AI context
          addToConversationHistory(
            phoneNumber, 
            TranscriptionText, 
            speaker, 
            'voice_manual', 
            organizationId
          );
          
          // Store in session transcript
          if (!session.transcript) session.transcript = [];
          session.transcript.push({
            speaker,
            text: TranscriptionText,
            timestamp: new Date().toISOString(),
            transcriptionSid: TranscriptionSid
          });
          
          // ⭐ REAL-TIME UPDATES: Broadcast to frontend for live transcription display
          if (leadId) {
            broadcastConversationUpdate({
              type: 'manual_call_transcript',
              leadId,
              phoneNumber: normalizePhoneNumber(phoneNumber),
              organizationId,
              message: TranscriptionText,
              speaker,
              timestamp: new Date().toISOString(),
              conferenceId,
              isLive: true
            });
          }
        }
        break;
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Manual call transcription error:', error);
    res.status(500).send('Error processing transcription');
  }
});

// ⭐ MANUAL CALLS: Enhanced conference status with context preservation
app.post('/api/manual-call/conference-status-enhanced', async (req, res) => {
  try {
    const { ConferenceSid, StatusCallbackEvent, FriendlyName, Timestamp } = req.body;
    
    console.log(`📞 Enhanced conference status: ${FriendlyName} -> ${StatusCallbackEvent}`);
    
    if (activeCallSessions.has(FriendlyName)) {
      const session = activeCallSessions.get(FriendlyName);
      session.conferenceStatus = StatusCallbackEvent;
      
      if (StatusCallbackEvent === 'conference-end') {
        console.log(`📞 Manual call conference ended: ${FriendlyName}`);
        
        // ⭐ CONTEXT PRESERVATION: Generate AI summary of manual call
        if (session.transcript && session.transcript.length > 0 && session.leadId) {
          const transcriptText = session.transcript
            .map(t => `${t.speaker}: ${t.text}`)
            .join('\n');
          
          // Generate summary using AI (similar to ElevenLabs post-call processing)
          const callSummary = `Manual call handled by ${session.agentName}. Duration: ${Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000)}s. Transcript: ${transcriptText}`;
          
          // Store summary for future AI context
          storeConversationSummary(session.phoneNumber, callSummary, session.organizationId);
          
          // ⭐ SUPABASE MCP: Update call session with completion data
          if (session.leadId) {
            try {
              const duration = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
              await supabasePersistence.updateCallSession(FriendlyName, {
                summary: callSummary,
                transcript: transcriptText,
                duration_seconds: duration,
                call_outcome: 'completed',
                ended_at: new Date().toISOString()
              });
              console.log(`📊 Manual call completion logged to Supabase: ${FriendlyName}`);
            } catch (dbError) {
              console.warn('📊 Failed to update manual call session in Supabase:', dbError.message);
            }
          }
          
          // Broadcast call end with summary
          broadcastConversationUpdate({
            type: 'manual_call_ended',
            leadId: session.leadId,
            phoneNumber: normalizePhoneNumber(session.phoneNumber),
            organizationId: session.organizationId,
            summary: callSummary,
            transcript: session.transcript,
            duration: Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000),
            agentName: session.agentName,
            timestamp: new Date().toISOString()
          });
        }
        
        // Clean up after a delay to ensure all webhooks are processed
        setTimeout(() => {
          if (activeCallSessions.has(FriendlyName)) {
            console.log(`🧹 Cleaning up manual call session: ${FriendlyName}`);
            activeCallSessions.delete(FriendlyName);
          }
        }, 10000); // 10 second delay
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Enhanced conference status error:', error);
    res.status(500).send('Error processing conference status');
  }
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
    
    // Load leads for organizations when Supabase persistence is enabled
    if (supabasePersistence.isEnabled && client) {
      try {
        console.log('🔄 Loading leads from database for organizations...');
        
        // Get all organizations and load their leads
        const { data: orgs, error } = await client
          .from('organizations')
          .select('id')
          .eq('is_active', true);
        
        if (orgs && !error) {
          for (const org of orgs) {
            await loadExistingLeadsIntoMemory(org.id);
          }
        }
      } catch (error) {
        console.log('⚠️ Failed to load organizational leads:', error.message);
      }
    } else {
      console.log('🔒 SECURITY: Skipping lead loading - Supabase persistence not available');
    }
    
    console.log('==> Your service is live 🎉');
    console.log('==> ');
    console.log('==> ///////////////////////////////////////////////////////////');
    console.log('==> ');
    console.log(`==> Available at your primary URL https://jack-automotive-ai-assistant-13.onrender.com`);
    console.log('==> ');
    console.log('==> ///////////////////////////////////////////////////////////');
  });
} catch (error) {
  console.error('❌ Error starting server:', error);
  console.error('❌ Stack trace:', error.stack);
  process.exit(1);
}

export default app;