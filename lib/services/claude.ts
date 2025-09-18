import Anthropic from '@anthropic-ai/sdk';
import { Brief } from '@/lib/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ToolData {
  jira?: any;
  github?: any;
  gmail?: any;
  calendar?: any;
}

export async function processBriefWithClaude(toolData: ToolData, userContext?: any): Promise<Brief> {
  const currentTime = new Date();
  
  const prompt = `You are a sophisticated AI work assistant for a senior software engineer. Your role is to act as an intelligent work analyst that understands context, finds hidden tasks, and reveals relationships across all work tools.

CONTEXT:
- Current time: ${currentTime.toISOString()}
- User timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
- User role: Senior Software Engineer / Tech Lead

RAW DATA FROM TOOLS:
${JSON.stringify(toolData, null, 2)}

ADVANCED ANALYSIS INSTRUCTIONS:

🔍 CORRELATION DETECTION:
- Cross-reference ticket IDs, PR numbers, and keywords across all tools
- Look for patterns: "relates to", "fixes", "blocked by", "depends on"
- Identify temporal correlations (items updated around same time)
- Find semantic connections between descriptions and comments

🕵️ HIDDEN TASK DISCOVERY:
- Extract action items from PR/ticket comments (e.g., "TODO: update docs", "needs testing")
- Find commitments in email threads (e.g., "I'll review by Friday")
- Identify follow-up actions mentioned in meetings
- Detect blockers hidden in descriptions (e.g., "waiting for X team approval")

🎯 INTELLIGENT PRIORITIZATION:
Consider multiple factors:
- Deadline proximity (due dates, meeting prep deadlines)
- Blocking impact (how many people/teams are waiting)
- Customer impact (production issues, user-facing features)
- Dependency chains (what unlocks other work)
- Urgency signals (all-caps, multiple pings, escalations)

🧠 PATTERN RECOGNITION:
- Identify recurring issues or themes
- Detect anomalies (unusual activity, delayed items)
- Find correlations between team activities
- Recognize workflow patterns and bottlenecks

OUTPUT FORMAT:
Return a JSON object with enhanced structure:
{
  "sections": [
    {
      "type": "critical|meetings|reviews|emails|progress|risks|observations",
      "title": "Section title with emoji",
      "items": [
        {
          "title": "Brief descriptive title",
          "description": "Rich context with WHY this matters",
          "priority": "critical|high|medium|low",
          "source": "jira|github|email|calendar|ai-discovered",
          "sourceId": "original ID from source system",
          "url": "direct link to item (if available)",
          "correlations": [
            {
              "type": "explicit|semantic|temporal",
              "relatedId": "ID of related item",
              "relatedSource": "source system",
              "confidence": 0.95,
              "reason": "Brief explanation of the relationship"
            }
          ],
          "blockingImpact": "Who or what this blocks",
          "deadline": "YYYY-MM-DD or 'today'|'tomorrow'|'this week'",
          "effort": "quick|medium|large",
          "aiInsights": "Any additional AI observations about this item"
        }
      ],
      "sectionInsights": "AI observations about this section overall"
    }
  ],
  "overallInsights": {
    "hiddenTasksFound": 3,
    "criticalCorrelations": ["PR #1234 fixes Jira BE-789", "Meeting prep for architecture review"],
    "workPatterns": ["High GitHub activity suggests sprint push", "Multiple Jira updates indicate escalation"],
    "recommendations": ["Consider delegating reviews to unblock team", "Schedule follow-up for architecture decisions"]
  }
}

FOCUS AREAS:
- Be a detective: Find what's NOT explicitly stated but implied
- Think like a tech lead: What would block the team? What needs attention?
- Consider dependencies: What happens if this isn't done?
- Look for signals: Tone, urgency markers, escalation patterns
- Connect the dots: How do separate items relate to each other?

Return only the JSON object. Be thorough but concise.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.1, // Lower temperature for more consistent JSON
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let cleanedText = content.text.trim();
    
    console.log('Raw Claude response:', cleanedText.substring(0, 300));
    
    // Try to extract JSON from the response if it's wrapped in markdown or other text
    let jsonMatch = cleanedText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      cleanedText = jsonMatch[1].trim();
    } else {
      jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
    }
    
    // Handle cases where Claude starts with "I'll help you" or similar
    if (cleanedText.startsWith('I') || !cleanedText.startsWith('{')) {
      const startIdx = cleanedText.indexOf('{');
      if (startIdx !== -1) {
        cleanedText = cleanedText.substring(startIdx);
      }
    }

    console.log('Cleaned text for parsing:', cleanedText.substring(0, 200) + '...');
    
    const parsedResponse = JSON.parse(cleanedText);
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      generatedAt: currentTime,
      sections: (parsedResponse.sections || []).map((section: any) => ({
        ...section,
        id: section.id || section.type || Math.random().toString(36).substr(2, 9)
      })),
      overallInsights: parsedResponse.overallInsights
    };
  } catch (error) {
    console.error('Error processing with Claude:', error);
    throw new Error('Failed to process data with AI');
  }
}