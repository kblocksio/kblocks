import openai from "openai";
import type { BindingContext } from "./types";
import type { Blocks } from "./slack";

const prompt = "Provide the root cause of this error with concise instructions on how to fix. Output format should be JSON of Slack blocks with 'mrkdwn' sections. Do not wrap this in triple backticks, just output raw well-formatted JSON.";

/**
 * Explains an error message and provides instructions on how to fix it.
 * @param {string} error 
 * @returns A slack "blocks" JSON object that explains the error and provides instructions on how to fix it.
 */
export async function explainError(context: BindingContext, error: string): Promise<{ blocks: Blocks } | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Skipping AI analysis because OPENAI_API_KEY is not set");
    return undefined;
  }

  console.error("Analyzing error with AI...");
  const client = new openai.OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: JSON.stringify({ context, error }) },
    ],
  })

  if (!response.choices?.[0]?.message?.content) {
    console.error("WARNING: Did not receive a response from the AI");
    return undefined;
  }

  try {
    return JSON.parse(response.choices?.[0]?.message?.content);
  } catch (e) {
    console.error("WARNING: Could not parse AI response", e);
    return undefined;
  }
}



// const test = async () => {
//   const fs = require("fs");
//   const message = fs.readFileSync(__dirname + "/fixtures/error.txt", "utf-8");

//   const result = await explainError(message);
//   console.log(JSON.stringify(result, undefined, 2));
// };


// test().catch(console.error);