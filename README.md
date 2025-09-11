# Jack Automotive AI Assistant

**Prestige Motors Dealership Management System**

A comprehensive AI-powered automotive dealership management system built with React, TypeScript, and Vite. This application provides advanced tools for inventory management, customer communication, market analysis, and specialized subprime lead management.

## Project Overview

**URL**: https://lovable.dev/projects/15d9f4f1-169d-499d-a83f-bc87918b404f

Jack is an intelligent automotive assistant designed to streamline dealership operations across multiple key areas:

- **Inventory Management** - Smart vehicle inventory tracking with AI-powered pricing recommendations
- **AI Chat Assistant** - Intelligent customer service and inquiry handling
- **Customer Communication** - SMS conversation management and lead tracking
- **Market Intelligence** - Real-time market analysis and competitive insights
- **Subprime Lead Management** - Advanced lead qualification and nurturing system

## Application Architecture

### Tab-Based Interface

The application features a clean, tab-based interface with 5 main sections:

1. **Inventory Dashboard** 📊
2. **Chat with Jack** 🤖
3. **Customer Conversations** 💬
4. **Market Insights** 📈
5. **Subprime Leads** 💰

---

## 1. Inventory Dashboard 📊

**Purpose**: Comprehensive vehicle inventory management with AI-powered market analysis

### Key Features:

#### Vehicle Inventory Management
- **Stock Tracking**: Real-time inventory monitoring with stock numbers, make, model, year
- **Mileage & Pricing**: Current pricing vs AI-recommended pricing analysis
- **Days in Inventory**: Track how long vehicles have been on the lot
- **Search & Sort**: Advanced filtering by stock number, make, model, year

#### AI-Powered Pricing Intelligence
- **Market Comparison**: Real-time comparison with similar vehicles in the market
- **Price Recommendations**: AI suggests optimal pricing based on market conditions
- **Competitive Analysis**: See how inventory compares to competitor listings

#### Analytics & Insights
- **Performance Metrics**: Track inventory turnover, pricing effectiveness
- **Market Trends**: Identify best-selling categories and optimal pricing strategies
- **Inventory Age Analysis**: Monitor vehicles that may need price adjustments

### Functionality Details:
- Sortable columns for all key metrics
- Vehicle-specific market analysis dialog
- Integration with market comparable listings
- Real-time pricing adjustment recommendations

---

## 2. Chat with Jack 🤖

**Purpose**: AI-powered customer service and automotive inquiry assistant

### Key Features:

#### Intelligent Conversation Management
- **Natural Language Processing**: Understands automotive-specific queries
- **Real-time Responses**: Instant AI-generated responses to customer inquiries
- **Conversation History**: Full chat history with timestamps

#### Customizable Communication Styles
- **Style Selection**: Multiple communication approaches (Professional, Friendly, Technical)
- **Adaptive Responses**: Jack adjusts tone and complexity based on selected style
- **Context Awareness**: Remembers conversation context for coherent interactions

#### Voice & Text Input
- **Voice Recognition**: Simulated voice input for hands-free operation
- **Text Input**: Traditional keyboard input with enter-to-send functionality
- **Example Queries**: Pre-loaded examples to guide user interactions

### Functionality Details:
- Chat examples for common automotive scenarios
- Typing indicators for natural conversation flow
- Communication style settings for different customer types
- Auto-focus on input field for seamless interaction

---

## 3. Customer Conversations 💬

**Purpose**: SMS conversation management and customer lead tracking

### Key Features:

#### SMS Conversation Management
- **Unified Inbox**: All customer SMS conversations in one interface
- **Conversation Threading**: Grouped messages by customer for context
- **Real-time Updates**: Live conversation monitoring and updates

#### Lead Tracking & Management
- **Lead Sources**: Track where customers originated (website, referrals, etc.)
- **Vehicle Inquiries**: Associate conversations with specific vehicle interests
- **Status Management**: Track conversation status (Active, Closed, Follow-up Needed, etc.)

#### Customer Intelligence
- **Contact Information**: Phone numbers, names, and inquiry details
- **Interaction History**: Complete timeline of all customer touchpoints
- **Status Badges**: Visual indicators for conversation priority and status

### Functionality Details:
- Advanced search across all conversations
- Sortable columns for efficient organization
- Status-based filtering and organization
- Quick action buttons for common responses

---

## 4. Market Insights 📈

**Purpose**: Real-time market analysis and competitive intelligence

### Key Features:

#### Price Adjustment Opportunities
- **AI-Powered Recommendations**: Intelligent pricing suggestions based on market data
- **Current vs Recommended**: Side-by-side comparison of current and optimal pricing
- **Reasoning Engine**: Detailed explanations for each pricing recommendation
- **Visual Indicators**: Up/down arrows showing recommended price changes

#### Market Trend Analysis
- **Category Performance**: Analysis by vehicle type (SUVs, sedans, trucks, etc.)
- **Trend Identification**: Rising/falling market segments
- **Demand Forecasting**: Predictive insights for inventory planning

#### Competitor Analysis
- **Competitive Landscape**: Monitor nearby dealership pricing and inventory
- **Distance Mapping**: Track competitors within market radius
- **Pricing Strategies**: Analyze competitor pricing approaches
- **Market Position**: Understand your position relative to competition

#### Inventory Recommendations
- **Allocation Guidance**: Suggestions for inventory mix optimization
- **Category Performance**: Which vehicle types to increase/decrease
- **Market Demand**: Data-driven inventory acquisition recommendations

### Functionality Details:
- Real-time market data integration
- Visual charts and performance metrics
- Competitor distance and pricing analysis
- Inventory allocation optimization tools

---

## 5. Subprime Leads 💰 (Primary Focus Area)

**Purpose**: Comprehensive subprime customer lead management and nurturing system

### Overview
The Subprime Leads tab is a sophisticated lead management system specifically designed for handling customers with challenging credit situations. It provides advanced tracking, automated nurturing, and detailed analytics to maximize conversion rates for subprime customers.

### Key Components:

#### 🎯 Lead Status Dashboard (Interactive Tiles)

**Four main status categories with detailed breakdowns:**

1. **In Progress Leads (Yellow)**
   - Shows leads currently being processed
   - Breakdown by screening/qualification stages
   - Automated follow-up sequence tracking
   - Key metrics: Income verification (64%), Credit documentation (27%)

2. **Not Ready Leads (Red)**
   - Leads not yet ready for funding
   - Major collections issues tracking
   - Bankruptcy status monitoring
   - Ghosted leads identification (72+ hours no response)
   - Focus areas: Credit repair education (38%), Income verification (24%)

3. **Needs Action Leads (Purple)**
   - Overdue tasks and urgent follow-ups
   - Frustrated customer identification
   - Manual review flagging
   - Priority contact categorization: Manual Review (48%), Document Collection (37%)

4. **Ready for Funding (Green)**
   - Leads approved for financing
   - Traditional vs special program breakdown
   - Alternative financing options
   - Performance metric: Average 3.2 days to funding ready

#### 🔍 Advanced Lead Management

**Search & Filtering System:**
- **Real-time Search**: Search by customer name or phone number
- **Multi-dimensional Filters**:
  - Chase Status: Auto Chase Running, Paused, Completed, Manual Review
  - Funding Readiness: Ready, Partial, Not Ready
  - Sentiment: Warm 😊, Neutral 😐, Negative 😕, Ghosted 😴, Cold 🧊, Frustrated 🗯️, Needs Human 🙋
  - Script Progress: Contacted, Screening, Qualification, Routing, Submitted
  - Overdue Actions: Toggle for urgent items only

**Lead List Display:**
- Customer name and contact information
- Status badges with color coding
- Last contact timestamp with message preview
- Progress indicators for each lead stage
- Projected credit score analysis
- Assigned specialist information

#### 👥 Specialist Assignment System

**Three specialized team members:**
- **Andrea**: Subprime specialist with specific lead assignments
- **Ian**: Credit specialist for complex cases  
- **Kayam**: Alternative financing specialist

**Specialist Features:**
- Hover cards showing specialist performance
- Lead distribution tracking
- Performance metrics per specialist
- Detailed specialist workload analysis

#### 🤖 Automated Chase Sequences

**Intelligent Automation:**
- **Auto Chase Running**: Automated follow-up sequences based on lead behavior
- **Sentiment Analysis**: AI-powered sentiment tracking for personalized communication
- **Script Progression**: Structured conversation flows with progress tracking
- **Overdue Management**: Automatic flagging of missed touchpoints

#### 📊 Performance Analytics Dashboard

**Comprehensive Analytics:**

1. **Funding Readiness Distribution**
   - Bar chart showing Ready/Partial/Not Ready breakdown
   - Percentage calculations for each category
   - Custom tooltips with detailed metrics

2. **Script Progress Tracking**
   - Visual progression through contact stages
   - Bottleneck identification in the process
   - Conversion rate analysis by stage

3. **Chase Status Monitoring**
   - Auto vs manual process distribution
   - Completion rate tracking
   - Process efficiency metrics

4. **Advanced Metrics**:
   - **Funnel Drop-off Analysis**: Conversion rates at each stage
   - **Reply Latency Tracking**: Response time analysis
   - **Script Variant Performance**: A/B testing results for different approaches

#### 💬 Communication & Conversation Management

**Integrated Communication:**
- SMS conversation tracking per lead
- Email communication history
- Call logs and phone interaction records
- Automated message templates
- Response time tracking

#### 📋 Lead Detail Management

**Comprehensive Lead Profiles:**
- **Customer Information**: Name, phone, email, preferences
- **Credit Profile**: Score range, known issues, bankruptcy status
- **Vehicle Preferences**: Type, budget, specific requirements
- **Funding Status**: Detailed readiness assessment
- **Action Items**: Next steps, due dates, automation status
- **Conversation History**: Complete communication timeline

#### ⚙️ Settings & Configuration

**Customizable System Settings:**
- Chase sequence timing and frequency
- Automated message templates
- Specialist assignment rules
- Scoring thresholds and criteria
- Alert and notification preferences

### Subprime Workflow Process:

1. **Lead Acquisition**: New leads enter system through various channels
2. **Initial Contact**: Automated or manual first contact
3. **Screening**: Basic qualification and credit assessment
4. **Qualification**: Detailed credit and income verification
5. **Documentation**: Collection of required financial documents
6. **Routing**: Assignment to appropriate specialist or financing program
7. **Submission**: Final application submission to lenders
8. **Follow-up**: Ongoing nurturing and relationship maintenance

### Key Nuances & Advanced Features:

#### 🧠 AI-Powered Intelligence
- **Sentiment Analysis**: Real-time customer mood tracking
- **Predictive Scoring**: Machine learning-based approval likelihood
- **Automated Prioritization**: Smart ranking of leads by conversion probability
- **Response Optimization**: AI-suggested response timing and content

#### 🎯 Specialized Subprime Handling
- **Credit Repair Education**: Built-in resources for credit improvement guidance
- **Alternative Financing**: Multiple financing pathway management
- **Document Management**: Streamlined collection of financial documentation
- **Compliance Tracking**: Ensures all regulatory requirements are met

#### 📈 Performance Optimization
- **Conversion Rate Tracking**: Monitor success rates across different lead types
- **Time-to-Funding**: Track efficiency of the funding process
- **Specialist Performance**: Individual team member success metrics
- **Process Bottleneck Identification**: Automated detection of workflow issues

---

## Technology Stack

This project is built with modern web technologies:

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS with custom automotive theme
- **UI Components**: shadcn/ui component library
- **State Management**: React hooks and context
- **Routing**: React Router DOM
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React icons
- **Date Handling**: date-fns for date manipulation

## Getting Started

### Prerequisites
- Node.js (recommended via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint for code quality
- `npm run preview` - Preview production build locally

## Development Workflow

### Development Setup
- Clone the repository to your local machine
- Install dependencies with `npm install`
- Set up environment variables as needed

### Local Development
- Start development server with `npm run dev`
- Work in your preferred IDE
- Use Git for version control and collaboration

### GitHub Integration
- Direct file editing in GitHub interface
- GitHub Codespaces for cloud-based development
- Automated CI/CD workflows

## Deployment

### Production Deployment
1. Build the application with `npm run build`
2. Deploy the `dist` folder to your hosting platform
3. Configure environment variables for production

### Custom Domain
- Configure DNS settings for your domain
- Set up SSL certificates
- Configure server routing for single-page application

## Contributing

This is a demonstration prototype for Prestige Motors dealership operations. The system showcases advanced automotive AI capabilities with particular emphasis on subprime customer management and lead nurturing.

### Key Areas for Enhancement:
- Real-time data integration with dealership management systems
- Enhanced AI capabilities for customer interaction
- Advanced analytics and reporting features
- Mobile-responsive design improvements
- Integration with third-party automotive services

---

## Demo Note

This is a prototype for demonstration purposes only. All data shown is simulated for showcase purposes and does not represent actual customer or business information.

**© 2025 Prestige Motors - Jack Automotive AI Assistant Demo Version** 