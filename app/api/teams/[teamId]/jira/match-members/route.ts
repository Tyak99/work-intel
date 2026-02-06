import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';
import { requireTeamAdmin, getTeamMembersWithEmails } from '@/lib/services/team-auth';
import { fetchAssignableJiraUsers, JiraUser } from '@/lib/services/team-jira';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export interface JiraMemberMatch {
  memberId: string;
  memberEmail: string;
  memberDisplayName: string | null;
  githubUsername: string | null;
  suggestedJiraUser: JiraUser | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchReason: string;
}

const AIMatchSchema = z.object({
  matches: z.array(z.object({
    memberEmail: z.string(),
    jiraAccountId: z.string().nullable(),
    confidence: z.enum(['medium', 'low']),
    reason: z.string(),
  })),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { teamId } = await params;

    try {
      await requireTeamAdmin(teamId, user.id);
    } catch {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch Jira assignable users and team members in parallel
    const [jiraUsers, teamMembers] = await Promise.all([
      fetchAssignableJiraUsers(teamId),
      getTeamMembersWithEmails(teamId),
    ]);

    if (jiraUsers.length === 0) {
      return NextResponse.json({
        matches: [],
        jiraUsers,
        error: 'No assignable Jira users found for configured projects',
      });
    }

    // Layer 1: Match by email (deterministic, highest confidence)
    const emailMatched = new Set<string>();
    const matches: JiraMemberMatch[] = [];

    for (const member of teamMembers) {
      const emailMatch = jiraUsers.find(
        (ju) => ju.emailAddress && ju.emailAddress.toLowerCase() === member.email.toLowerCase()
      );

      if (emailMatch) {
        emailMatched.add(member.email);
        matches.push({
          memberId: member.userId,
          memberEmail: member.email,
          memberDisplayName: member.displayName,
          githubUsername: member.githubUsername,
          suggestedJiraUser: emailMatch,
          confidence: 'high',
          matchReason: 'Email match',
        });
      }
    }

    // Layer 2: For unmatched members, use AI fuzzy matching
    const unmatchedMembers = teamMembers.filter((m) => !emailMatched.has(m.email));

    if (unmatchedMembers.length > 0 && jiraUsers.length > 0) {
      const aiMatches = await getAIMatches(unmatchedMembers, jiraUsers);

      for (const member of unmatchedMembers) {
        const aiMatch = aiMatches.find((m) => m.memberEmail === member.email);
        const jiraUser = aiMatch?.jiraAccountId
          ? jiraUsers.find((ju) => ju.accountId === aiMatch.jiraAccountId)
          : null;

        matches.push({
          memberId: member.userId,
          memberEmail: member.email,
          memberDisplayName: member.displayName,
          githubUsername: member.githubUsername,
          suggestedJiraUser: jiraUser || null,
          confidence: jiraUser ? (aiMatch?.confidence || 'low') : 'none',
          matchReason: jiraUser ? (aiMatch?.reason || 'AI name match') : 'No match found',
        });
      }
    }

    return NextResponse.json({ matches, jiraUsers });
  } catch (error) {
    console.error('[Jira Match Members] Error:', error);
    return NextResponse.json(
      { error: 'Failed to match Jira members' },
      { status: 500 }
    );
  }
}

async function getAIMatches(
  unmatchedMembers: Array<{
    email: string;
    displayName: string | null;
    githubUsername: string | null;
  }>,
  jiraUsers: JiraUser[]
): Promise<z.infer<typeof AIMatchSchema>['matches']> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[Jira Match] No ANTHROPIC_API_KEY, skipping AI matching');
    return [];
  }

  const anthropic = new Anthropic({ apiKey });

  const prompt = `Match team members to Jira users based on name similarity. Be conservative - only match when you're reasonably confident.

Team members to match:
${unmatchedMembers.map((m) => `- Email: ${m.email}, Display name: ${m.displayName || 'N/A'}, GitHub: ${m.githubUsername || 'N/A'}`).join('\n')}

Available Jira users:
${jiraUsers.map((ju) => `- accountId: ${ju.accountId}, Display name: ${ju.displayName}, Email: ${ju.emailAddress || 'N/A'}`).join('\n')}

Return ONLY valid JSON:
{
  "matches": [
    {
      "memberEmail": "member's email",
      "jiraAccountId": "matched Jira accountId or null if no good match",
      "confidence": "medium or low",
      "reason": "brief explanation"
    }
  ]
}

Include an entry for every team member. Set jiraAccountId to null if no confident match exists.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;

    const parsed = JSON.parse(jsonStr.trim());
    return AIMatchSchema.parse(parsed).matches;
  } catch (error) {
    console.error('[Jira Match] AI matching failed:', error);
    return [];
  }
}
