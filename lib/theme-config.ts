export type FontStyle = 'futuristic' | 'clean' | 'playful';

export interface ThemeLabels {
  // App identity
  appName: string;
  appTagline: string;

  // Brief section
  briefTitle: string;
  topFocus: string;
  meetings: string;
  pendingReview: string;
  myPrs: string;
  emails: string;
  jiraTasks: string;
  alerts: string;
  notes: string;
  expandAll: string;
  collapseAll: string;
  missionSummary: string;

  // Todo section
  todoTitle: string;
  aiActionItems: string;
  manualTasks: string;
  addTaskPlaceholder: string;
  prepareButton: string;
  regenerateButton: string;
  copyButton: string;
  completeButton: string;
  viewTodo: string;
  draftLabel: string;
  prepNotesLabel: string;
  emptyTodos: string;
  emptyTodosSubtext: string;
  showCompleted: string;
  hideCompleted: string;

  // Brief empty state
  emptyBrief: string;
  emptyBriefSubtext: string;
  generatingBrief: string;

  // Status & settings
  systemStatus: string;
  connectionSecure: string;
  initializing: string;
  settings: string;
  connect: string;
  disconnect: string;
  testSignal: string;
  signalStrong: string;
  noSignal: string;

  // Login
  loginButton: string;
  loginDisclaimer: string;
  loginFooter: string;

  // Priority badge label
  priorityTarget: string;

  // Generative UI
  aiSuggestions: string;
  askAnything: string;
  generatedView: string;
  quickPrompts: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  hasGlowEffects: boolean;
  hasAnimations: boolean;
  fontStyle: FontStyle;
  labels: ThemeLabels;
}

export const themes: Record<string, ThemeConfig> = {
  future: {
    id: 'future',
    name: 'Dark Future',
    isDark: true,
    hasGlowEffects: true,
    hasAnimations: true,
    fontStyle: 'futuristic',
    labels: {
      // App identity
      appName: "WORKINTEL",
      appTagline: "Mission Control",

      // Brief section
      briefTitle: "Mission Objectives",
      topFocus: "Priority Targets",
      meetings: "Scheduled Encounters",
      pendingReview: "Code Review Pending",
      myPrs: "Deployment Pipeline",
      emails: "Communications",
      jiraTasks: "Ticket Queue",
      alerts: "System Alerts",
      notes: "Field Notes",
      expandAll: "[Expand All]",
      collapseAll: "[Collapse All]",
      missionSummary: "Mission Summary",

      // Todo section
      todoTitle: "Active Tasks",
      aiActionItems: "AI Action Items",
      manualTasks: "Manual Tasks",
      addTaskPlaceholder: "Enter task objective...",
      prepareButton: "Initiate Draft",
      regenerateButton: "Regenerate",
      copyButton: "Copy",
      completeButton: "Complete",
      viewTodo: "Engage Protocol",
      draftLabel: "Draft Payload",
      prepNotesLabel: "Prep Notes",
      emptyTodos: "All Systems Nominal",
      emptyTodosSubtext: "No active tasks pending.",
      showCompleted: "[Show] Completed",
      hideCompleted: "[Hide] Completed",

      // Brief empty state
      emptyBrief: "Awaiting Command",
      emptyBriefSubtext: "Initiate sequence to analyze workstreams and generate mission briefing.",
      generatingBrief: "Processing Data Streams...",

      // Status & settings
      systemStatus: "System Status",
      connectionSecure: "Connection Secure",
      initializing: "Initializing Command Center...",
      settings: "System Configuration",
      connect: "Establish Uplink",
      disconnect: "Terminate Link",
      testSignal: "Test Signal",
      signalStrong: "Signal: Strong",
      noSignal: "No Signal",

      // Login
      loginButton: "Initialize Session",
      loginDisclaimer: "Authorization Required • Level 1 Clearance",
      loginFooter: "System Version 2.0.4 • Status: Nominal",

      // Priority badge
      priorityTarget: "Priority Target",

      // Generative UI
      aiSuggestions: "AI Intelligence",
      askAnything: "Ask the system anything...",
      generatedView: "Generated Analysis",
      quickPrompts: "Quick Commands"
    }
  },
  original: {
    id: 'original',
    name: 'Original',
    isDark: false,
    hasGlowEffects: false,
    hasAnimations: false,
    fontStyle: 'clean',
    labels: {
      // App identity
      appName: "WorkIntel",
      appTagline: "Your productivity dashboard",

      // Brief section
      briefTitle: "Daily Brief",
      topFocus: "Top Priorities",
      meetings: "Today's Meetings",
      pendingReview: "PRs to Review",
      myPrs: "My Pull Requests",
      emails: "Emails to Address",
      jiraTasks: "Jira Tasks",
      alerts: "Alerts",
      notes: "Notes",
      expandAll: "Expand All",
      collapseAll: "Collapse All",
      missionSummary: "Summary",

      // Todo section
      todoTitle: "To-Do List",
      aiActionItems: "AI-Suggested Actions",
      manualTasks: "My Tasks",
      addTaskPlaceholder: "Add a new task...",
      prepareButton: "Prepare Draft",
      regenerateButton: "Regenerate",
      copyButton: "Copy",
      completeButton: "Done",
      viewTodo: "View Action",
      draftLabel: "Draft",
      prepNotesLabel: "Preparation Notes",
      emptyTodos: "All caught up!",
      emptyTodosSubtext: "No tasks at the moment.",
      showCompleted: "Show Completed",
      hideCompleted: "Hide Completed",

      // Brief empty state
      emptyBrief: "No Brief Yet",
      emptyBriefSubtext: "Click 'Generate Brief' to get your daily summary.",
      generatingBrief: "Generating your brief...",

      // Status & settings
      systemStatus: "Status",
      connectionSecure: "Connected",
      initializing: "Loading...",
      settings: "Settings",
      connect: "Connect",
      disconnect: "Disconnect",
      testSignal: "Test Connection",
      signalStrong: "Connected",
      noSignal: "Disconnected",

      // Login
      loginButton: "Sign in with Gmail",
      loginDisclaimer: "We only request read access to your data.",
      loginFooter: "WorkIntel • Your AI productivity assistant",

      // Priority badge
      priorityTarget: "High Priority",

      // Generative UI
      aiSuggestions: "AI Suggestions",
      askAnything: "Ask anything about your work...",
      generatedView: "Generated View",
      quickPrompts: "Quick Prompts"
    }
  }
};

export type ThemeId = keyof typeof themes;
export type ThemeLabelKey = keyof ThemeLabels;

// Helper to get default theme
export const DEFAULT_THEME_ID: ThemeId = 'future';
