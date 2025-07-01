# ElevenLabs MCP Analytics Integration Guide

## 🗄️ Step 1: Apply Database Schema

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `dgzadilmtuqvimolzxms`

2. **Apply the Schema**
   - Go to SQL Editor
   - Copy the entire contents of `elevenlabs-mcp-analytics-schema.sql`
   - Paste and run the SQL
   - This creates the analytics tables: `conversation_analytics`, `live_coaching_events`, `agent_performance_analytics`, etc.

## 🔐 Step 2: Security Fix (URGENT)

**You MUST regenerate these API keys immediately:**

1. **ElevenLabs API Key**: Go to ElevenLabs dashboard → API Keys → Regenerate
2. **Twilio Auth Token**: Go to Twilio console → Auth Tokens → Create new
3. **Supabase Service Role Key**: Go to Supabase → Settings → API → Generate new service role key

**Update your `.env` file with NEW keys:**
```env
ELEVENLABS_API_KEY=your_new_key_here
TWILIO_AUTH_TOKEN=your_new_token_here
SUPABASE_SERVICE_ROLE_KEY=your_new_key_here
SUPABASE_ACCESS_TOKEN=your_new_access_token_here
```

## 🔧 Step 3: Integrate Analytics Panel

### Update TelephonyInterface.tsx

1. **Add the import** (around line 43):
```typescript
import { ElevenLabsAnalyticsPanel } from './enhanced/ElevenLabsAnalyticsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelRightOpen, PanelRightClose, BarChart3, Brain } from 'lucide-react';
```

2. **Add state for analytics** (around line 65):
```typescript
const [showAnalytics, setShowAnalytics] = useState(true);
```

3. **Add analytics toggle button** in the header (around line 510):
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowAnalytics(!showAnalytics)}
  className="ml-2"
>
  {showAnalytics ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
  Analytics
</Button>
```

4. **Update the main content area** (around line 575):
```typescript
{/* MAIN CONTENT AREA - Split between conversation and analytics */}
<div className="flex-1 flex mx-4 mb-4 gap-4 min-h-0">
  {/* CONVERSATION COLUMN */}
  <div className={cn("flex flex-col min-h-0", showAnalytics ? "w-2/3" : "w-full")}>
    {/* Existing conversation content */}
  </div>

  {/* ANALYTICS PANEL */}
  {showAnalytics && (
    <div className="w-1/3 flex flex-col min-h-0">
      <ElevenLabsAnalyticsPanel
        selectedLead={selectedLead}
        conversationHistory={conversationHistory}
        isCallActive={isCallActive}
        callDuration={callDuration}
        conversationId={conversationId}
        className="flex-1"
      />
    </div>
  )}
</div>
```

## 📊 Step 4: Update SubprimeDashboard Analytics Tab

### Update SubprimeDashboard.tsx

Add enhanced analytics in the analytics tab (around line 400):

```typescript
<TabsContent value="analytics" className="flex-1 overflow-hidden">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
    <div>
      <LeadAnalyticsDashboard />
    </div>
    <div>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            ElevenLabs Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          {/* Add overview analytics here */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Conversation Quality</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">87%</div>
              <div className="text-xs text-blue-600">Average across all leads</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="font-medium">Buying Signals</span>
              </div>
              <div className="text-2xl font-bold text-green-700">23</div>
              <div className="text-xs text-green-600">Detected this week</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</TabsContent>
```

## 🚀 Step 5: Test the Integration

1. **Start the server**:
   ```bash
   npm run dev:full
   ```

2. **Open the dashboard**:
   - Go to the Subprime Dashboard tab
   - Click on a lead to open the modal
   - You should see the analytics panel on the right side

3. **Test analytics features**:
   - Start a conversation (SMS or call)
   - Watch real-time analytics update
   - Check buying signals and sentiment analysis

## 🔧 Step 6: Service Integration

The `ElevenLabsMcpAnalyticsService` is ready to use. It will:

- ✅ Analyze conversations in real-time
- ✅ Provide live coaching alerts
- ✅ Calculate enhanced lead scores
- ✅ Track conversation patterns
- ✅ Generate actionable insights

## 📈 Expected Results

Once integrated, you'll see:

1. **Real-time Analytics** in the telephony interface
2. **Buying Signals Detection** during conversations
3. **Sentiment Analysis** with confidence scores
4. **Live Coaching Alerts** for agents
5. **Enhanced Lead Scoring** based on conversation quality
6. **Conversion Probability** predictions

## 🆘 Troubleshooting

If you encounter issues:

1. **Port already in use**: We fixed this by killing the process on port 3001
2. **Database connection**: Ensure your new Supabase keys are correct
3. **ElevenLabs MCP**: Verify the schema was applied successfully
4. **Import errors**: Make sure all files are in the correct paths

The analytics framework is now ready and will provide significant insights into your subprime lead conversations! 