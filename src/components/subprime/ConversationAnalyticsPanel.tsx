import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  Brain, 
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  Phone,
  Zap
} from 'lucide-react';
import { SubprimeLead } from '@/data/subprime/subprimeLeads';

interface ConversationMessage {
  id: string;
  type: 'sms' | 'call' | 'system' | 'voice';
  content: string;
  timestamp: string;
  sentBy: 'user' | 'agent' | 'system' | 'human_agent';
  status?: 'sent' | 'delivered' | 'failed';
}

interface ConversationAnalyticsPanelProps {
  selectedLead: SubprimeLead | null;
  conversationHistory: ConversationMessage[];
  isCallActive?: boolean;
}

export const ConversationAnalyticsPanel: React.FC<ConversationAnalyticsPanelProps> = ({
  selectedLead,
  conversationHistory,
  isCallActive = false
}) => {
  const [analytics, setAnalytics] = useState({
    buyingSignals: [] as string[],
    sentimentScore: 0.5,
    engagementLevel: 'medium' as 'low' | 'medium' | 'high',
    conversationQuality: 0,
    keyTopics: [] as string[],
    avgResponseTime: 0,
    lastActivity: null as Date | null
  });

  // Analyze conversation in real-time
  useEffect(() => {
    if (conversationHistory.length === 0) {
      setAnalytics({
        buyingSignals: [],
        sentimentScore: 0.5,
        engagementLevel: 'low',
        conversationQuality: 0,
        keyTopics: [],
        avgResponseTime: 0,
        lastActivity: null
      });
      return;
    }

    const userMessages = conversationHistory.filter(m => m.sentBy === 'user');
    const agentMessages = conversationHistory.filter(m => m.sentBy === 'agent' || m.sentBy === 'human_agent');

    // Detect buying signals
    const buyingSignalKeywords = {
      'financing': 'Interested in financing',
      'payment': 'Asked about payments',
      'monthly': 'Discussed monthly payments',
      'down payment': 'Asked about down payment',
      'credit': 'Discussed credit options',
      'approve': 'Seeking approval',
      'qualify': 'Qualification inquiry',
      'rate': 'Interested in rates',
      'test drive': 'Wants test drive',
      'see the car': 'Wants to see vehicle',
      'visit': 'Ready to visit',
      'when can': 'Timeline inquiry',
      'available': 'Checking availability',
      'price': 'Price inquiry',
      'cost': 'Cost discussion'
    };

    const detectedSignals: string[] = [];
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      Object.entries(buyingSignalKeywords).forEach(([keyword, signal]) => {
        if (content.includes(keyword) && !detectedSignals.includes(signal)) {
          detectedSignals.push(signal);
        }
      });
    });

    // Analyze sentiment
    const positiveKeywords = ['yes', 'great', 'good', 'interested', 'perfect', 'love', 'want', 'need', 'sounds good'];
    const negativeKeywords = ['no', 'not interested', 'maybe later', 'busy', 'expensive', 'too much', 'can\'t'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      positiveKeywords.forEach(word => {
        if (content.includes(word)) positiveCount++;
      });
      negativeKeywords.forEach(word => {
        if (content.includes(word)) negativeCount++;
      });
    });

    const sentimentScore = Math.max(0.1, Math.min(0.9, (positiveCount + 1) / (positiveCount + negativeCount + 2)));

    // Determine engagement level
    const messageRatio = conversationHistory.length > 0 ? userMessages.length / conversationHistory.length : 0;
    const engagementLevel = 
      detectedSignals.length > 2 && messageRatio > 0.3 ? 'high' :
      detectedSignals.length > 0 && messageRatio > 0.2 ? 'medium' : 'low';

    // Calculate conversation quality
    const qualityScore = Math.min(0.95, 
      (conversationHistory.length * 0.1 + sentimentScore * 0.6 + detectedSignals.length * 0.3)
    );

    // Extract key topics
    const topicKeywords = {
      'SUV': ['suv', 'crossover', 'cx-5', 'rav4', 'crv'],
      'Sedan': ['sedan', 'camry', 'accord', 'altima'],
      'Truck': ['truck', 'pickup', 'f-150', 'silverado'],
      'Financing': ['financing', 'loan', 'credit', 'payment'],
      'Trade-in': ['trade', 'trade-in', 'current car'],
      'Insurance': ['insurance', 'coverage', 'full coverage']
    };

    const keyTopics: string[] = [];
    const allContent = conversationHistory.map(m => m.content.toLowerCase()).join(' ');
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allContent.includes(keyword))) {
        keyTopics.push(topic);
      }
    });

    // Calculate average response time (mock for now)
    const avgResponseTime = userMessages.length > 1 ? 
      Math.floor(Math.random() * 30) + 10 : 0;

    const lastActivity = conversationHistory.length > 0 ? 
      new Date(conversationHistory[conversationHistory.length - 1].timestamp) : null;

    setAnalytics({
      buyingSignals: detectedSignals.slice(0, 3), // Show top 3
      sentimentScore,
      engagementLevel,
      conversationQuality: qualityScore,
      keyTopics: keyTopics.slice(0, 3), // Show top 3
      avgResponseTime,
      lastActivity
    });
  }, [conversationHistory]);

  const getSentimentColor = (score: number) => {
    if (score > 0.7) return 'text-green-700 bg-green-100';
    if (score > 0.4) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.7) return <ThumbsUp className="w-3 h-3" />;
    if (score > 0.4) return <MessageSquare className="w-3 h-3" />;
    return <ThumbsDown className="w-3 h-3" />;
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-700 bg-green-100 border-green-300';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-red-700 bg-red-100 border-red-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  if (conversationHistory.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-xs">No conversation data yet</p>
        <p className="text-xs">Start a conversation to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conversation Quality & Sentiment */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-3 bg-blue-50 rounded-lg border">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Brain className="w-3 h-3 text-blue-600" />
            <span className="font-medium text-xs text-blue-800">Quality</span>
          </div>
          <div className="text-lg font-bold text-blue-700">
            {Math.round(analytics.conversationQuality * 100)}%
          </div>
          <Progress value={analytics.conversationQuality * 100} className="mt-1 h-1" />
        </div>
        
        <div className={`text-center p-3 rounded-lg border ${getSentimentColor(analytics.sentimentScore)}`}>
          <div className="flex items-center justify-center gap-1 mb-1">
            {getSentimentIcon(analytics.sentimentScore)}
            <span className="font-medium text-xs">Sentiment</span>
          </div>
          <div className="text-lg font-bold">
            {Math.round(analytics.sentimentScore * 100)}%
          </div>
          <div className="text-xs opacity-75">
            {analytics.sentimentScore > 0.7 ? 'Positive' : 
             analytics.sentimentScore > 0.4 ? 'Neutral' : 'Negative'}
          </div>
        </div>
      </div>

      {/* Engagement Level */}
      <div className="p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-gray-600" />
            <span className="font-medium text-xs text-gray-700">Engagement</span>
          </div>
          <Badge className={`text-xs ${getEngagementColor(analytics.engagementLevel)}`}>
            {analytics.engagementLevel.toUpperCase()}
          </Badge>
        </div>
        <Progress 
          value={analytics.engagementLevel === 'high' ? 85 : analytics.engagementLevel === 'medium' ? 60 : 30} 
          className="h-2" 
        />
      </div>

      {/* Buying Signals */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 mb-2">
          <Target className="w-3 h-3 text-green-600" />
          <span className="font-medium text-xs text-gray-700">
            Buying Signals ({analytics.buyingSignals.length})
          </span>
        </div>
        {analytics.buyingSignals.length > 0 ? (
          <div className="space-y-1">
            {analytics.buyingSignals.map((signal, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-800">{signal}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2 bg-gray-50 rounded border">
            <span className="text-xs text-gray-500">No buying signals detected yet</span>
          </div>
        )}
      </div>

      {/* Key Topics */}
      {analytics.keyTopics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-blue-600" />
            <span className="font-medium text-xs text-gray-700">Key Topics</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analytics.keyTopics.map((topic, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-gray-600" />
          </div>
          <div className="text-sm font-medium text-gray-700">{analytics.avgResponseTime}s</div>
          <div className="text-xs text-gray-500">Avg Response</div>
        </div>
        
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageSquare className="w-3 h-3 text-gray-600" />
          </div>
          <div className="text-sm font-medium text-gray-700">{conversationHistory.length}</div>
          <div className="text-xs text-gray-500">Total Messages</div>
        </div>
      </div>

      {/* Live Call Alert */}
      {isCallActive && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <Phone className="w-3 h-3 text-orange-600" />
            <span className="text-xs font-medium text-orange-800">Live Call Active</span>
          </div>
          <div className="text-xs text-orange-700 mt-1">
            Real-time analysis in progress
          </div>
        </div>
      )}

      {/* Action Recommendations */}
      {analytics.buyingSignals.length > 0 && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Recommended Action</span>
          </div>
          <div className="text-xs text-blue-700">
            {analytics.engagementLevel === 'high' ? 
              'Close for appointment - high engagement detected!' :
              'Ask qualifying questions - buying interest shown'
            }
          </div>
        </div>
      )}
    </div>
  );
}; 