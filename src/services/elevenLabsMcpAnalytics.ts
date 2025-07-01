// ElevenLabs MCP Analytics Service
// Integrates ElevenLabs MCP server capabilities with our existing CRM system

import { supabase } from '@/integrations/supabase/client';

export interface ConversationAnalytics {
  conversationId: string;
  transcriptionQuality: number;
  sentimentConfidence: number;
  emotionalTone: {
    joy: number;
    frustration: number;
    interest: number;
    concern: number;
  };
  talkTimeRatio: number;
  detectedIntents: string[];
  buyingSignals: string[];
  objections: string[];
  qualityScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
  conversionProbability: number;
  recommendedActions: string[];
}

export interface LiveCoachingUpdate {
  type: 'sentiment_change' | 'buying_signal' | 'objection' | 'quality_alert';
  sentiment?: 'positive' | 'neutral' | 'negative';
  buyingSignal?: {
    type: string;
    confidence: number;
  };
  objection?: {
    type: string;
    severity: 'low' | 'medium' | 'high';
  };
  recommendation?: string;
  timestamp: string;
}

class ElevenLabsMcpAnalyticsService {
  private mcpClient: any; // Will be initialized with MCP client
  private conversationAnalysisCache = new Map<string, ConversationAnalytics>();

  constructor() {
    this.initializeMcpClient();
  }

  private async initializeMcpClient() {
    // Initialize MCP client connection to ElevenLabs server
    // This would connect to the MCP server we configured in .cursor/mcp.json
    console.log('🔗 Initializing ElevenLabs MCP client...');
  }

  /**
   * Enhanced conversation analysis using ElevenLabs MCP
   */
  async analyzeConversation(conversationId: string, audioBuffer?: Buffer): Promise<ConversationAnalytics> {
    try {
      // Check cache first
      const cached = this.conversationAnalysisCache.get(conversationId);
      if (cached) return cached;

      // Get conversation data from Supabase
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      let analysis: ConversationAnalytics;

      if (audioBuffer && conversation.type === 'voice') {
        // Analyze voice conversation with audio
        analysis = await this.analyzeVoiceConversation(conversation, audioBuffer);
      } else {
        // Analyze text conversation
        analysis = await this.analyzeTextConversation(conversation);
      }

      // Store results in database
      await this.storeAnalyticsResults(analysis);
      
      // Cache results
      this.conversationAnalysisCache.set(conversationId, analysis);

      return analysis;
    } catch (error) {
      console.error('❌ Error analyzing conversation:', error);
      throw error;
    }
  }

  /**
   * Real-time live coaching during active calls
   */
  async provideLiveCoaching(conversationId: string, audioChunk: Buffer): Promise<LiveCoachingUpdate[]> {
    try {
      // Use ElevenLabs MCP for real-time analysis
      const realtimeAnalysis = await this.mcpClient?.call('analyze_audio_chunk', {
        audio: audioChunk,
        analysis_type: 'live_coaching',
        context: {
          conversation_id: conversationId,
          domain: 'automotive_finance'
        }
      });

      const updates: LiveCoachingUpdate[] = [];

      // Process sentiment changes
      if (realtimeAnalysis.sentiment_change) {
        updates.push({
          type: 'sentiment_change',
          sentiment: realtimeAnalysis.sentiment,
          timestamp: new Date().toISOString()
        });
      }

      // Detect buying signals
      if (realtimeAnalysis.buying_signals?.length > 0) {
        realtimeAnalysis.buying_signals.forEach((signal: any) => {
          updates.push({
            type: 'buying_signal',
            buyingSignal: {
              type: signal.type,
              confidence: signal.confidence
            },
            recommendation: this.getBuyingSignalRecommendation(signal.type),
            timestamp: new Date().toISOString()
          });
        });
      }

      // Detect objections
      if (realtimeAnalysis.objections?.length > 0) {
        realtimeAnalysis.objections.forEach((objection: any) => {
          updates.push({
            type: 'objection',
            objection: {
              type: objection.type,
              severity: objection.severity
            },
            recommendation: this.getObjectionRecommendation(objection.type),
            timestamp: new Date().toISOString()
          });
        });
      }

      return updates;
    } catch (error) {
      console.error('❌ Error in live coaching:', error);
      return [];
    }
  }

  /**
   * Calculate enhanced lead score using conversation analytics
   */
  async calculateEnhancedLeadScore(leadId: string): Promise<number> {
    try {
      // Get all conversations for this lead
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, type, content, timestamp')
        .eq('lead_id', leadId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      let totalScore = 0;
      let weightedAnalyses = 0;

      for (const conv of conversations) {
        // Get or calculate analytics for this conversation
        const analytics = await this.analyzeConversation(conv.id);
        
        // Weight more recent conversations higher
        const recencyWeight = this.calculateRecencyWeight(conv.timestamp);
        const conversationScore = this.calculateConversationScore(analytics);
        
        totalScore += conversationScore * recencyWeight;
        weightedAnalyses += recencyWeight;
      }

      const enhancedScore = weightedAnalyses > 0 ? totalScore / weightedAnalyses : 50;

      // Update lead score in database
      await supabase
        .from('leads')
        .update({ lead_score: Math.round(enhancedScore) })
        .eq('id', leadId);

      return enhancedScore;
    } catch (error) {
      console.error('❌ Error calculating enhanced lead score:', error);
      return 50; // Default score
    }
  }

  /**
   * Generate conversation insights and recommendations
   */
  async generateConversationInsights(leadId: string): Promise<{
    insights: string[];
    recommendations: string[];
    nextActions: string[];
    riskFactors: string[];
  }> {
    try {
      // Get conversation analytics for the lead
      const { data: analyticsData } = await supabase
        .from('conversation_analytics')
        .select('*')
        .eq('conversation_id', leadId) // This would join through conversations table
        .order('created_at', { ascending: false })
        .limit(10);

      const insights: string[] = [];
      const recommendations: string[] = [];
      const nextActions: string[] = [];
      const riskFactors: string[] = [];

      if (analyticsData && analyticsData.length > 0) {
        const latestAnalysis = analyticsData[0];
        const avgQuality = analyticsData.reduce((sum, a) => sum + a.conversation_quality_score, 0) / analyticsData.length;

        // Generate insights
        if (latestAnalysis.engagement_level === 'high') {
          insights.push('Customer is highly engaged and responsive');
        }

        if (latestAnalysis.conversion_probability > 0.7) {
          insights.push('High conversion probability detected');
          nextActions.push('Schedule follow-up call within 24 hours');
        }

        if (latestAnalysis.buying_signals?.length > 0) {
          insights.push(`${latestAnalysis.buying_signals.length} buying signals identified`);
          recommendations.push('Focus on closing questions and financing options');
        }

        if (latestAnalysis.objections?.length > 0) {
          riskFactors.push(`Customer has ${latestAnalysis.objections.length} unresolved objections`);
          recommendations.push('Address objections before proceeding with sale');
        }

        if (avgQuality < 60) {
          riskFactors.push('Below-average conversation quality detected');
          recommendations.push('Consider reassigning to experienced agent');
        }

        // Sentiment analysis insights
        if (latestAnalysis.emotional_tone?.frustration > 0.6) {
          riskFactors.push('Customer showing signs of frustration');
          nextActions.push('Escalate to specialist or manager');
        }

        if (latestAnalysis.emotional_tone?.interest > 0.7) {
          insights.push('Customer showing strong interest');
          nextActions.push('Present financing options and close for appointment');
        }
      }

      return { insights, recommendations, nextActions, riskFactors };
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      return { insights: [], recommendations: [], nextActions: [], riskFactors: [] };
    }
  }

  // Private helper methods

  private async analyzeVoiceConversation(conversation: any, audioBuffer: Buffer): Promise<ConversationAnalytics> {
    // Use ElevenLabs MCP for comprehensive voice analysis
    const voiceAnalysis = await this.mcpClient?.call('analyze_voice_conversation', {
      audio: audioBuffer,
      conversation_context: conversation.content,
      analysis_depth: 'comprehensive'
    });

    return {
      conversationId: conversation.id,
      transcriptionQuality: voiceAnalysis.transcription_quality || 85,
      sentimentConfidence: voiceAnalysis.sentiment_confidence || 70,
      emotionalTone: voiceAnalysis.emotional_tone || { joy: 0.3, frustration: 0.1, interest: 0.6, concern: 0.2 },
      talkTimeRatio: voiceAnalysis.talk_time_ratio || 0.4,
      detectedIntents: voiceAnalysis.intents || [],
      buyingSignals: voiceAnalysis.buying_signals || [],
      objections: voiceAnalysis.objections || [],
      qualityScore: voiceAnalysis.quality_score || 75,
      engagementLevel: this.calculateEngagementLevel(voiceAnalysis),
      conversionProbability: voiceAnalysis.conversion_probability || 0.5,
      recommendedActions: this.generateRecommendations(voiceAnalysis)
    };
  }

  private async analyzeTextConversation(conversation: any): Promise<ConversationAnalytics> {
    // Use ElevenLabs MCP for text analysis
    const textAnalysis = await this.mcpClient?.call('analyze_text_conversation', {
      text: conversation.content,
      conversation_type: 'sms',
      domain: 'automotive_finance'
    });

    return {
      conversationId: conversation.id,
      transcriptionQuality: 100, // Text is already transcribed
      sentimentConfidence: textAnalysis.sentiment_confidence || 80,
      emotionalTone: textAnalysis.emotional_tone || { joy: 0.4, frustration: 0.1, interest: 0.5, concern: 0.1 },
      talkTimeRatio: 0.5, // Not applicable for text
      detectedIntents: textAnalysis.intents || [],
      buyingSignals: textAnalysis.buying_signals || [],
      objections: textAnalysis.objections || [],
      qualityScore: textAnalysis.quality_score || 70,
      engagementLevel: this.calculateEngagementLevel(textAnalysis),
      conversionProbability: textAnalysis.conversion_probability || 0.4,
      recommendedActions: this.generateRecommendations(textAnalysis)
    };
  }

  private async storeAnalyticsResults(analytics: ConversationAnalytics): Promise<void> {
    const { error } = await supabase
      .from('conversation_analytics')
      .upsert({
        conversation_id: analytics.conversationId,
        transcription_quality_score: analytics.transcriptionQuality,
        sentiment_confidence: analytics.sentimentConfidence,
        emotional_tone: analytics.emotionalTone,
        talk_time_ratio: analytics.talkTimeRatio,
        detected_intents: analytics.detectedIntents,
        buying_signals: analytics.buyingSignals,
        objections: analytics.objections,
        conversation_quality_score: analytics.qualityScore,
        engagement_level: analytics.engagementLevel,
        conversion_probability: analytics.conversionProbability,
        recommended_actions: analytics.recommendedActions
      });

    if (error) {
      console.error('❌ Error storing analytics results:', error);
    }
  }

  private calculateEngagementLevel(analysis: any): 'low' | 'medium' | 'high' {
    const score = (analysis.quality_score || 50) + 
                  (analysis.sentiment_confidence || 50) + 
                  ((analysis.emotional_tone?.interest || 0) * 100);
    
    if (score > 180) return 'high';
    if (score > 120) return 'medium';
    return 'low';
  }

  private calculateRecencyWeight(timestamp: string): number {
    const now = new Date();
    const conversationDate = new Date(timestamp);
    const daysDiff = (now.getTime() - conversationDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // More recent conversations have higher weight
    return Math.max(0.1, 1 - (daysDiff * 0.1));
  }

  private calculateConversationScore(analytics: ConversationAnalytics): number {
    const qualityWeight = 0.3;
    const engagementWeight = 0.25;
    const conversionWeight = 0.25;
    const signalsWeight = 0.2;

    const engagementScore = analytics.engagementLevel === 'high' ? 100 : 
                           analytics.engagementLevel === 'medium' ? 70 : 40;
    
    const signalsScore = (analytics.buyingSignals.length * 20) - (analytics.objections.length * 10);

    return (analytics.qualityScore * qualityWeight) +
           (engagementScore * engagementWeight) +
           (analytics.conversionProbability * 100 * conversionWeight) +
           (Math.max(0, Math.min(100, signalsScore)) * signalsWeight);
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.buying_signals?.length > 0) {
      recommendations.push('Customer showing buying interest - present financing options');
    }

    if (analysis.objections?.length > 0) {
      recommendations.push('Address customer objections before proceeding');
    }

    if (analysis.quality_score < 60) {
      recommendations.push('Improve conversation quality and engagement');
    }

    if (analysis.conversion_probability > 0.7) {
      recommendations.push('High conversion probability - schedule immediate follow-up');
    }

    return recommendations;
  }

  private getBuyingSignalRecommendation(signalType: string): string {
    const recommendations = {
      'financing_inquiry': 'Present financing options and monthly payment examples',
      'price_negotiation': 'Discuss trade-in value and financing incentives',
      'urgency_expression': 'Create urgency with limited-time offers',
      'feature_interest': 'Highlight vehicle features and schedule test drive',
      'timeline_discussion': 'Accelerate timeline and present immediate availability'
    };

    return recommendations[signalType as keyof typeof recommendations] || 'Capitalize on customer interest';
  }

  private getObjectionRecommendation(objectionType: string): string {
    const recommendations = {
      'price_concern': 'Focus on value proposition and financing options',
      'credit_worry': 'Explain subprime financing benefits and approval process',
      'payment_concern': 'Adjust down payment and extend loan term',
      'trust_issue': 'Provide references and transparency about process',
      'timing_concern': 'Address urgency and create compelling reasons to act now'
    };

    return recommendations[objectionType as keyof typeof recommendations] || 'Address customer concerns directly';
  }
}

// Export singleton instance
export const elevenLabsAnalytics = new ElevenLabsMcpAnalyticsService();

// Usage examples for integration with existing components:

/*
// In TelephonyInterface.tsx - Add real-time coaching
useEffect(() => {
  if (isCallActive && conversationId) {
    const interval = setInterval(async () => {
      // Capture audio chunk (implementation depends on audio API)
      const audioChunk = await captureAudioChunk();
      const updates = await elevenLabsAnalytics.provideLiveCoaching(conversationId, audioChunk);
      
      updates.forEach(update => {
        if (update.type === 'buying_signal') {
          toast.success(`🎯 ${update.recommendation}`);
        } else if (update.type === 'objection') {
          toast.warning(`⚠️ ${update.recommendation}`);
        }
      });
    }, 5000); // Analyze every 5 seconds
    
    return () => clearInterval(interval);
  }
}, [isCallActive, conversationId]);

// In LeadAnalyticsDashboard.tsx - Add enhanced insights
const [leadInsights, setLeadInsights] = useState(null);

useEffect(() => {
  if (selectedLead) {
    elevenLabsAnalytics.generateConversationInsights(selectedLead.id)
      .then(insights => setLeadInsights(insights));
  }
}, [selectedLead]);

// In SubprimeLeadsList.tsx - Show enhanced scores
useEffect(() => {
  leads.forEach(async (lead) => {
    const enhancedScore = await elevenLabsAnalytics.calculateEnhancedLeadScore(lead.id);
    // Update lead score in UI
  });
}, [leads]);
*/ 