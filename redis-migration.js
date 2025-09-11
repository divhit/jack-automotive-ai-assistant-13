#!/usr/bin/env node

/**
 * Redis Migration Script for Jack Automotive AI Assistant
 * 
 * This script provides a comprehensive migration path from in-memory Map-based 
 * caching to Redis-backed persistent caching while maintaining backward compatibility.
 */

import cacheAdapter from './services/cacheAdapter.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class RedisMigrationManager {
  constructor() {
    this.migrationStats = {
      conversationContexts: 0,
      conversationSummaries: 0,
      leadMappings: 0,
      organizationData: 0,
      agentConfigs: 0,
      errors: 0
    };
  }

  /**
   * Core conversation context wrapper functions that replace Map operations
   */
  
  // Get conversation context with Redis + Map fallback
  async getConversationContext(organizationId, phoneNumber, legacyMapRef = null) {
    try {
      // Try Redis first
      const redisHistory = await cacheAdapter.getConversationContext(organizationId, phoneNumber);
      if (redisHistory && redisHistory.length > 0) {
        console.log(`✅ Redis: Found ${redisHistory.length} messages for ${organizationId}:${phoneNumber}`);
        return redisHistory;
      }

      // Fallback to legacy Map if provided
      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        const legacyHistory = legacyMapRef.get(orgKey) || legacyMapRef.get(phoneNumber);
        
        if (legacyHistory && legacyHistory.length > 0) {
          console.log(`🔄 Migrating ${legacyHistory.length} messages to Redis: ${orgKey}`);
          await this.setConversationContext(organizationId, phoneNumber, legacyHistory, legacyMapRef);
          this.migrationStats.conversationContexts++;
          return legacyHistory;
        }
      }

      return [];
    } catch (error) {
      console.error('Error getting conversation context:', error.message);
      this.migrationStats.errors++;
      
      // Final fallback to legacy Map
      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        return legacyMapRef.get(orgKey) || legacyMapRef.get(phoneNumber) || [];
      }
      
      return [];
    }
  }

  // Set conversation context to Redis + optionally clear from Map
  async setConversationContext(organizationId, phoneNumber, messages, legacyMapRef = null) {
    try {
      // Set in Redis
      await cacheAdapter.setConversationContext(organizationId, phoneNumber, messages);
      console.log(`✅ Redis: Saved ${messages.length} messages for ${organizationId}:${phoneNumber}`);

      // Clean up legacy Map entries
      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        legacyMapRef.delete(orgKey);
        legacyMapRef.delete(phoneNumber); // Clean up non-org key too
      }

      return true;
    } catch (error) {
      console.error('Error setting conversation context:', error.message);
      this.migrationStats.errors++;
      
      // Fallback to Map if Redis fails
      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        legacyMapRef.set(orgKey, messages);
      }
      
      return false;
    }
  }

  // Get conversation summary with Redis + Map fallback
  async getConversationSummary(organizationId, phoneNumber, legacyMapRef = null) {
    try {
      const redisSummary = await cacheAdapter.getConversationSummary(organizationId, phoneNumber);
      if (redisSummary) {
        return redisSummary;
      }

      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        const legacySummary = legacyMapRef.get(orgKey) || legacyMapRef.get(phoneNumber);
        
        if (legacySummary) {
          await this.setConversationSummary(organizationId, phoneNumber, legacySummary, legacyMapRef);
          this.migrationStats.conversationSummaries++;
          return legacySummary;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting conversation summary:', error.message);
      this.migrationStats.errors++;
      
      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        return legacyMapRef.get(orgKey) || legacyMapRef.get(phoneNumber) || null;
      }
      
      return null;
    }
  }

  // Set conversation summary to Redis + optionally clear from Map
  async setConversationSummary(organizationId, phoneNumber, summary, legacyMapRef = null) {
    try {
      await cacheAdapter.setConversationSummary(organizationId, phoneNumber, summary);
      console.log(`✅ Redis: Saved summary for ${organizationId}:${phoneNumber}`);

      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        legacyMapRef.delete(orgKey);
        legacyMapRef.delete(phoneNumber);
      }

      return true;
    } catch (error) {
      console.error('Error setting conversation summary:', error.message);
      this.migrationStats.errors++;
      
      if (legacyMapRef) {
        const orgKey = this.createOrgKey(organizationId, phoneNumber);
        legacyMapRef.set(orgKey, summary);
      }
      
      return false;
    }
  }

  // Lead mapping operations
  async getPhoneToLeadMapping(phoneNumber, legacyMapRef = null) {
    try {
      const redisLead = await cacheAdapter.getPhoneToLeadMapping(phoneNumber);
      if (redisLead) {
        return redisLead;
      }

      if (legacyMapRef && legacyMapRef.has(phoneNumber)) {
        const legacyLead = legacyMapRef.get(phoneNumber);
        await cacheAdapter.setPhoneToLeadMapping(phoneNumber, legacyLead);
        legacyMapRef.delete(phoneNumber);
        this.migrationStats.leadMappings++;
        return legacyLead;
      }

      return null;
    } catch (error) {
      console.error('Error getting phone to lead mapping:', error.message);
      this.migrationStats.errors++;
      return legacyMapRef ? legacyMapRef.get(phoneNumber) : null;
    }
  }

  async setPhoneToLeadMapping(phoneNumber, leadId, legacyMapRef = null) {
    try {
      await cacheAdapter.setPhoneToLeadMapping(phoneNumber, leadId);
      if (legacyMapRef) {
        legacyMapRef.delete(phoneNumber);
      }
      return true;
    } catch (error) {
      console.error('Error setting phone to lead mapping:', error.message);
      this.migrationStats.errors++;
      if (legacyMapRef) {
        legacyMapRef.set(phoneNumber, leadId);
      }
      return false;
    }
  }

  // Organization cache operations
  async getOrganizationData(organizationId, legacyMapRef = null) {
    try {
      const redisOrgName = await cacheAdapter.getOrganizationData(organizationId);
      if (redisOrgName) {
        return redisOrgName;
      }

      if (legacyMapRef && legacyMapRef.has(organizationId)) {
        const legacyData = legacyMapRef.get(organizationId);
        const orgName = legacyData?.name || legacyData;
        await cacheAdapter.setOrganizationData(organizationId, orgName);
        legacyMapRef.delete(organizationId);
        this.migrationStats.organizationData++;
        return orgName;
      }

      return null;
    } catch (error) {
      console.error('Error getting organization data:', error.message);
      this.migrationStats.errors++;
      if (legacyMapRef && legacyMapRef.has(organizationId)) {
        const legacyData = legacyMapRef.get(organizationId);
        return legacyData?.name || legacyData;
      }
      return null;
    }
  }

  // Batch migration from existing Maps
  async migrateExistingMaps(maps) {
    console.log('🚀 Starting Redis migration from existing Maps...');
    
    if (maps.conversationContexts) {
      for (const [key, messages] of maps.conversationContexts.entries()) {
        const { orgId, phoneNumber } = this.parseOrgKey(key);
        if (orgId && phoneNumber && messages.length > 0) {
          await this.setConversationContext(orgId, phoneNumber, messages);
          maps.conversationContexts.delete(key);
          this.migrationStats.conversationContexts++;
        }
      }
    }

    if (maps.conversationSummaries) {
      for (const [key, summary] of maps.conversationSummaries.entries()) {
        const { orgId, phoneNumber } = this.parseOrgKey(key);
        if (orgId && phoneNumber && summary) {
          await this.setConversationSummary(orgId, phoneNumber, summary);
          maps.conversationSummaries.delete(key);
          this.migrationStats.conversationSummaries++;
        }
      }
    }

    if (maps.phoneToLeadMapping) {
      for (const [phoneNumber, leadId] of maps.phoneToLeadMapping.entries()) {
        if (phoneNumber && leadId) {
          await cacheAdapter.setPhoneToLeadMapping(phoneNumber, leadId);
          maps.phoneToLeadMapping.delete(phoneNumber);
          this.migrationStats.leadMappings++;
        }
      }
    }

    this.printMigrationStats();
  }

  // Utility functions
  createOrgKey(organizationId, phoneNumber) {
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    return organizationId ? `${organizationId}:${normalized}` : normalized;
  }

  parseOrgKey(key) {
    const parts = key.split(':');
    if (parts.length === 2) {
      return { orgId: parts[0], phoneNumber: parts[1] };
    }
    return { orgId: null, phoneNumber: key };
  }

  printMigrationStats() {
    console.log('\n📊 Redis Migration Statistics:');
    console.log(`✅ Conversation Contexts: ${this.migrationStats.conversationContexts}`);
    console.log(`✅ Conversation Summaries: ${this.migrationStats.conversationSummaries}`);
    console.log(`✅ Lead Mappings: ${this.migrationStats.leadMappings}`);
    console.log(`✅ Organization Data: ${this.migrationStats.organizationData}`);
    console.log(`❌ Errors: ${this.migrationStats.errors}`);
  }

  // Health check
  async healthCheck() {
    const health = await cacheAdapter.healthCheck();
    console.log('📡 Redis Migration Manager Health:', JSON.stringify(health, null, 2));
    return health;
  }

  // Get statistics
  async getStats() {
    const stats = await cacheAdapter.getStats();
    return {
      migration: this.migrationStats,
      cache: stats
    };
  }
}

// Export singleton
const redisMigrationManager = new RedisMigrationManager();
export default redisMigrationManager;