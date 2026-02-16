import React from 'react';
import { Target, TrendingUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DarkAnalyticsTabProps {
  analyticsData: {
    leadScore: number;
    conversionProbability: number;
    contactAttempts: number;
    fundingReadiness: string;
    sentiment: string;
    chaseStatus: string;
  };
  conversationHistory: Array<{ type: string; sentBy: string; timestamp: string }>;
}

const DarkAnalyticsTab: React.FC<DarkAnalyticsTabProps> = ({
  analyticsData,
  conversationHistory,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Average';
    return 'Low';
  };

  const getConversionColor = (probability: number) => {
    if (probability >= 0.7) return 'text-emerald-400';
    if (probability >= 0.4) return 'text-amber-400';
    return 'text-red-400';
  };

  const getConversionLabel = (probability: number) => {
    if (probability >= 0.7) return 'High';
    if (probability >= 0.4) return 'Medium';
    return 'Low';
  };

  const getFundingReadinessBadge = (status: string) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
      case 'Partial':
        return 'bg-amber-900/50 text-amber-400 border-amber-700';
      case 'Not Ready':
        return 'bg-red-900/50 text-red-400 border-red-700';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'Warm':
        return '😊';
      case 'Neutral':
        return '😐';
      case 'Negative':
        return '😕';
      case 'Frustrated':
        return '😤';
      case 'Ghosted':
        return '👻';
      case 'Cold':
        return '🥶';
      case 'Needs Human':
        return '🙋';
      default:
        return '🤔';
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'Warm':
        return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
      case 'Neutral':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'Negative':
      case 'Frustrated':
        return 'bg-red-900/50 text-red-400 border-red-700';
      case 'Ghosted':
      case 'Cold':
        return 'bg-blue-900/50 text-blue-400 border-blue-700';
      case 'Needs Human':
        return 'bg-amber-900/50 text-amber-400 border-amber-700';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getChaseStatusBadge = (status: string) => {
    switch (status) {
      case 'Auto Chase Running':
        return 'bg-blue-900/50 text-blue-400 border-blue-700';
      case 'Paused':
        return 'bg-amber-900/50 text-amber-400 border-amber-700';
      case 'Completed':
        return 'bg-emerald-900/50 text-emerald-400 border-emerald-700';
      case 'Manual Review':
        return 'bg-purple-900/50 text-purple-400 border-purple-700';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const conversionPercent = Math.round((analyticsData.conversionProbability || 0) * 100);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Top row: 3 stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Lead Score */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-zinc-500 uppercase">Lead Score</span>
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(analyticsData.leadScore || 0)}`}>
            {analyticsData.leadScore || 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {getScoreLabel(analyticsData.leadScore || 0)}
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3">
            <div
              className={`h-1.5 rounded-full transition-all ${getScoreBarColor(analyticsData.leadScore || 0)}`}
              style={{ width: `${analyticsData.leadScore || 0}%` }}
            />
          </div>
        </div>

        {/* Conversion */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-zinc-500 uppercase">Conversion</span>
          </div>
          <div className={`text-3xl font-bold ${getConversionColor(analyticsData.conversionProbability || 0)}`}>
            {conversionPercent}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {getConversionLabel(analyticsData.conversionProbability || 0)} probability
          </div>
        </div>

        {/* Contact Attempts */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-zinc-500 uppercase">Contact Attempts</span>
          </div>
          <div className="text-3xl font-bold text-zinc-100">
            {analyticsData.contactAttempts || 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">total attempts</div>
        </div>
      </div>

      {/* Middle row: 2 info cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Funding Readiness */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <span className="text-xs text-zinc-500 uppercase">Funding Readiness</span>
          <div className="mt-3">
            <Badge className={`text-sm px-3 py-1 ${getFundingReadinessBadge(analyticsData.fundingReadiness || 'Not Ready')}`}>
              {analyticsData.fundingReadiness || 'Not Ready'}
            </Badge>
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <span className="text-xs text-zinc-500 uppercase">Sentiment</span>
          <div className="mt-3">
            <Badge className={`text-sm px-3 py-1 ${getSentimentBadge(analyticsData.sentiment || 'Neutral')}`}>
              {getSentimentEmoji(analyticsData.sentiment || 'Neutral')}{' '}
              {analyticsData.sentiment || 'Neutral'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom: Chase Status */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <span className="text-xs text-zinc-500 uppercase">Chase Status</span>
        <div className="mt-3 flex items-center gap-3">
          <Badge className={`text-sm px-3 py-1 ${getChaseStatusBadge(analyticsData.chaseStatus || 'Inactive')}`}>
            {analyticsData.chaseStatus || 'Inactive'}
          </Badge>
          {conversationHistory.length > 0 && (
            <span className="text-xs text-zinc-500">
              {conversationHistory.length} conversation{conversationHistory.length !== 1 ? 's' : ''} recorded
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DarkAnalyticsTab;
