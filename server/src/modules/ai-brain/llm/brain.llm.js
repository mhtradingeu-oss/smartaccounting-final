const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyze(text) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `
You are an AI accounting brain.
Return ONLY valid JSON.

You must output:
{
  "intent": string,
  "confidence": number,
  "amount": number|null,
  "currency": string|null,
  "reasoning": string,
  "actions": string[]
}

Rules:
- Be precise
- Never return text outside JSON
- If unsure, set intent = "UNKNOWN"
          `,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      amount: null,
      currency: null,
      reasoning: `LLM error fallback: ${err.message}`,
      actions: [],
    };
  }
}

module.exports = { analyze };
