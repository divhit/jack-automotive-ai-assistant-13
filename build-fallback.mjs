import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

if (!fs.existsSync(distDir)) {
  console.log('📁 Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
  
  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jack Automotive AI Assistant</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; }
    .status { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .endpoints { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .endpoint { margin: 8px 0; }
    a { color: #0ea5e9; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚗 Jack Automotive AI Assistant</h1>
    <div class="status">
      <h2>✅ API Server Running</h2>
      <p>The backend API is operational and ready to handle webhook requests.</p>
      <p><strong>Note:</strong> This is the fallback page. The full React UI build may have failed or is not available.</p>
    </div>
    
    <div class="endpoints">
      <h3>Available Endpoints:</h3>
      <div class="endpoint">🏥 <a href="/api/health">Health Check</a></div>
      <div class="endpoint">📱 <code>/api/webhooks/twilio/sms/incoming</code> - SMS Webhooks</div>
      <div class="endpoint">📞 <code>/api/webhooks/twilio/voice/status</code> - Voice Webhooks</div>
      <div class="endpoint">🎙️ <code>/api/webhooks/elevenlabs/post-call</code> - ElevenLabs Post-Call</div>
      <div class="endpoint">📊 <code>/api/stream/conversation/{leadId}</code> - SSE Streaming</div>
    </div>
    
    <p><small>If you're seeing this page, the React build process may need attention. Check the deployment logs for more details.</small></p>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(path.join(distDir, 'index.html'), fallbackHtml);
  console.log('✅ Created fallback dist/index.html');
} else {
  console.log('📁 Dist directory already exists, skipping fallback creation');
} 