import openai from "openai";
import type { BindingContext } from "./api/index.js";
import type { Blocks } from "./slack.js";
import { RuntimeContext } from "./host.js";

const prompt = "Provide the root cause of this error with concise instructions on how to fix. Output format should be JSON of Slack blocks with 'mrkdwn' sections. Do not wrap this in triple backticks, just output raw well-formatted JSON.";

export async function chatCompletion(input: openai.ChatCompletionCreateParamsNonStreaming): Promise<string | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Skipping AI analysis because OPENAI_API_KEY is not set");
    return undefined;
  }

  const client = new openai.OpenAI({ apiKey });

  const response = await client.chat.completions.create(input);
  return response.choices?.[0]?.message?.content ?? undefined;
}

/**
 * Explains an error message and provides instructions on how to fix it.
 * @param {string} error 
 * @returns A slack "blocks" JSON object that explains the error and provides instructions on how to fix it.
 */
export async function explainError(host: RuntimeContext, context: BindingContext, error: string): Promise<{ blocks: Blocks } | undefined> {

  console.error("Analyzing error with AI...");

  const content = await host.chatCompletion({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify({ context, error }) },
    ],
  })

  if (!content) {
    console.error("WARNING: Did not receive a response from the AI");
    return undefined;
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("WARNING: Could not parse AI response", e);
    return undefined;
  }
}
