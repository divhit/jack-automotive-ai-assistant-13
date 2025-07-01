import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://dgzadilmtuqvimolzxms.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;

    // Fetch conversations for this lead
    const { data: conversations, error: convError } = await supabase
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

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Process the conversation data
    const allMessages = conversations?.flatMap(conv => conv.messages || []) || [];
    const userMessages = allMessages.filter(msg => msg.sender_type === 'user');
    const agentMessages = allMessages.filter(msg => msg.sender_type === 'agent');

    // Analyze buying signals
    const buyingSignalKeywords = [
      'price', 'cost', 'financing', 'payment', 'loan', 'monthly',
      'test drive', 'visit', 'see the car', 'schedule', 'appointment',
      'trade-in', 'down payment', 'lease', 'buy', 'purchase',
      'when can', 'available', 'in stock', 'delivery', 'pickup'
    ];

    const buyingSignals: string[] = [];
    userMessages.forEach(msg => {
      if (msg.content) {
        const content = msg.content.toLowerCase();
        buyingSignalKeywords.forEach(keyword => {
          if (content.includes(keyword)) {
            const signal = mapKeywordToSignal(keyword);
            if (signal && !buyingSignals.includes(signal)) {
              buyingSignals.push(signal);
            }
          }
        });
      }
    });

    // Analyze sentiment
    const positiveKeywords = ['interested', 'yes', 'great', 'good', 'perfect', 'love', 'want', 'like', 'sounds good'];
    const negativeKeywords = ['no', 'not interested', 'maybe later', 'busy', 'expensive', 'too much', 'can\'t afford'];

    let positiveCount = 0;
    let negativeCount = 0;

    userMessages.forEach(msg => {
      if (msg.content) {
        const content = msg.content.toLowerCase();
        positiveKeywords.forEach(keyword => {
          if (content.includes(keyword)) positiveCount++;
        });
        negativeKeywords.forEach(keyword => {
          if (content.includes(keyword)) negativeCount++;
        });
      }
    });

    const sentimentScore = Math.max(0.1, Math.min(0.95, (positiveCount + 1) / (positiveCount + negativeCount + 2)));
    const conversationQuality = Math.min(0.95, (allMessages.length * 0.1 + sentimentScore * 0.6 + buyingSignals.length * 0.3) / 1.0);
    const engagementLevel = buyingSignals.length > 2 ? 'high' : buyingSignals.length > 0 ? 'medium' : 'low';

    // Calculate conversation duration
    const timestamps = allMessages.map(m => new Date(m.created_at).getTime()).sort((a, b) => a - b);
    const conversationDuration = timestamps.length > 1 ? 
      Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 1000) : 0;

    const analytics = {
      messageCount: allMessages.length,
      userMessages: userMessages.length,
      agentMessages: agentMessages.length,
      sentimentScore,
      conversationQuality,
      buyingSignals: buyingSignals.slice(0, 4), // Return max 4 signals
      engagementLevel,
      conversationDuration,
      lastActivity: allMessages.length > 0 ? allMessages[0].created_at : null,
      avgResponseTime: 5, // Mock value - could be calculated from message timestamps
      dataSource: 'supabase'
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapKeywordToSignal(keyword: string): string | null {
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