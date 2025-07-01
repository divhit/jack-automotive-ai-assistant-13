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
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<LiveCoachingUpdate[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [leadInsights, setLeadInsights] = useState<any>(null);
  const [enhancedScore, setEnhancedScore] = useState<number | null>(null);

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

  // Calculate basic analytics from conversation history
  const basicAnalytics = {
    messageCount: conversationHistory.length,
    sentimentScore: 0.75, // Mock sentiment
    qualityScore: 0.82, // Mock quality
    buyingSignals: ['interested in pricing', 'asked about timeline'],
    engagementLevel: 'high' as const
  };

  // Calculate analytics from conversation history
  const analyticsMemo = React.useMemo(() => {
    const messageCount = conversationHistory.length;
    const userMessages = conversationHistory.filter(m => m.sentBy === 'user');
    const agentMessages = conversationHistory.filter(m => m.sentBy === 'agent');
    
    // Mock sentiment analysis based on message content
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
    
    // Mock buying signals detection
    const buyingSignals = [];
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      if (content.includes('price') || content.includes('cost')) {
        buyingSignals.push('Asked about pricing');
      }
      if (content.includes('when') || content.includes('timeline')) {
        buyingSignals.push('Inquired about timeline');
      }
      if (content.includes('financing') || content.includes('payment')) {
        buyingSignals.push('Interested in financing');
      }
      if (content.includes('see') || content.includes('visit') || content.includes('test drive')) {
        buyingSignals.push('Wants to see vehicle');
      }
    });
    
    // Remove duplicates
    const uniqueBuyingSignals = [...new Set(buyingSignals)];
    
    // Calculate engagement level
    const avgResponseTime = userMessages.length > 0 ? 5 : 0; // Mock response time
    const engagementLevel = 
      uniqueBuyingSignals.length > 2 ? 'high' :
      uniqueBuyingSignals.length > 0 ? 'medium' : 'low';
    
    // Quality score based on conversation flow
    const qualityScore = Math.min(0.95, (messageCount * 0.1 + sentimentScore * 0.7 + uniqueBuyingSignals.length * 0.2));
    
    return {
      messageCount,
      sentimentScore,
      qualityScore,
      buyingSignals: uniqueBuyingSignals.slice(0, 4), // Show max 4
      engagementLevel,
      avgResponseTime,
      userMessages: userMessages.length,
      agentMessages: agentMessages.length
    };
  }, [conversationHistory]);

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
            Live Analytics
            {isCallActive && (
              <Badge variant="outline" className="ml-auto animate-pulse">
                🔴 Recording
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(basicAnalytics.qualityScore * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Quality Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(basicAnalytics.sentimentScore * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Sentiment</div>
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
          <Badge className={getEngagementColor(basicAnalytics.engagementLevel)}>
            {basicAnalytics.engagementLevel.toUpperCase()} ENGAGEMENT
          </Badge>
          <Progress value={basicAnalytics.engagementLevel === 'high' ? 85 : 50} className="mt-2" />
        </CardContent>
      </Card>

      {/* Buying Signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            Buying Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {basicAnalytics.buyingSignals.map((signal, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{signal}</span>
              </div>
            ))}
            {basicAnalytics.buyingSignals.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No buying signals detected yet
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
              <div className="p-2 bg-white rounded border border-orange-200">
                💡 <strong>Suggestion:</strong> Customer is showing interest - ask about their timeline
              </div>
              <div className="p-2 bg-white rounded border border-orange-200">
                🎯 <strong>Opportunity:</strong> Mention financing options based on their credit profile
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Count */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Conversation Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-xl font-bold">{basicAnalytics.messageCount}</div>
            <div className="text-xs text-muted-foreground">Total Messages</div>
          </div>
          {isCallActive && (
            <div className="mt-2 text-center">
              <div className="text-lg font-semibold text-blue-600">
                {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-muted-foreground">Call Duration</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Lead Score */}
      {enhancedScore !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5" />
              AI-Enhanced Lead Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("text-2xl font-bold", getScoreColor(enhancedScore))}>
                  {Math.round(enhancedScore)}
                </div>
                <div className="text-sm text-muted-foreground">
                  /100
                </div>
              </div>
              <Progress value={enhancedScore} className="flex-1 max-w-32" />
            </div>
            {analytics && (
              <div className="mt-3 text-sm text-muted-foreground">
                Conversion Probability: {(analytics.conversionProbability * 100).toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conversation Analytics */}
      {analytics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Conversation Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quality Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quality Score</span>
              <div className="flex items-center gap-2">
                <Progress value={analytics.qualityScore} className="w-20" />
                <span className={cn("text-sm font-bold", getScoreColor(analytics.qualityScore))}>
                  {analytics.qualityScore}
                </span>
              </div>
            </div>

            {/* Engagement Level */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Engagement Level</span>
              <Badge variant="outline" className={getEngagementColor(analytics.engagementLevel)}>
                {analytics.engagementLevel.toUpperCase()}
              </Badge>
            </div>

            {/* Emotional Tone */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Emotional Tone</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Interest:</span>
                  <span className="font-medium">{(analytics.emotionalTone.interest * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Joy:</span>
                  <span className="font-medium">{(analytics.emotionalTone.joy * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Concern:</span>
                  <span className="font-medium">{(analytics.emotionalTone.concern * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Frustration:</span>
                  <span className="font-medium">{(analytics.emotionalTone.frustration * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Buying Signals & Objections */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-bold">{analytics.buyingSignals.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">Buying Signals</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="font-bold">{analytics.objections.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">Objections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Insights */}
      {leadInsights && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5" />
              Lead Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Insights */}
            {leadInsights.insights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-700">✅ Key Insights</h4>
                <div className="space-y-1">
                  {leadInsights.insights.map((insight: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">• {insight}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {leadInsights.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-blue-700">💡 Recommendations</h4>
                <div className="space-y-1">
                  {leadInsights.recommendations.map((rec: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">• {rec}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Next Actions */}
            {leadInsights.nextActions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-purple-700">🎯 Next Actions</h4>
                <div className="space-y-1">
                  {leadInsights.nextActions.map((action: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">• {action}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {leadInsights.riskFactors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-700">⚠️ Risk Factors</h4>
                <div className="space-y-1">
                  {leadInsights.riskFactors.map((risk: string, index: number) => (
                    <p key={index} className="text-sm text-muted-foreground">• {risk}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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