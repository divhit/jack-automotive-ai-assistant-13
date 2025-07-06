import { supabase } from '@/integrations/supabase/client';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';

interface ConversationMessage {
  id: string;
  type: 'sms' | 'call' | 'system' | 'voice';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system';
  status?: 'sent' | 'delivered' | 'failed';
}

interface RealAnalytics {
  conversationQuality: number;
  sentimentScore: number;
  buyingSignals: string[];
  engagementLevel: 'low' | 'medium' | 'high';
  messageCount: number;
  userMessages: number;
  agentMessages: number;
  conversationDuration?: number;
  lastActivity?: string;
}

export class RealAnalyticsService {
  
  async getLeadAnalytics(leadId: string, organizationId?: string): Promise<RealAnalytics> {
    try {
      // Build query with organization filter if provided
      let query = supabase
        .from('conversations')
        .select(`
          *,
          messages (
            id,
            content,
            created_at,
            sender_type,
            message_type,
            status
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Add organization filter if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: conversations, error: convError } = await query;

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return this.getDefaultAnalytics();
      }

      if (!conversations || conversations.length === 0) {
        return this.getDefaultAnalytics();
      }

      // Process real conversation data
      const allMessages = conversations.flatMap(conv => conv.messages || []);
      const userMessages = allMessages.filter(msg => msg.sender_type === 'user');
      const agentMessages = allMessages.filter(msg => msg.sender_type === 'agent');

      const analytics = await this.analyzeConversations(conversations, allMessages);
      
      return {
        conversationQuality: analytics.qualityScore,
        sentimentScore: analytics.sentiment,
        buyingSignals: analytics.buyingSignals,
        engagementLevel: analytics.engagement,
        messageCount: allMessages.length,
        userMessages: userMessages.length,
        agentMessages: agentMessages.length,
        conversationDuration: analytics.duration,
        lastActivity: allMessages.length > 0 ? allMessages[0].created_at : undefined
      };

    } catch (error) {
      console.error('Error getting lead analytics:', error);
      return this.getDefaultAnalytics();
    }
  }

  async getGlobalAnalytics(organizationId?: string): Promise<{
    totalLeads: number;
    avgLeadScore: number;
    totalConversations: number;
    highValueLeads: number;
    conversationQuality: number;
    buyingSignalsCount: number;
    conversionRate: number;
  }> {
    try {
      // SECURITY FIX: All queries must be filtered by organization_id
      if (!organizationId) {
        console.error('🚨 SECURITY: getGlobalAnalytics called without organization_id');
        return {
          totalLeads: 0,
          avgLeadScore: 0,
          totalConversations: 0,
          highValueLeads: 0,
          conversationQuality: 0,
          buyingSignalsCount: 0,
          conversionRate: 0
        };
      }

      // Get total leads for this organization ONLY
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get average lead score for this organization ONLY
      const { data: avgScoreData } = await supabase
        .from('leads')
        .select('lead_score')
        .eq('organization_id', organizationId)
        .not('lead_score', 'is', null);

      const avgLeadScore = avgScoreData?.length 
        ? avgScoreData.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / avgScoreData.length
        : 0;

      // Get conversation stats for this organization ONLY
      const { count: totalConversations } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get high-value leads (score > 70) for this organization ONLY
      const { count: highValueLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gt('lead_score', 70);

      // Get recent buying signals from ElevenLabs analytics for this organization ONLY
      const { data: analyticsData } = await supabase
        .from('conversation_analytics')
        .select('buying_signals, conversation_id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in('conversation_id', 
          supabase.from('conversations')
            .select('id')
            .eq('organization_id', organizationId)
        );

      const buyingSignalsCount = analyticsData?.reduce((total, record) => {
        const signals = record.buying_signals || [];
        return total + (Array.isArray(signals) ? signals.length : 0);
      }, 0) || 0;

      // Calculate conversation quality average for this organization ONLY
      const { data: qualityData } = await supabase
        .from('conversation_analytics')
        .select('conversation_quality_score, conversation_id')
        .not('conversation_quality_score', 'is', null)
        .in('conversation_id', 
          supabase.from('conversations')
            .select('id')
            .eq('organization_id', organizationId)
        );

      const conversationQuality = qualityData?.length
        ? qualityData.reduce((sum, record) => sum + (record.conversation_quality_score || 0), 0) / qualityData.length
        : 0;

      // Calculate conversion rate for this organization ONLY
      const { count: convertedLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['converted', 'closed-won']);

      const conversionRate = totalLeads ? (convertedLeads || 0) / totalLeads * 100 : 0;

      console.log(`📊 Organization ${organizationId} analytics:`, {
        totalLeads: totalLeads || 0,
        avgLeadScore: Math.round(avgLeadScore * 10) / 10,
        totalConversations: totalConversations || 0,
        highValueLeads: highValueLeads || 0,
        conversationQuality: Math.round(conversationQuality * 100),
        buyingSignalsCount,
        conversionRate: Math.round(conversionRate)
      });

      return {
        totalLeads: totalLeads || 0,
        avgLeadScore: Math.round(avgLeadScore * 10) / 10,
        totalConversations: totalConversations || 0,
        highValueLeads: highValueLeads || 0,
        conversationQuality: Math.round(conversationQuality * 100),
        buyingSignalsCount,
        conversionRate: Math.round(conversionRate)
      };

    } catch (error) {
      console.error('Error getting global analytics:', error);
      return {
        totalLeads: 0,
        avgLeadScore: 0,
        totalConversations: 0,
        highValueLeads: 0,
        conversationQuality: 0,
        buyingSignalsCount: 0,
        conversionRate: 0
      };
    }
  }

  private async analyzeConversations(conversations: any[], messages: any[]): Promise<{
    qualityScore: number;
    sentiment: number;
    buyingSignals: string[];
    engagement: 'low' | 'medium' | 'high';
    duration: number;
  }> {
    // Analyze message content for buying signals
    const buyingSignalKeywords = [
      'price', 'cost', 'financing', 'payment', 'loan', 'monthly',
      'test drive', 'visit', 'see the car', 'schedule', 'appointment',
      'trade-in', 'down payment', 'lease', 'buy', 'purchase',
      'when can', 'available', 'in stock', 'delivery', 'pickup'
    ];

    const sentimentKeywords = {
      positive: ['interested', 'yes', 'great', 'good', 'perfect', 'love', 'want', 'like', 'sounds good'],
      negative: ['no', 'not interested', 'maybe later', 'busy', 'expensive', 'too much', 'can\'t afford']
    };

    const buyingSignals: string[] = [];
    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach(msg => {
      if (msg.sender_type === 'user' && msg.content) {
        const content = msg.content.toLowerCase();
        
        // Check for buying signals
        buyingSignalKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            const signal = this.mapKeywordToSignal(keyword);
            if (signal && !buyingSignals.includes(signal)) {
              buyingSignals.push(signal);
            }
          }
        });

        // Analyze sentiment
        sentimentKeywords.positive.forEach(keyword => {
          if (content.includes(keyword)) positiveCount++;
        });
        sentimentKeywords.negative.forEach(keyword => {
          if (content.includes(keyword)) negativeCount++;
        });
      }
    });

    // Calculate metrics
    const userMessageCount = messages.filter(m => m.sender_type === 'user').length;
    const sentiment = Math.max(0.1, Math.min(0.95, (positiveCount + 1) / (positiveCount + negativeCount + 2)));
    
    const qualityScore = Math.min(0.95, 
      (messages.length * 0.1 + sentiment * 0.6 + buyingSignals.length * 0.3) / 1.0
    );

    const engagement = buyingSignals.length > 2 ? 'high' : 
                     buyingSignals.length > 0 ? 'medium' : 'low';

    // Estimate conversation duration (time between first and last message)
    const timestamps = messages.map(m => new Date(m.created_at).getTime()).sort((a, b) => a - b);
    const duration = timestamps.length > 1 ? 
      Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 1000) : 0;

    return {
      qualityScore,
      sentiment,
      buyingSignals: buyingSignals.slice(0, 4), // Limit to 4 most relevant
      engagement,
      duration
    };
  }

  private mapKeywordToSignal(keyword: string): string | null {
    const signalMap: { [key: string]: string } = {
      'price': 'Asked about pricing',
      'cost': 'Asked about pricing',
      'financing': 'Interested in financing',
      'payment': 'Interested in financing',
      'loan': 'Interested in financing',
      'monthly': 'Interested in financing',
      'test drive': 'Wants to test drive',
      'visit': 'Wants to visit dealership',
      'see the car': 'Wants to see vehicle',
      'schedule': 'Ready to schedule appointment',
      'appointment': 'Ready to schedule appointment',
      'trade-in': 'Has trade-in vehicle',
      'down payment': 'Discussing down payment',
      'lease': 'Interested in leasing',
      'buy': 'Ready to purchase',
      'purchase': 'Ready to purchase',
      'when can': 'Inquired about timeline',
      'available': 'Inquired about availability',
      'in stock': 'Inquired about availability',
      'delivery': 'Inquired about delivery',
      'pickup': 'Inquired about pickup'
    };

    return signalMap[keyword] || null;
  }

  private getDefaultAnalytics(): RealAnalytics {
    return {
      conversationQuality: 0,
      sentimentScore: 0.5,
      buyingSignals: [],
      engagementLevel: 'low',
      messageCount: 0,
      userMessages: 0,
      agentMessages: 0
    };
  }
}

export const realAnalyticsService = new RealAnalyticsService(); 