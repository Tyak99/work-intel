import { WeeklyReportData } from '../supabase';

interface EmailContext {
  teamName: string;
  weekStartDate: string;
  dashboardUrl: string;
  teamSettingsUrl?: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    background-color: #f5f5f5;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    padding: 32px;
  }
  .header {
    border-bottom: 2px solid #e5e5e5;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
  }
  .header .subtitle {
    margin: 8px 0 0;
    font-size: 14px;
    color: #666;
  }
  .stats-banner {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    color: #ffffff;
  }
  .stats-row {
    display: flex;
    justify-content: space-around;
    text-align: center;
  }
  .stat-item {
    flex: 1;
  }
  .stat-number {
    font-size: 28px;
    font-weight: 700;
    display: block;
  }
  .stat-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #a0a0a0;
  }
  .section {
    margin-bottom: 24px;
  }
  .section-title {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #666;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e5e5;
  }
  .summary-text {
    font-size: 15px;
    color: #333;
    line-height: 1.7;
  }
  .alert-box {
    background-color: #fef3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 24px;
  }
  .alert-title {
    font-size: 14px;
    font-weight: 600;
    color: #856404;
    margin: 0 0 12px;
  }
  .alert-item {
    margin-bottom: 8px;
    font-size: 14px;
  }
  .alert-item:last-child {
    margin-bottom: 0;
  }
  .alert-item a {
    color: #0066cc;
    text-decoration: none;
  }
  .alert-item a:hover {
    text-decoration: underline;
  }
  .alert-reason {
    color: #666;
    font-size: 12px;
  }
  .member-card {
    background-color: #f9f9f9;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .member-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .member-name {
    font-weight: 600;
    font-size: 16px;
    color: #1a1a1a;
  }
  .member-stats {
    font-size: 12px;
    color: #666;
  }
  .member-summary {
    font-size: 14px;
    color: #444;
    line-height: 1.5;
  }
  .pr-list {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  .pr-list li {
    font-size: 13px;
    margin-bottom: 6px;
    padding-left: 16px;
    position: relative;
  }
  .pr-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #666;
  }
  .pr-list a {
    color: #0066cc;
    text-decoration: none;
  }
  .pr-list a:hover {
    text-decoration: underline;
  }
  .pr-status {
    color: #888;
    font-size: 12px;
  }
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e5e5e5;
    text-align: center;
    font-size: 13px;
    color: #888;
  }
  .footer a {
    color: #0066cc;
    text-decoration: none;
  }
  .cta-button {
    display: inline-block;
    background-color: #1a1a2e;
    color: #ffffff !important;
    text-decoration: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    margin-top: 16px;
  }
`;

export function buildManagerEmailHtml(
  report: WeeklyReportData,
  context: EmailContext
): string {
  const { teamSummary, sprintHealth, needsAttention, memberSummaries } = report;
  const { teamName, weekStartDate, dashboardUrl, teamSettingsUrl } = context;
  const unsubscribeUrl = teamSettingsUrl || dashboardUrl;

  // Sprint health banner (only when Jira is connected and has active sprint)
  const sprintHealthHtml = sprintHealth
    ? `
      <div style="background-color: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <div style="font-size: 14px; font-weight: 600; color: #3730a3; margin: 0 0 8px;">
          Sprint: ${escapeHtml(sprintHealth.sprintName)}
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size: 13px; color: #4338ca;">
              <strong>${escapeHtml(sprintHealth.progress)}</strong> &middot; ${escapeHtml(sprintHealth.completionRate)}
              ${sprintHealth.daysRemaining !== null ? ` &middot; ${sprintHealth.daysRemaining}d remaining` : ''}
            </td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #555; padding-top: 4px;">${escapeHtml(sprintHealth.insight)}</td>
          </tr>
        </table>
      </div>
    `
    : '';

  const needsAttentionHtml = needsAttention.length > 0
    ? `
      <div class="alert-box">
        <div class="alert-title">Needs Attention</div>
        ${needsAttention.map(item => `
          <div class="alert-item">
            <span style="font-size: 11px; color: #856404; background: rgba(255,193,7,0.15); padding: 1px 6px; border-radius: 3px; margin-right: 4px;">${escapeHtml(item.type.replace(/_/g, ' '))}</span>
            <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>
            <span class="alert-reason"> - ${escapeHtml(item.reason)}</span>
          </div>
        `).join('')}
      </div>
    `
    : '';

  // Jira stats columns (only when data present)
  const jiraStatsCols = report.hasJiraData
    ? `
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${teamSummary.totalJiraIssuesCompleted || 0}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">Issues Done</span>
          </td>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${teamSummary.totalJiraIssuesInProgress || 0}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">In Progress</span>
          </td>
    `
    : '';

  const memberCardsHtml = memberSummaries.map(member => {
    const prsMerged = member.shipped.length;
    const prsOpen = member.inFlight.length;
    const reviews = member.reviewActivity;
    const jiraCompleted = member.jiraIssuesCompleted?.length || 0;

    const jiraStats = report.hasJiraData && jiraCompleted > 0
      ? `, ${jiraCompleted} tickets closed`
      : '';

    const jiraSummaryHtml = member.jiraSummary
      ? `<div style="font-size: 13px; color: #4338ca; margin-top: 6px;">${escapeHtml(member.jiraSummary)}</div>`
      : '';

    return `
      <div class="member-card">
        <div class="member-header">
          <span class="member-name">@${escapeHtml(member.githubUsername)}</span>
          <span class="member-stats">${prsMerged} merged, ${prsOpen} open, ${reviews} reviews${jiraStats}</span>
        </div>
        <div class="member-summary">${escapeHtml(member.aiSummary)}</div>
        ${jiraSummaryHtml}
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(teamName)} Weekly Report</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(teamName)} Weekly Report</h1>
      <div class="subtitle">Week of ${formatDate(weekStartDate)}</div>
    </div>

    <div class="stats-banner">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${teamSummary.totalPRsMerged}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">PRs Merged</span>
          </td>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${teamSummary.totalPRsOpen}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">Open</span>
          </td>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block; color: ${teamSummary.stuckPRsCount > 0 ? '#ffc107' : '#ffffff'};">${teamSummary.stuckPRsCount}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">Need Attention</span>
          </td>
          ${jiraStatsCols}
        </tr>
      </table>
    </div>

    ${sprintHealthHtml}

    <div class="section">
      <div class="section-title">Summary</div>
      <p class="summary-text">${escapeHtml(teamSummary.summary)}</p>
    </div>

    ${needsAttentionHtml}

    <div class="section">
      <div class="section-title">Team Breakdown</div>
      ${memberCardsHtml}
    </div>

    <div style="text-align: center;">
      <a href="${escapeHtml(dashboardUrl)}" class="cta-button">View Full Report</a>
    </div>

    <div class="footer">
      <p>Sent by <a href="https://work-intel.vercel.app">Work Intel</a></p>
      <p style="margin-top: 8px; font-size: 12px;">
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #888;">Unsubscribe from these emails</a>
      </p>
      <p style="margin-top: 8px; font-size: 11px; color: #bbb;">
        <a href="https://work-intel.vercel.app/privacy" style="color: #bbb; text-decoration: underline;">Privacy Policy</a> &middot;
        <a href="https://work-intel.vercel.app/terms" style="color: #bbb; text-decoration: underline;">Terms of Service</a>
      </p>
      <p style="margin-top: 4px; font-size: 11px; color: #bbb;">Work Intel</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function buildDeveloperEmailHtml(
  report: WeeklyReportData,
  githubUsername: string,
  context: EmailContext
): string {
  const { teamName, weekStartDate, dashboardUrl, teamSettingsUrl } = context;
  const unsubscribeUrl = teamSettingsUrl || dashboardUrl;

  const memberData = report.memberSummaries.find(
    m => m.githubUsername === githubUsername
  );

  if (!memberData) {
    return buildManagerEmailHtml(report, context);
  }

  const { shipped, inFlight, reviewActivity, aiSummary, jiraIssuesCompleted, jiraIssuesInProgress, jiraSummary } = memberData;

  const waitingForReview = report.memberSummaries
    .flatMap(m => m.inFlight)
    .filter(pr => {
      const needsReview = report.needsAttention.find(
        n => n.url === pr.url && n.type === 'unreviewed_pr'
      );
      return needsReview && needsReview.author !== githubUsername;
    })
    .slice(0, 5);

  const shippedHtml = shipped.length > 0
    ? `
      <div class="section">
        <div class="section-title">Shipped</div>
        <ul class="pr-list">
          ${shipped.map(pr => `
            <li><a href="${escapeHtml(pr.url)}">${escapeHtml(pr.title)}</a> <span class="pr-status">(${escapeHtml(pr.repo)})</span></li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  const inFlightHtml = inFlight.length > 0
    ? `
      <div class="section">
        <div class="section-title">In Flight</div>
        <ul class="pr-list">
          ${inFlight.map(pr => `
            <li>
              <a href="${escapeHtml(pr.url)}">${escapeHtml(pr.title)}</a>
              <span class="pr-status">(${pr.daysSinceUpdate === 0 ? 'updated today' : `${pr.daysSinceUpdate}d since update`})</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  const reviewRequestsHtml = waitingForReview.length > 0
    ? `
      <div class="section">
        <div class="section-title">Waiting for Your Review</div>
        <ul class="pr-list">
          ${waitingForReview.map(pr => `
            <li><a href="${escapeHtml(pr.url)}">${escapeHtml(pr.title)}</a></li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  const jiraCompletedHtml = jiraIssuesCompleted && jiraIssuesCompleted.length > 0
    ? `
      <div class="section">
        <div class="section-title">Jira - Completed</div>
        <ul class="pr-list">
          ${jiraIssuesCompleted.map(issue => `
            <li><a href="${escapeHtml(issue.url)}">${escapeHtml(issue.key)}</a> ${escapeHtml(issue.summary)} <span class="pr-status">(${escapeHtml(issue.issueType)})</span></li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  const jiraInProgressHtml = jiraIssuesInProgress && jiraIssuesInProgress.length > 0
    ? `
      <div class="section">
        <div class="section-title">Jira - In Progress</div>
        <ul class="pr-list">
          ${jiraIssuesInProgress.map(issue => `
            <li><a href="${escapeHtml(issue.url)}">${escapeHtml(issue.key)}</a> ${escapeHtml(issue.summary)}${issue.storyPoints ? ` <span class="pr-status">(${issue.storyPoints} pts)</span>` : ''}</li>
          `).join('')}
        </ul>
      </div>
    `
    : '';

  const jiraSummaryHtml = jiraSummary
    ? `<p style="font-size: 14px; color: #4338ca; margin-top: 8px;">${escapeHtml(jiraSummary)}</p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Week - ${escapeHtml(teamName)}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Week</h1>
      <div class="subtitle">${escapeHtml(teamName)} - Week of ${formatDate(weekStartDate)}</div>
    </div>

    <div class="stats-banner">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${shipped.length}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">PRs Merged</span>
          </td>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${inFlight.length}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">Open</span>
          </td>
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${reviewActivity}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">Reviews Given</span>
          </td>
          ${jiraIssuesCompleted && jiraIssuesCompleted.length > 0 ? `
          <td align="center" style="padding: 8px;">
            <span style="font-size: 28px; font-weight: 700; display: block;">${jiraIssuesCompleted.length}</span>
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #a0a0a0;">Tickets Done</span>
          </td>
          ` : ''}
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Summary</div>
      <p class="summary-text">${escapeHtml(aiSummary)}</p>
      ${jiraSummaryHtml}
    </div>

    ${shippedHtml}
    ${inFlightHtml}
    ${reviewRequestsHtml}
    ${jiraCompletedHtml}
    ${jiraInProgressHtml}

    <div style="text-align: center;">
      <a href="${escapeHtml(dashboardUrl)}" class="cta-button">View Team Report</a>
    </div>

    <div class="footer">
      <p>Sent by <a href="https://work-intel.vercel.app">Work Intel</a></p>
      <p style="margin-top: 8px; font-size: 12px;">
        <a href="${escapeHtml(unsubscribeUrl)}" style="color: #888;">Unsubscribe from these emails</a>
      </p>
      <p style="margin-top: 8px; font-size: 11px; color: #bbb;">
        <a href="https://work-intel.vercel.app/privacy" style="color: #bbb; text-decoration: underline;">Privacy Policy</a> &middot;
        <a href="https://work-intel.vercel.app/terms" style="color: #bbb; text-decoration: underline;">Terms of Service</a>
      </p>
      <p style="margin-top: 4px; font-size: 11px; color: #bbb;">Work Intel</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function buildManagerEmailSubject(teamName: string, weekStartDate: string): string {
  return `[${teamName}] Weekly Report - Week of ${formatDate(weekStartDate)}`;
}

export function buildDeveloperEmailSubject(teamName: string, weekStartDate: string): string {
  return `Your Week - ${teamName} - Week of ${formatDate(weekStartDate)}`;
}
