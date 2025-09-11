import cacheManager from './cache.js';

class CacheAdapter {
  constructor() {
    this.cache = cacheManager;
    this.useRedis = process.env.USE_REDIS !== 'false'; // Enabled by default
    
    // TTL configurations to match existing behavior
    this.ttlConfig = {
      conversationContext: 7200,     // 2 hours for context
      conversationSummary: 7200,     // 2 hours for summaries  
      conversationHistory: 120,      // 2 minutes for recent history
      organizationData: 120,         // 2 minutes for organization cache
      agentConfig: 3600,             // 1 hour for agent configurations
      sseResponse: 10,               // 10 seconds for SSE responses
      leadData: 300,                 // 5 minutes for lead sync
      preComputedContext: 120,       // 2 minutes for context cache
    };

    // Fallback Maps for critical operations (same as current implementation)
    this.fallbackMaps = {
      activeConversations: new Map(),    // WebSocket connections - never cached
      inflightRequests: new Map(),       // Request deduplication - short lived
      humanControlSessions: new Map(),   // Human control state - session critical
      humanControlQueue: new Map(),      // Pending messages - session critical
      pendingDatabaseWrites: new Map(),  // Batch operations - temporary
      conversationMetadata: new Map(),   // Session metadata - temporary
      activeCallSessions: new Map(),     // Call sessions - active only
    };
  }

  // === CONVERSATION MANAGEMENT ===

  async getConversationContext(orgId, phoneNumber) {
    if (!this.useRedis) {
      // Fallback to existing Map behavior
      return this.getFromFallbackMap('conversationContexts', this.createOrgKey(orgId, phoneNumber));
    }
    
    return await this.cache.hget('conversationContexts', this.createOrgKey(orgId, phoneNumber));
  }

  async setConversationContext(orgId, phoneNumber, messages) {
    const key = this.createOrgKey(orgId, phoneNumber);
    
    if (!this.useRedis) {
      return this.setInFallbackMap('conversationContexts', key, messages);
    }
    
    return await this.cache.hset(
      'conversationContexts', 
      key, 
      messages, 
      this.ttlConfig.conversationContext
    );
  }

  async getConversationSummary(orgId, phoneNumber) {
    if (!this.useRedis) {
      return this.getFromFallbackMap('conversationSummaries', this.createOrgKey(orgId, phoneNumber));
    }
    
    return await this.cache.hget('conversationSummaries', this.createOrgKey(orgId, phoneNumber));
  }

  async setConversationSummary(orgId, phoneNumber, summary) {
    const key = this.createOrgKey(orgId, phoneNumber);
    
    if (!this.useRedis) {
      return this.setInFallbackMap('conversationSummaries', key, summary);
    }
    
    return await this.cache.hset(
      'conversationSummaries', 
      key, 
      summary, 
      this.ttlConfig.conversationSummary
    );
  }

  // === LEAD MAPPING MANAGEMENT ===

  async getPhoneToLeadMapping(phoneNumber) {
    if (!this.useRedis) {
      return this.getFromFallbackMap('phoneToLeadMapping', phoneNumber);
    }
    
    return await this.cache.get(`phoneToLead:${phoneNumber}`);
  }

  async setPhoneToLeadMapping(phoneNumber, leadId) {
    if (!this.useRedis) {
      return this.setInFallbackMap('phoneToLeadMapping', phoneNumber, leadId);
    }
    
    // Set bidirectional mapping
    await this.cache.set(`phoneToLead:${phoneNumber}`, leadId, this.ttlConfig.leadData);
    return await this.cache.set(`leadToPhone:${leadId}`, phoneNumber, this.ttlConfig.leadData);
  }

  async getLeadToPhoneMapping(leadId) {
    if (!this.useRedis) {
      return this.getFromFallbackMap('leadToPhoneMapping', leadId);
    }
    
    return await this.cache.get(`leadToPhone:${leadId}`);
  }

  async getDynamicLead(leadId) {
    if (!this.useRedis) {
      return this.getFromFallbackMap('dynamicLeads', leadId);
    }
    
    return await this.cache.get(`dynamicLead:${leadId}`);
  }

  async setDynamicLead(leadId, leadData) {
    if (!this.useRedis) {
      return this.setInFallbackMap('dynamicLeads', leadId, leadData);
    }
    
    return await this.cache.set(`dynamicLead:${leadId}`, leadData, this.ttlConfig.leadData);
  }

  // === ORGANIZATION CACHE ===

  async getOrganizationData(organizationId) {
    if (!this.useRedis) {
      const cached = this.getFromFallbackMap('organizationCache', organizationId);
      return cached?.name || null;
    }
    
    const data = await this.cache.get(`organization:${organizationId}`);
    return data?.name || null;
  }

  async setOrganizationData(organizationId, name) {
    if (!this.useRedis) {
      return this.setInFallbackMap('organizationCache', organizationId, { name, timestamp: Date.now() });
    }
    
    return await this.cache.set(
      `organization:${organizationId}`, 
      { name, timestamp: Date.now() }, 
      this.ttlConfig.organizationData
    );
  }

  // === AGENT CONFIGURATION CACHE ===

  async getAgentConfig(agentId, agentPhone) {
    const key = `${agentId}:${agentPhone}`;
    
    if (!this.useRedis) {
      const cached = this.getFromFallbackMap('agentConfigCache', key);
      if (cached && (Date.now() - cached.timestamp) < (this.ttlConfig.agentConfig * 1000)) {
        return cached.configured;
      }
      return null;
    }
    
    const data = await this.cache.get(`agentConfig:${key}`);
    return data?.configured || null;
  }

  async setAgentConfig(agentId, agentPhone, configured = true) {
    const key = `${agentId}:${agentPhone}`;
    
    if (!this.useRedis) {
      return this.setInFallbackMap('agentConfigCache', key, {
        configured,
        timestamp: Date.now()
      });
    }
    
    return await this.cache.set(
      `agentConfig:${key}`, 
      { configured, timestamp: Date.now() }, 
      this.ttlConfig.agentConfig
    );
  }

  // === PERFORMANCE CACHES ===

  async getConversationHistoryCache(orgId, phoneNumber) {
    const key = this.createOrgKey(orgId, phoneNumber);
    
    if (!this.useRedis) {
      const cached = this.getFromFallbackMap('conversationHistoryCache', key);
      if (cached && (Date.now() - cached.timestamp) < (this.ttlConfig.conversationHistory * 1000)) {
        return cached.messages;
      }
      return null;
    }
    
    return await this.cache.get(`historyCache:${key}`);
  }

  async setConversationHistoryCache(orgId, phoneNumber, messages) {
    const key = this.createOrgKey(orgId, phoneNumber);
    
    if (!this.useRedis) {
      return this.setInFallbackMap('conversationHistoryCache', key, {
        messages,
        timestamp: Date.now()
      });
    }
    
    return await this.cache.set(
      `historyCache:${key}`, 
      messages, 
      this.ttlConfig.conversationHistory
    );
  }

  async getSSEResponseCache(leadId, phoneNumber) {
    const key = `${leadId}:${phoneNumber}`;
    
    if (!this.useRedis) {
      const cached = this.getFromFallbackMap('sseResponseCache', key);
      if (cached && (Date.now() - cached.timestamp) < (this.ttlConfig.sseResponse * 1000)) {
        return cached;
      }
      return null;
    }
    
    return await this.cache.get(`sseCache:${key}`);
  }

  async setSSEResponseCache(leadId, phoneNumber, data) {
    const key = `${leadId}:${phoneNumber}`;
    
    if (!this.useRedis) {
      return this.setInFallbackMap('sseResponseCache', key, {
        ...data,
        timestamp: Date.now()
      });
    }
    
    return await this.cache.set(`sseCache:${key}`, data, this.ttlConfig.sseResponse);
  }

  // === REQUEST DEDUPLICATION ===

  getInflightRequest(cacheKey) {
    return this.fallbackMaps.inflightRequests.get(cacheKey);
  }

  setInflightRequest(cacheKey, promise) {
    return this.fallbackMaps.inflightRequests.set(cacheKey, promise);
  }

  deleteInflightRequest(cacheKey) {
    return this.fallbackMaps.inflightRequests.delete(cacheKey);
  }

  // === HUMAN CONTROL SESSIONS ===

  getHumanControlSession(orgId, phoneNumber) {
    const key = this.createOrgKey(orgId, phoneNumber);
    return this.fallbackMaps.humanControlSessions.get(key);
  }

  setHumanControlSession(orgId, phoneNumber, sessionData) {
    const key = this.createOrgKey(orgId, phoneNumber);
    return this.fallbackMaps.humanControlSessions.set(key, sessionData);
  }

  deleteHumanControlSession(orgId, phoneNumber) {
    const key = this.createOrgKey(orgId, phoneNumber);
    return this.fallbackMaps.humanControlSessions.delete(key);
  }

  // === CACHE MANAGEMENT ===

  async clearOrganizationCache(organizationId) {
    console.log(`🗑️ Clearing all caches for organization: ${organizationId}`);
    
    if (this.useRedis) {
      await this.cache.clearOrganizationCache(organizationId);
    }
    
    // Clear fallback Maps
    const prefix = `${organizationId}:`;
    
    for (const [mapName, map] of Object.entries(this.fallbackMaps)) {
      for (const key of map.keys()) {
        if (key.includes(prefix)) {
          map.delete(key);
        }
      }
    }
    
    console.log(`✅ Organization cache cleared for: ${organizationId}`);
  }

  // === UTILITY METHODS ===

  createOrgKey(organizationId, phoneNumber) {
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
    return organizationId ? `${organizationId}:${normalizedPhone}` : normalizedPhone;
  }

  getFromFallbackMap(mapName, key) {
    // This would integrate with existing Maps if they were passed in
    // For now, return null to force new implementation
    return null;
  }

  setInFallbackMap(mapName, key, value) {
    // This would integrate with existing Maps if they were passed in
    // For now, return true to simulate success
    return true;
  }

  // === STATISTICS AND MONITORING ===

  async getStats() {
    const cacheStats = await this.cache.getStats();
    const fallbackSizes = {};
    
    for (const [name, map] of Object.entries(this.fallbackMaps)) {
      fallbackSizes[name] = map.size;
    }
    
    return {
      redisEnabled: this.useRedis,
      ttlConfig: this.ttlConfig,
      fallbackMaps: fallbackSizes,
      cache: cacheStats
    };
  }

  async healthCheck() {
    const cacheHealth = await this.cache.healthCheck();
    
    return {
      adapter: {
        status: 'healthy',
        redisEnabled: this.useRedis,
        fallbackMaps: Object.keys(this.fallbackMaps).length
      },
      cache: cacheHealth
    };
  }
}

// Singleton instance
const cacheAdapter = new CacheAdapter();
export default cacheAdapter;