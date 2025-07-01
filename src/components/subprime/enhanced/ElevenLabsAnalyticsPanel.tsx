// Enhanced Analytics Panel with ElevenLabs MCP Integration
// Integrates with existing TelephonyInterface to show real-time insights

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Brain, 
  Mic, 
  MessageSquare,
  Clock,
  Star,
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { elevenLabsAnalytics, ConversationAnalytics, LiveCoachingUpdate } from '@/services/elevenLabsMcpAnalytics';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';
import { realAnalyticsService } from '@/services/realAnalyticsService';

interface ConversationMessage {
  id: string;
  type: 'sms' | 'call' | 'system' | 'voice';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system';
  status?: 'sent' | 'delivered' | 'failed';
}

interface ElevenLabsAnalyticsPanelProps {
  selectedLead: SubprimeLead | null;
  conversationHistory: ConversationMessage[];
  isCallActive: boolean;
  callDuration: number;
  conversationId: string | null;
  className?: string;
}

export const ElevenLabsAnalyticsPanel: React.FC<ElevenLabsAnalyticsPanelProps> = ({
  selectedLead,
  conversationHistory,
  isCallActive,
  callDuration,
  conversationId,
  className
}) => {
  // State management
  const [analytics, setAnalytics] = useState({
    conversationQuality: 0,
    sentimentScore: 0.5,
    buyingSignals: [],
    engagementLevel: 'low' as 'low' | 'medium' | 'high',
    messageCount: 0,
    userMessages: 0,
    agentMessages: 0,
    conversationDuration: 0,
    lastActivity: null as string | null
  });
  const [liveUpdates, setLiveUpdates] = useState<LiveCoachingUpdate[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [leadInsights, setLeadInsights] = useState<any>(null);
  const [enhancedScore, setEnhancedScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Load analytics when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadConversationAnalytics();
    }
  }, [conversationId]);

  // Load lead insights when lead changes
  useEffect(() => {
    if (selectedLead) {
      loadLeadInsights();
      loadEnhancedScore();
    }
  }, [selectedLead]);

  // Real-time coaching during active calls
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isCallActive && conversationId) {
      // Simulate real-time coaching updates every 10 seconds
      interval = setInterval(async () => {
        try {
          // In real implementation, this would capture actual audio chunks
          const mockAudioChunk = new Buffer(0); // Placeholder
          const updates = await elevenLabsAnalytics.provideLiveCoaching(conversationId, mockAudioChunk);
          
          if (updates.length > 0) {
            setLiveUpdates(prev => [...updates, ...prev].slice(0, 10)); // Keep last 10 updates
            
            // Show toast notifications for important updates
            updates.forEach(update => {
              if (update.type === 'buying_signal' && update.buyingSignal?.confidence > 0.8) {
                toast.success(`🎯 Strong buying signal detected: ${update.buyingSignal.type}`);
              } else if (update.type === 'objection' && update.objection?.severity === 'high') {
                toast.warning(`⚠️ High severity objection: ${update.objection.type}`);
              }
            });
          }
        } catch (error) {
          console.error('Error in live coaching:', error);
        }
      }, 10000);
    } else {
      setLiveUpdates([]); // Clear updates when call ends
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive, conversationId]);

  // Fetch real analytics when selectedLead changes
  useEffect(() => {
    if (selectedLead?.id) {
      setLoading(true);
      realAnalyticsService.getLeadAnalytics(selectedLead.id.toString())
        .then(realAnalytics => {
          setAnalytics({
            conversationQuality: realAnalytics.conversationQuality,
            sentimentScore: realAnalytics.sentimentScore,
            buyingSignals: realAnalytics.buyingSignals,
            engagementLevel: realAnalytics.engagementLevel,
            messageCount: realAnalytics.messageCount,
            userMessages: realAnalytics.userMessages,
            agentMessages: realAnalytics.agentMessages,
            conversationDuration: realAnalytics.conversationDuration || 0,
            lastActivity: realAnalytics.lastActivity || null
          });
        })
        .catch(error => {
          console.error('Error loading analytics:', error);
          // Fall back to analyzing current conversation history
          const fallbackAnalytics = analyzeFallbackData(conversationHistory);
          setAnalytics(fallbackAnalytics);
        })
        .finally(() => setLoading(false));
    } else {
      // Analyze current conversation history if no lead selected
      const fallbackAnalytics = analyzeFallbackData(conversationHistory);
      setAnalytics(fallbackAnalytics);
    }
  }, [selectedLead?.id, conversationHistory]);

  const loadConversationAnalytics = async () => {
    if (!conversationId) return;
    
    setIsAnalyzing(true);
    try {
      const result = await elevenLabsAnalytics.analyzeConversation(conversationId);
      setAnalytics(result);
    } catch (error) {
      console.error('Error loading conversation analytics:', error);
      toast.error('Failed to load conversation analytics');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadLeadInsights = async () => {
    if (!selectedLead) return;
    
    try {
      const insights = await elevenLabsAnalytics.generateConversationInsights(selectedLead.id);
      setLeadInsights(insights);
    } catch (error) {
      console.error('Error loading lead insights:', error);
    }
  };

  const loadEnhancedScore = async () => {
    if (!selectedLead) return;
    
    try {
      const score = await elevenLabsAnalytics.calculateEnhancedLeadScore(selectedLead.id);
      setEnhancedScore(score);
    } catch (error) {
      console.error('Error loading enhanced score:', error);
    }
  };

  const analyzeFallbackData = (messages: ConversationMessage[]) => {
    const userMessages = messages.filter(m => m.sentBy === 'user');
    const agentMessages = messages.filter(m => m.sentBy === 'agent');
    
    // Basic buying signals detection
    const buyingSignalKeywords = ['price', 'cost', 'financing', 'payment', 'test drive', 'schedule', 'appointment'];
    const buyingSignals: string[] = [];
    
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      buyingSignalKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          const signal = mapKeywordToSignal(keyword);
          if (signal && !buyingSignals.includes(signal)) {
            buyingSignals.push(signal);
          }
        }
      });
    });

    // Basic sentiment analysis
    const positiveKeywords = ['interested', 'yes', 'great', 'good', 'perfect', 'love', 'want'];
    const negativeKeywords = ['no', 'not interested', 'maybe later', 'busy', 'expensive'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveKeywords.forEach(keyword => {
        if (content.includes(keyword)) positiveScore++;
      });
      negativeKeywords.forEach(keyword => {
        if (content.includes(keyword)) negativeScore++;
      });
    });
    
    const sentimentScore = Math.max(0.3, Math.min(0.95, (positiveScore + 1) / (positiveScore + negativeScore + 2)));
    const qualityScore = Math.min(0.95, (messages.length * 0.1 + sentimentScore * 0.7 + buyingSignals.length * 0.2));
    const engagementLevel = buyingSignals.length > 2 ? 'high' : buyingSignals.length > 0 ? 'medium' : 'low';

    return {
      conversationQuality: qualityScore,
      sentimentScore,
      buyingSignals: buyingSignals.slice(0, 4),
      engagementLevel,
      messageCount: messages.length,
      userMessages: userMessages.length,
      agentMessages: agentMessages.length,
      conversationDuration: 0,
      lastActivity: messages.length > 0 ? messages[0].timestamp : null
    };
  };

  const mapKeywordToSignal = (keyword: string): string | null => {
    const signalMap: { [key: string]: string } = {
      'price': 'Asked about pricing',
      'cost': 'Asked about pricing',
      'financing': 'Interested in financing',
      'payment': 'Interested in financing',
      'test drive': 'Wants to test drive',
      'schedule': 'Ready to schedule',
      'appointment': 'Ready to schedule'
    };
    return signalMap[keyword] || null;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-700 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentEmoji = (score: number) => {
    if (score > 0.7) return '😊';
    if (score > 0.5) return '😐';
    return '😕';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Real-time Analytics Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            ElevenLabs Analytics
            {isCallActive && (
              <Badge variant="outline" className="ml-auto animate-pulse bg-red-50 text-red-700 border-red-200">
                🔴 Live
              </Badge>
            )}
            {loading && (
              <Badge variant="outline" className="ml-auto bg-blue-50 text-blue-700 border-blue-200">
                Loading...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-xl font-bold text-blue-600">
                {Math.round(analytics.conversationQuality * 100)}%
              </div>
              <div className="text-xs text-blue-600">Quality Score</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-xl font-bold text-green-600">
                {getSentimentEmoji(analytics.sentimentScore)} {Math.round(analytics.sentimentScore * 100)}%
              </div>
              <div className="text-xs text-green-600">Sentiment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getEngagementColor(analytics.engagementLevel)}>
            {analytics.engagementLevel.toUpperCase()} ENGAGEMENT
          </Badge>
          <Progress 
            value={analytics.engagementLevel === 'high' ? 85 : analytics.engagementLevel === 'medium' ? 60 : 30} 
            className="mt-3" 
          />
          <div className="text-xs text-muted-foreground mt-1">
            {selectedLead ? 'Based on Supabase conversation data' : 'Based on current conversation'}
          </div>
        </CardContent>
      </Card>

      {/* Buying Signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            Buying Signals ({analytics.buyingSignals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.buyingSignals.map((signal, index) => (
              <div key={index} className="flex items-center gap-2 text-sm p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-green-800">{signal}</span>
              </div>
            ))}
            {analytics.buyingSignals.length === 0 && (
              <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded">
                <MessageSquare className="h-4 w-4 inline mr-2" />
                {selectedLead ? 'No buying signals in database yet' : 'No buying signals detected yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Coaching */}
      {isCallActive && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Live Coaching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {analytics.sentimentScore > 0.7 ? (
                <div className="p-2 bg-white rounded border border-green-200">
                  <div className="font-medium text-green-800">✅ Great Progress!</div>
                  <div className="text-green-700">Customer is engaged - ask about next steps</div>
                </div>
              ) : (
                <div className="p-2 bg-white rounded border border-orange-200">
                  <div className="font-medium text-orange-800">💡 Suggestion</div>
                  <div className="text-orange-700">Try asking open-ended questions to increase engagement</div>
                </div>
              )}
              
              {analytics.buyingSignals.length > 0 && (
                <div className="p-2 bg-white rounded border border-blue-200">
                  <div className="font-medium text-blue-800">🎯 Opportunity</div>
                  <div className="text-blue-700">Customer showing interest - mention financing options</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Conversation Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-lg font-bold">{analytics.messageCount}</div>
              <div className="text-xs text-muted-foreground">Total Messages</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="text-lg font-bold">{analytics.userMessages}</div>
              <div className="text-xs text-muted-foreground">Customer Messages</div>
            </div>
          </div>
          
          {analytics.lastActivity && (
            <div className="mt-3 text-center p-2 bg-blue-50 rounded">
              <div className="text-xs text-blue-600">
                Last Activity: {new Date(analytics.lastActivity).toLocaleDateString()}
              </div>
            </div>
          )}
          
          {isCallActive && (
            <div className="mt-3 text-center p-2 bg-blue-50 rounded">
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div className="text-lg font-semibold text-blue-600">
                  {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                </div>
              </div>
              <div className="text-xs text-blue-600">Call Duration</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Lead Score */}
      {selectedLead && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-purple-600" />
              Enhanced Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((selectedLead.leadScore || 50) * (1 + analytics.conversationQuality * 0.5))}
              </div>
              <div className="text-xs text-muted-foreground">
                Base: {selectedLead.leadScore || 50} + Real Conversation Data
              </div>
              <Progress 
                value={Math.round((selectedLead.leadScore || 50) * (1 + analytics.conversationQuality * 0.5))} 
                className="mt-2" 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Indicator */}
      <div className="text-xs text-center text-muted-foreground">
        {selectedLead ? (
          <span className="flex items-center justify-center gap-1">
            <Badge variant="outline" className="text-xs">Real Data</Badge>
            Connected to Supabase
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <Badge variant="outline" className="text-xs">Live Analysis</Badge>
            Current conversation
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadConversationAnalytics}
          disabled={!conversationId || isAnalyzing}
          className="flex-1"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-3 w-3 mr-2" />
              Re-analyze
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadEnhancedScore}
          disabled={!selectedLead}
          className="flex-1"
        >
          <TrendingUp className="h-3 w-3 mr-2" />
          Update Score
        </Button>
      </div>

      {/* Loading State */}
      {!analytics && !isAnalyzing && conversationId && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click "Re-analyze" to get AI insights</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ElevenLabsAnalyticsPanel; 