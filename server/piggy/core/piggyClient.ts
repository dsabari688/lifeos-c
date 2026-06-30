import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

let openaiInstance: OpenAI | null = null;

/**
 * Returns a configured OpenAI client pointed at Groq's API endpoint.
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is required");
    }
    openaiInstance = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  return openaiInstance;
}

/**
 * Helper to query the Groq model (llama-3.1-8b-instant).
 */
export async function queryGroq(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number = 0.6,
  responseFormatJson: boolean = false
): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    temperature,
    response_format: responseFormatJson ? { type: "json_object" } : undefined
  });
  return response.choices?.[0]?.message?.content || "";
}
