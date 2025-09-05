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
  
  const prompt = `You are an AI work assistant helping a senior software engineer manage their daily tasks. 

CONTEXT:
- Current time: ${currentTime.toISOString()}
- User timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

RAW DATA FROM TOOLS:
${JSON.stringify(toolData, null, 2)}

INSTRUCTIONS:
1. Analyze all the provided data from Jira, GitHub, Gmail, and Calendar
2. Extract and prioritize tasks based on urgency, blocking potential, and impact
3. Find hidden tasks or action items in comments, emails, and descriptions
4. Generate a structured daily brief with clear sections
5. Identify correlations between different items (e.g., related PRs and Jira tickets)

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "sections": [
    {
      "type": "critical",
      "title": "🎯 Critical Items",
      "items": [
        {
          "title": "Brief descriptive title",
          "description": "Detailed description with context",
          "priority": "critical|high|medium|low",
          "source": "jira|github|email|calendar",
          "sourceId": "original ID from source system",
          "url": "direct link to item (if available)"
        }
      ]
    }
  ]
}

Focus on today's priorities and include only actionable items. Be concise but provide enough context for decision making.`;

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
      sections: parsedResponse.sections || []
    };
  } catch (error) {
    console.error('Error processing with Claude:', error);
    throw new Error('Failed to process data with AI');
  }
}