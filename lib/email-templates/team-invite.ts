interface InviteEmailContext {
  teamName: string;
  inviterName: string;
  role: 'admin' | 'member';
  acceptUrl: string;
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
    text-align: center;
    padding-bottom: 24px;
    margin-bottom: 24px;
    border-bottom: 2px solid #e5e5e5;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
  }
  .content {
    font-size: 16px;
    color: #333;
    line-height: 1.7;
  }
  .content p {
    margin: 0 0 16px;
  }
  .highlight {
    font-weight: 600;
    color: #1a1a2e;
  }
  .role-badge {
    display: inline-block;
    background-color: #e5e5e5;
    color: #333;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
  }
  .cta-container {
    text-align: center;
    margin: 32px 0;
  }
  .cta-button {
    display: inline-block;
    background-color: #1a1a2e;
    color: #ffffff !important;
    text-decoration: none;
    padding: 14px 32px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 16px;
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
  .note {
    background-color: #f9f9f9;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 16px;
    font-size: 14px;
    color: #666;
    margin-top: 24px;
  }
`;

export function buildTeamInviteEmailHtml(context: InviteEmailContext): string {
  const { teamName, inviterName, role, acceptUrl } = context;

  const roleDescription = role === 'admin'
    ? 'As an admin, you\'ll be able to manage team settings, integrations, and invite other members.'
    : 'As a member, you\'ll be able to view team reports and your personal activity summaries.';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${escapeHtml(teamName)}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're invited to join ${escapeHtml(teamName)}</h1>
    </div>

    <div class="content">
      <p>
        <span class="highlight">${escapeHtml(inviterName)}</span> has invited you to join
        <span class="highlight">${escapeHtml(teamName)}</span> on Work Intel as a
        <span class="role-badge">${role}</span>.
      </p>

      <p>${roleDescription}</p>

      <div class="cta-container">
        <a href="${escapeHtml(acceptUrl)}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="note">
        <strong>Note:</strong> This invitation doesn't expire. If you don't have a Work Intel account yet,
        clicking the button above will guide you through the sign-up process and automatically add you to the team.
      </div>
    </div>

    <div class="footer">
      <p>
        Sent by <a href="https://work-intel.vercel.app">Work Intel</a> —
        Engineering intelligence for your team
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function buildTeamInviteEmailSubject(teamName: string): string {
  return `You're invited to join ${teamName} on Work Intel`;
}
