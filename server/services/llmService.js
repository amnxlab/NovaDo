const axios = require('axios');
const OpenAI = require('openai');

class LLMService {
  constructor(provider, apiKey) {
    this.provider = provider;
    this.apiKey = apiKey;
    
    if (provider === 'openai') {
      this.client = new OpenAI({ apiKey });
      this.model = 'gpt-4o-mini';
    } else if (provider === 'deepseek') {
      // DeepSeek uses OpenAI-compatible API
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
      this.model = 'deepseek-chat';
    }
  }

  async testConnection() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      
      return !!response.choices[0].message;
    } catch (error) {
      console.error('LLM connection test failed:', error);
      return false;
    }
  }

  async parseTaskInput(input, context = {}) {
    try {
      const systemPrompt = `You are a helpful task management assistant. Your job is to parse natural language input and extract task information.

When given a task description, extract the following information:
- title: The main task title
- description: Additional details (if any)
- dueDate: Date in ISO format (YYYY-MM-DD) or null
- dueTime: Time in HH:mm format or null
- priority: "none", "low", "medium", or "high"
- tags: Array of relevant tags
- recurrence: Object with { enabled: boolean, pattern: "daily"|"weekly"|"monthly"|"custom", interval: number, daysOfWeek: [0-6] } or null
- subtasks: Array of subtask titles (if mentioned)
- needsClarification: boolean - true if you need more information
- clarificationQuestion: string - what you need to know (if needsClarification is true)

Examples:
Input: "Create a task for having lunch every day at 6PM"
Output: {
  "title": "Lunch",
  "description": "",
  "dueDate": null,
  "dueTime": "18:00",
  "priority": "none",
  "tags": ["meal"],
  "recurrence": {
    "enabled": true,
    "pattern": "daily",
    "interval": 1,
    "daysOfWeek": []
  },
  "subtasks": [],
  "needsClarification": false
}

Input: "Remind me to call mom tomorrow at 10AM"
Output: {
  "title": "Call mom",
  "description": "",
  "dueDate": "2024-01-09",
  "dueTime": "10:00",
  "priority": "none",
  "tags": ["call", "family"],
  "recurrence": null,
  "subtasks": [],
  "needsClarification": false
}

Input: "Plan vacation"
Output: {
  "title": "Plan vacation",
  "description": "",
  "dueDate": null,
  "dueTime": null,
  "priority": "none",
  "tags": ["vacation", "planning"],
  "recurrence": null,
  "subtasks": ["Research destinations", "Check budget", "Book flights", "Book accommodation"],
  "needsClarification": true,
  "clarificationQuestion": "When would you like to complete this by? Would you like to set a priority level?"
}

Today's date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with valid JSON. Do not include any explanatory text.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      
      // Try to extract JSON from the response
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        data: parsed,
        needsClarification: parsed.needsClarification || false,
        clarificationQuestion: parsed.clarificationQuestion || null
      };
    } catch (error) {
      console.error('Parse task input error:', error);
      return {
        success: false,
        error: 'Failed to parse input. Please try rephrasing your request.',
        needsClarification: false
      };
    }
  }

  async continueConversation(message, conversationHistory) {
    try {
      const systemPrompt = `You are a helpful task management assistant helping to clarify task details.
Based on the conversation history, update the task information with the user's response.
Always respond with valid JSON containing the updated task data and whether more clarification is needed.

Response format:
{
  "title": "string",
  "description": "string",
  "dueDate": "YYYY-MM-DD or null",
  "dueTime": "HH:mm or null",
  "priority": "none|low|medium|high",
  "tags": ["string"],
  "recurrence": { ... } or null,
  "subtasks": ["string"],
  "needsClarification": boolean,
  "clarificationQuestion": "string or null"
}`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ];

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        data: parsed,
        needsClarification: parsed.needsClarification || false,
        clarificationQuestion: parsed.clarificationQuestion || null,
        assistantMessage: content
      };
    } catch (error) {
      console.error('Continue conversation error:', error);
      return {
        success: false,
        error: 'Failed to process response',
        needsClarification: false
      };
    }
  }

  async generateSuggestions(context) {
    try {
      const systemPrompt = `You are a productivity assistant. Based on the user's current tasks and context, suggest 3-5 helpful tasks they might want to add.
Respond with a JSON array of task suggestions.

Format:
[
  {
    "title": "string",
    "description": "string",
    "priority": "none|low|medium|high",
    "tags": ["string"]
  }
]`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context: ${context}` }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      const content = response.choices[0].message.content.trim();
      let jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Generate suggestions error:', error);
      return [];
    }
  }
}

module.exports = LLMService;

