# Work Intel

An AI-powered work intelligence dashboard that synthesizes information from GitHub, Jira, Gmail, and Google Calendar to generate actionable daily briefs with smart AI-assisted actions.

## 🚀 Features

- **AI-Powered Daily Briefs**: Generate intelligent summaries of your work across all connected tools
- **Smart Todo Actions**: AI drafts for PR nudges, email replies, and meeting prep - all in one place
- **Multiple Tool Integrations**:
  - ✅ GitHub (PRs, Issues, Reviews)
  - ✅ Jira (Tickets, Assignments)
  - ✅ Gmail (via Nylas)
  - ✅ Google Calendar (via Nylas)
- **Real-time Sync**: Live updates with caching for performance
- **Beautiful UI**: Modern, responsive interface built with Tailwind CSS

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui components
- Zustand for state management
- React Hot Toast for notifications

**Backend:**
- Next.js API Routes
- Claude 3.5 Sonnet (Anthropic SDK) with Extended Thinking
- GitHub API via @octokit/rest
- Jira REST API
- Nylas API (Gmail & Calendar)
- Supabase (OAuth grant storage)
- In-memory caching

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** installed
2. **API Keys** for the services you want to connect:
   - Anthropic API key (required)
   - GitHub Personal Access Token (optional but recommended)
   - Jira API token (optional but recommended)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Tyak99/work-intel.git
cd work-intel
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your API keys:

```env
# REQUIRED - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# OPTIONAL - Get from https://github.com/settings/personal-access-tokens
# Required scopes: repo, user, read:org
GITHUB_TOKEN=ghp_your-token-here

# OPTIONAL - Get from your Jira settings
JIRA_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Configuration

### Setting up Tool Connections

1. **Click the Settings button** in the top-right corner of the dashboard
2. **Connect your tools** by entering the required credentials:
   - **GitHub**: Personal Access Token with `repo`, `user`, `read:org` scopes
   - **Jira**: Your Jira URL, email, and API token

### Getting API Keys

#### Anthropic (Required)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Add to your `.env.local` as `ANTHROPIC_API_KEY`

#### GitHub (Recommended)
1. Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/personal-access-tokens/new)
2. Generate a classic token with these scopes:
   - `repo` (Full control of private repositories)
   - `user` (Read user profile data)
   - `read:org` (Read org membership)
3. Add to your `.env.local` as `GITHUB_TOKEN`

#### Jira (Recommended)
1. Go to your Jira instance → Account Settings → Security → API Tokens
2. Create an API token
3. Add your Jira URL, email, and token to `.env.local`

## 💡 Usage

### Generating Daily Briefs

1. **Click "Generate Daily Brief"** button in the header
2. The system will:
   - Fetch data from all connected tools
   - Process with Claude AI to identify priorities
   - Generate a structured brief with sections:
     - 🎯 Critical Items (Blocking others/urgent)
     - 👀 PR Reviews Needed
     - 🔄 In-Progress Work Status
     - 💡 AI Observations (hidden tasks found)

### Managing Tasks

- **Auto-extraction**: High/critical priority tasks are automatically added to your todo list
- **Manual tasks**: Click "+" to add custom tasks
- **Completion**: Check tasks off to mark them complete
- **Sync**: Changes sync with backend APIs when possible

### Tool Status

The bottom status bar shows connection status for all tools:
- 🟢 Connected and synced
- 🔴 Disconnected
- 🟡 Syncing

## 🏗️ Architecture

### Caching Strategy

- **Tool Responses**: Cached for 15 minutes to reduce API calls
- **Daily Briefs**: Cached for 1 hour per day
- **Tool Status**: Cached for 5 minutes
- **Auto-invalidation**: Caches are cleared when connections change

### Data Flow

1. **User triggers** brief generation
2. **Services fetch** data from APIs (with caching)
3. **Claude processes** raw data into structured brief
4. **Tasks extracted** from brief and added to todo list
5. **UI updates** with new brief and tasks

### Security

- All API keys stored in environment variables
- No credentials stored in frontend code
- Tool connections use secure authentication (OAuth for Google services)

## 🚧 Upcoming Features

- **Email Sending**: Send AI-drafted replies directly from the dashboard
- **Team Dashboard**: Shared tasks and team insights
- **Mobile App**: React Native companion app
- **Advanced Analytics**: Work patterns and productivity insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Build Errors:**
- Ensure Node.js 18+ is installed
- Run `npm install` to update dependencies
- Check TypeScript errors with `npm run build`

**API Connection Issues:**
- Verify API keys in `.env.local`
- Check network connectivity
- Review console logs for specific error messages

**Caching Issues:**
- Restart development server
- Clear browser cache
- Check cache TTL settings in services

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page for known problems
- Create a new issue with detailed error information
- Include your environment details and steps to reproduce

---

Built with ❤️ using Claude AI and modern web technologies.