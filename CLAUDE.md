# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jack Automotive AI Assistant is a comprehensive dealership management system for Prestige Motors, built with React, TypeScript, and Vite. The application provides AI-powered tools for inventory management, customer communication, market analysis, and specialized subprime lead management.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally
- `npm run server` - Start Express backend server
- `npm run dev:full` - Run both frontend and backend concurrently (RECOMMENDED for full-stack development)
- `npm run test:supabase` - Test Supabase persistence layer
- `npm run setup:crm` - Install Supabase dependencies and display setup instructions

### Build and Deploy
- `npm run build:fallback` - Fallback build script using build-fallback.mjs
- `npm start` - Start production server (alias for `npm run server`)

### System Requirements
- Node.js >= 18.0.0
- npm >= 8.0.0

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Backend**: Express.js server with WebSocket support
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **State Management**: React Context + TanStack Query
- **Routing**: React Router DOM
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Voice/SMS**: Twilio integration with ElevenLabs AI agents

### Application Structure

The app is organized into 5 main tabs/pages:
1. **Inventory Dashboard** (`/inventory`) - Vehicle inventory management with AI pricing
2. **Chat with Jack** (`/chat`) - AI-powered customer service assistant
3. **Customer Conversations** (`/conversations`) - SMS conversation management
4. **Market Insights** (`/insights`) - Real-time market analysis and competitor data
5. **Subprime Leads** (`/subprime`) - Advanced lead management system (primary focus)

### Key Directories

- `src/components/` - Reusable UI components organized by feature
  - `auth/` - Authentication components (LoginForm, SignupForm, ProtectedRoute)
  - `subprime/` - Subprime lead management components (primary feature area)
  - `inventory/` - Vehicle inventory management components
  - `chat/` - AI chat interface components
  - `ui/` - shadcn/ui component library
- `src/pages/` - Main application pages/routes
- `src/services/` - API services and external integrations
- `src/integrations/supabase/` - Supabase client and type definitions
- `src/contexts/` - React context providers
- `src/data/` - Mock data and type definitions
- `server.js` - Express backend with WebSocket and Twilio integration

### Authentication & Multi-tenancy

The application uses Supabase auth with organization-based multi-tenancy:
- Users belong to organizations via `organization_memberships` table
- Row-level security (RLS) policies enforce data isolation between organizations
- Protected routes require authentication via `ProtectedRoute` component
- Auth context (`AuthContext.tsx`) manages user session state

### Database Schema

Key Supabase tables:
- `users` - User authentication and profile data
- `organizations` - Multi-tenant organization data
- `organization_memberships` - User-organization associations
- `leads` - Subprime lead management (core feature)
- `conversations` - SMS conversation history
- `conversation_messages` - Individual messages with real-time updates

### Real-time Features

- WebSocket connections for live conversation updates
- Supabase real-time subscriptions for database changes
- Server-sent events (SSE) for streaming responses
- ElevenLabs integration for AI voice agents
- Twilio webhooks for SMS processing

### External Integrations

- **Supabase**: Database, auth, real-time subscriptions
- **Twilio**: SMS messaging and phone number management
- **ElevenLabs**: AI voice agents with conversation analysis
- **Express**: Backend API with CORS and WebSocket support

## Development Guidelines

### Code Organization
- Components are organized by feature area within `src/components/`
- Each major feature has its own subdirectory with related components
- Shared UI components live in `src/components/ui/`
- API services are centralized in `src/services/`

### Styling Conventions
- Uses Tailwind CSS utility classes
- Custom theme configured in `tailwind.config.ts`
- shadcn/ui component library for consistent design system
- Responsive design with mobile-first approach

### State Management
- React Context for global state (auth, themes)
- TanStack Query for server state management and caching
- Local component state with React hooks
- Real-time updates via Supabase subscriptions

### Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice agents

### Key Features to Understand

#### Subprime Lead Management (Primary Feature)
The most complex feature with sophisticated lead tracking, automated chase sequences, sentiment analysis, and specialist assignment. Located in `src/components/subprime/` and `src/pages/SubprimeDashboard.tsx`.

**Critical Components:**
- `TelephonyInterface-fixed.tsx` - Main conversation interface with Profile/Analytics/Settings tabs
- `SubprimeAnalytics.tsx` - Performance metrics and analytics dashboard
- `SubprimeLeadsList.tsx` - Lead management table with filtering
- `ConversationInterface.tsx` - ElevenLabs AI voice/text conversation component

#### Real-time Conversations
SMS conversations with real-time updates via WebSocket and Supabase subscriptions. Handles conversation history, message threading, and lead association.

**Important Note:** CustomerConversations page (`/conversations`) currently uses static mock data from `src/data/conversations/customerConversations.ts` and is NOT connected to real-time Supabase data.

#### AI Voice Integration
ElevenLabs AI agents with dynamic conversation variables, inbound call handling, and post-call analytics. Configuration managed through organization-specific phone number assignments.

**Key Service:** `src/services/elevenLabsService.ts` handles conversation management and `src/services/twilioService.ts` manages SMS/voice integration.

#### Multi-tenant Security
Organization-based data isolation with RLS policies, secure user authentication, and proper data access controls throughout the application.

**Security Pattern:** All API calls require organization context headers to prevent cross-organization data leakage.

## Common Development Tasks

### Adding New Features
1. Create components in appropriate feature directory under `src/components/`
2. Add routes in `src/App.tsx` if needed
3. Update Supabase schema if database changes required
4. Add TypeScript types in relevant files
5. Test with both frontend and backend running (`npm run dev:full`)

### Database Migrations
- SQL files in `database/migrations/` directory
- Apply via Supabase dashboard or CLI
- Update TypeScript types in `src/integrations/supabase/types.ts`

### Testing Integrations
- Use `npm run test:supabase` for database connectivity
- Test Twilio integration with webhook endpoints
- Verify ElevenLabs agent configuration with test calls

### Working with Real-time Data
- Check if components use real Supabase data vs mock data in `src/data/`
- Look for `useQuery`, `supabase.from()`, or real-time subscriptions
- Mock data files are in `src/data/` organized by feature
- Real-time subscriptions use `supabase.channel()` pattern

### Debugging
- Check browser console for frontend errors
- Monitor Express server logs for backend issues
- Use Supabase dashboard for database queries and real-time monitoring
- Review Twilio console for SMS delivery status
- For analytics issues, verify database field mappings match component calculations

### Backend Development
- Express server in `server.js` handles API routes, WebSocket, and Twilio webhooks
- Multi-tenant security enforced via organization headers
- Cache management system in `services/cacheManager.js`
- Supabase persistence layer in `services/supabasePersistence.js`