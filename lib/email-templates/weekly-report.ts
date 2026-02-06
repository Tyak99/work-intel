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
  const { teamSummary, needsAttention, memberSummaries } = report;
  const { teamName, weekStartDate, dashboardUrl, teamSettingsUrl } = context;
  const unsubscribeUrl = teamSettingsUrl || dashboardUrl;

  const needsAttentionHtml = needsAttention.length > 0
    ? `
      <div class="alert-box">
        <div class="alert-title">Needs Attention</div>
        ${needsAttention.map(item => `
          <div class="alert-item">
            <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>
            <span class="alert-reason"> - ${escapeHtml(item.reason)}</span>
          </div>
        `).join('')}
      </div>
    `
    : '';

  const memberCardsHtml = memberSummaries.map(member => {
    const prsMerged = member.shipped.length;
    const prsOpen = member.inFlight.length;
    const reviews = member.reviewActivity;

    return `
      <div class="member-card">
        <div class="member-header">
          <span class="member-name">@${escapeHtml(member.githubUsername)}</span>
          <span class="member-stats">${prsMerged} merged, ${prsOpen} open, ${reviews} reviews</span>
        </div>
        <div class="member-summary">${escapeHtml(member.aiSummary)}</div>
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
        </tr>
      </table>
    </div>

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

  const { shipped, inFlight, reviewActivity, aiSummary } = memberData;

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
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Summary</div>
      <p class="summary-text">${escapeHtml(aiSummary)}</p>
    </div>

    ${shippedHtml}
    ${inFlightHtml}
    ${reviewRequestsHtml}

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
