import openai from "openai";
import fs from "fs/promises";
import path from "path";
import { readAll } from "./util";
import { Manifest } from "@kblocks/api";
import { EnrichInput, EnrichOutput } from "./enrich-prompts";
import { zodToJsonSchema } from "zod-to-json-schema";
import { resolveExternalAssets } from "./manifest-util";

export async function enrich(dir: string, manifest: Manifest): Promise<Manifest> {
  const resolved = await resolveExternalAssets(dir, manifest, undefined, true);
  const result = await enrichWithAi(dir, resolved);

  manifest.definition.icon = `heroicon://${result.icon}`;
  manifest.definition.description = result.description;

  manifest.definition.readme = manifest.definition.readme ?? "README.md";

  const readmePath = path.join(dir, manifest.definition.readme);
  await fs.writeFile(readmePath, result.readme);

  if (manifest.definition.schema.endsWith(".w")) {
    console.warn("Wing schemas cannot be enriched at the moment");
  } else {
    // write enriched schema and readme
    await fs.writeFile(manifest.definition.schema, JSON.stringify(result.schema, null, 2));
    await fs.writeFile(readmePath, result.readme);
  }

  return manifest;
}

async function enrichWithAi(dir: string, manifest: Manifest): Promise<EnrichOutput> {
  console.log("Enriching block manifest with AI...");

  const system = {
    inputSchema: zodToJsonSchema(EnrichInput),
    outputSchema: zodToJsonSchema(EnrichOutput),
  };


  const user = {
    input: {
      manifest,
      sourceCode: await readAll(path.join(dir, "src"), p => {
        switch (manifest.engine) {
          case "wing":
          case "wing/tf-aws":
          case "wing/k8s":
            return p.endsWith(".w");

          case "cdk8s":
            return p.endsWith(".ts");

          case "pulumi":
            return p.endsWith(".ts");

          case "helm":
            return p.endsWith(".yaml") || p.endsWith(".yml");

          case "noop":
            return false;

          case "tofu":
            return p.endsWith(".tf");

          case "terraform":
            return p.endsWith(".tf");

          case "custom":
            return p.endsWith("create") || p.endsWith("delete") || p.endsWith("update");

          default:
            return false;
        }
      }),
    } satisfies EnrichInput,
  };

  if (process.env.DEBUG_PROMPT) {
    const dump = "/tmp/kblocks-enrich-prompt.json";
    await fs.writeFile(dump, JSON.stringify({ system, user }, null, 2));
    console.log(`Dumped prompt to ${dump} for debugging`);
  }

  const oai = new openai.OpenAI();
  const result = await oai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system",  content: JSON.stringify(system) },
      { role: "user", content: JSON.stringify(user) }
  
    ],
  });

  return JSON.parse(result.choices[0].message.content ?? "{}") as EnrichOutput;
}
