# 🚀 Deployment Checklist

## ✅ Pre-Deployment
- [ ] All environment variables ready
- [ ] GitHub repository is up to date
- [ ] `render.yaml` configuration file exists
- [ ] Production build works locally (`npm run build`)

## ✅ Render Deployment
- [ ] Sign up at render.com
- [ ] Connect GitHub repository
- [ ] Create Web Service from repo
- [ ] Add all environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `ELEVENLABS_API_KEY`
  - [ ] `ELEVENLABS_AGENT_ID`
  - [ ] `ELEVENLABS_PHONE_NUMBER_ID`
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_PHONE_NUMBER`
- [ ] Deploy and wait for build completion

## ✅ Post-Deployment
- [ ] Test health endpoint: `/api/health`
- [ ] Test frontend loads correctly
- [ ] Update ElevenLabs webhook URL
- [ ] Update Twilio webhook URLs
- [ ] Test end-to-end call flow
- [ ] Test SMS functionality
- [ ] Verify SSE streaming works

## 🔗 Webhook URLs to Update

**ElevenLabs Agent Settings:**
```
https://your-app-name.onrender.com/api/webhooks/elevenlabs/post-call
```

**Twilio Phone Number Settings:**
```
SMS: https://your-app-name.onrender.com/api/webhooks/twilio/sms/incoming
Voice: https://your-app-name.onrender.com/api/webhooks/twilio/voice/status
```

## 🎯 Ready to Deploy!

Your Jack Automotive AI Assistant is configured for modern, scalable deployment with:
- ✅ Automatic HTTPS
- ✅ SSE streaming support
- ✅ Webhook compatibility
- ✅ Production optimizations
- ✅ Health monitoring 