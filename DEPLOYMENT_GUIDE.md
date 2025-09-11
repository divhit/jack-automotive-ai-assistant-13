# 🚀 Jack Automotive AI Assistant - Deployment Guide

## 📋 Prerequisites

- Git repository (GitHub, GitLab, etc.)
- Environment variables (API keys)
- Domain name (optional, Render provides free subdomain)

## 🎯 Recommended Deployment: Render.com

### Why Render?
- ✅ Perfect for telephony apps with webhooks
- ✅ Supports SSE streaming and WebSocket connections
- ✅ Automatic HTTPS (required for ElevenLabs/Twilio)
- ✅ Easy environment variable management
- ✅ Automatic deployments from Git
- ✅ Modern stack, great developer experience

### 🔧 Step-by-Step Deployment

#### 1. Prepare Your Repository

Ensure these files are in your repo:
- `render.yaml` ✅ (already created)
- Updated `server.js` with production config ✅
- Updated `package.json` with build scripts ✅

#### 2. Deploy to Render

1. **Sign up** at [render.com](https://render.com)

2. **Connect GitHub** repository

3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Render will auto-detect the `render.yaml` config

4. **Configure Environment Variables**:
   ```
   NODE_ENV=production
   PORT=3001
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_AGENT_ID=your_agent_id
   ELEVENLABS_PHONE_NUMBER_ID=your_phone_number_id
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

5. **Deploy**: Click "Create Web Service"

#### 3. Update Webhook URLs

Once deployed, you'll get a URL like: `https://your-app-name.onrender.com`

Update your webhook URLs in:

**ElevenLabs Agent Settings**:
```
Post-call webhook: https://your-app-name.onrender.com/api/webhooks/elevenlabs/post-call
```

**Twilio Phone Number Settings**:
```
SMS webhook: https://your-app-name.onrender.com/api/webhooks/twilio/sms/incoming
Voice webhook: https://your-app-name.onrender.com/api/webhooks/twilio/voice/status
```

### 🔍 Verify Deployment

1. **Health Check**: Visit `https://your-app-name.onrender.com/api/health`
2. **Frontend**: Visit `https://your-app-name.onrender.com`
3. **Test Call**: Make a test call through the UI
4. **Check Logs**: Monitor Render logs for webhook activity

## 🔄 Alternative Deployments

### Option 2: Railway.app

1. **Sign up** at [railway.app](https://railway.app)
2. **Connect GitHub** repository
3. **Add environment variables**
4. **Deploy** - Railway auto-detects Node.js apps
5. **Update webhook URLs** with Railway-provided domain

### Option 3: Fly.io (Advanced)

1. **Install Fly CLI**: `npm install -g @flydotio/flyctl`
2. **Login**: `fly auth login`
3. **Create app**: `fly apps create your-app-name`
4. **Set environment variables**: `fly secrets set KEY=value`
5. **Deploy**: `fly deploy`

## 📊 Production Considerations

### 1. Database Integration
Currently using in-memory storage. For production, consider:
- **PostgreSQL** (Render provides managed databases)
- **Redis** for session storage
- **Supabase** for real-time features

### 2. Monitoring & Logging
- **Render**: Built-in logs and metrics
- **Sentry**: Error tracking
- **LogRocket**: User session replay

### 3. Performance Optimization
- **CDN**: Render includes CDN for static assets
- **Caching**: Implement Redis for conversation caching
- **Load balancing**: Render handles this automatically

### 4. Security Enhancements
- **Webhook signature validation** (currently disabled for debugging)
- **Rate limiting** for API endpoints
- **CORS** configuration for production domains

## 🚨 Troubleshooting

### Common Issues:

1. **Webhooks not working**:
   - Check webhook URLs are HTTPS
   - Verify environment variables
   - Check Render logs for errors

2. **SSE streaming issues**:
   - Ensure frontend connects to correct domain
   - Check CORS settings
   - Monitor connection logs

3. **Build failures**:
   - Check Node.js version compatibility
   - Verify all dependencies in package.json
   - Review build logs in Render dashboard

### Debug Endpoints:
- `/api/health` - Service health check
- `/api/debug/get-history` - View conversation history
- `/api/debug/clear-history` - Clear conversation history

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Test webhooks with ngrok locally
3. Verify all environment variables are set
4. Review the troubleshooting section above

---

**🎉 Your Jack Automotive AI Assistant is now live and ready for production use!** 