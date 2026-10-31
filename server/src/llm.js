import Groq from 'groq-sdk';

// See https://console.groq.com/docs/models for other options,
// e.g. llama-3.1-8b-instant (faster) or openai/gpt-oss-120b.
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let client;

function getClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Copy server/.env.example to server/.env and add your key.');
  }
  client ??= new Groq();
  return client;
}

/**
 * Stream a chat completion token by token.
 * `messages` is the standard chat format: [{ role: 'system' | 'user' | 'assistant', content }].
 * Low temperature = more focused, deterministic answers (what we want for Q&A over docs).
 */
export async function* streamChat(messages, { temperature = 0.2 } = {}) {
  const stream = await getClient().chat.completions.create({
    model: MODEL,
    messages,
    temperature,
    stream: true,
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
