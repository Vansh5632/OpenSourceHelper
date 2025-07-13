// LLM Integration with LangChain for Issue Summarization
class LLMSummarizer {
  constructor() {
    this.apiKey = null;
    this.model = 'gpt-3.5-turbo';
    this.maxTokens = 1000;
  }

  // Initialize with API key
  async initialize() {
    const result = await chrome.storage.local.get('openai_api_key');
    if (result.openai_api_key) {
      this.apiKey = result.openai_api_key;
      return true;
    }
    return false;
  }

  // Set API key
  async setApiKey(apiKey) {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ 'openai_api_key': apiKey });
  }

  // Summarize GitHub issue
  async summarizeIssue(issueData) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildIssuePrompt(issueData);
    
    try {
      const response = await this.callOpenAI(prompt, 'issue_summary');
      return this.formatIssueSummary(response);
    } catch (error) {
      console.error('Error summarizing issue:', error);
      throw new Error('Failed to summarize issue');
    }
  }

  // Summarize comments
  async summarizeComments(comments) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!comments || comments.length === 0) {
      return {
        summary: 'No comments found for this issue.',
        keyPoints: [],
        sentiment: 'neutral'
      };
    }

    const prompt = this.buildCommentsPrompt(comments);
    
    try {
      const response = await this.callOpenAI(prompt, 'comments_summary');
      return this.formatCommentsSummary(response);
    } catch (error) {
      console.error('Error summarizing comments:', error);
      throw new Error('Failed to summarize comments');
    }
  }

  // Build prompt for issue summarization
  buildIssuePrompt(issueData) {
    return `
Please analyze this GitHub issue and provide a comprehensive summary:

**Issue Title:** ${issueData.title}

**Issue Body:**
${issueData.body || 'No description provided'}

**Labels:** ${issueData.labels?.map(label => label.name).join(', ') || 'None'}

**Created by:** ${issueData.user?.login || 'Unknown'}

**State:** ${issueData.state}

Please provide:
1. A concise summary of the main issue (2-3 sentences)
2. Key technical details mentioned
3. Priority level (low/medium/high) based on content
4. Suggested action items or next steps
5. Any dependencies or related issues mentioned

Format your response as JSON with the following structure:
{
  "summary": "Brief summary here",
  "technicalDetails": ["detail1", "detail2"],
  "priority": "medium",
  "actionItems": ["action1", "action2"],
  "dependencies": ["dep1", "dep2"]
}
`;
  }

  // Build prompt for comments summarization
  buildCommentsPrompt(comments) {
    const commentsText = comments.map((comment, index) => 
      `Comment ${index + 1} by ${comment.user?.login || 'Unknown'}:\n${comment.body}\n---`
    ).join('\n\n');

    return `
Please analyze these GitHub issue comments and provide a summary:

**Comments:**
${commentsText}

Please provide:
1. A brief summary of the discussion
2. Key points or solutions mentioned
3. Overall sentiment (positive/negative/neutral/mixed)
4. Any decisions or conclusions reached
5. Outstanding questions or concerns

Format your response as JSON with the following structure:
{
  "summary": "Brief summary of discussion",
  "keyPoints": ["point1", "point2"],
  "sentiment": "neutral",
  "decisions": ["decision1", "decision2"],
  "outstandingQuestions": ["question1", "question2"]
}
`;
  }

  // Call OpenAI API
  async callOpenAI(prompt, type) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert technical analyst specializing in GitHub issues and software development. Provide clear, concise, and actionable summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Format issue summary response
  formatIssueSummary(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || 'No summary available',
        technicalDetails: parsed.technicalDetails || [],
        priority: parsed.priority || 'medium',
        actionItems: parsed.actionItems || [],
        dependencies: parsed.dependencies || []
      };
    } catch (error) {
      console.error('Error parsing issue summary:', error);
      return {
        summary: response || 'Failed to parse summary',
        technicalDetails: [],
        priority: 'medium',
        actionItems: [],
        dependencies: []
      };
    }
  }

  // Format comments summary response
  formatCommentsSummary(response) {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || 'No summary available',
        keyPoints: parsed.keyPoints || [],
        sentiment: parsed.sentiment || 'neutral',
        decisions: parsed.decisions || [],
        outstandingQuestions: parsed.outstandingQuestions || []
      };
    } catch (error) {
      console.error('Error parsing comments summary:', error);
      return {
        summary: response || 'Failed to parse summary',
        keyPoints: [],
        sentiment: 'neutral',
        decisions: [],
        outstandingQuestions: []
      };
    }
  }

  // Get available models
  getAvailableModels() {
    return [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo-preview'
    ];
  }

  // Set model
  setModel(model) {
    this.model = model;
  }

  // Check if API key is configured
  isConfigured() {
    return !!this.apiKey;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMSummarizer;
} else {
  window.LLMSummarizer = LLMSummarizer;
}
