import fs from "fs";
import path from "path";
import yaml from "yaml";
import ejs from "ejs";
import { ApiObject, Manifest } from "./api";
import { importCommand } from "./import";

export interface InitOptions {
  TEMPLATE?: string;
  DIR?: string;
  import?: boolean;

  group?: string;
  kind?: string;
  plural?: string;
  icon?: string;
  description?: string;
  apiVersion?: string;
  color?: string;
  listKind?: string;
  shortNames?: string[];
  categories?: string[];
  singular?: string;
}

export async function initCommand(argv: InitOptions) {
  if (!argv.TEMPLATE) {
    throw new Error("Template is required. Use --template <template-name> to specify the template to use. Available templates: " + Object.keys(listProjectTemplates()).join(", "));
  }

  if (!argv.DIR) {
    throw new Error("Directory is required");
  }

  // if the directory exists, error out
  if (fs.existsSync(argv.DIR)) {
    throw new Error(`Directory '${argv.DIR}' already exists`);
  }

  const templateDir = path.join(__dirname, `../init-templates/${argv.TEMPLATE}`);
  if (!fs.existsSync(templateDir)) {
    throw new Error(`Template '${argv.TEMPLATE}' not found`);
  }

  const targetDir = path.resolve(process.cwd(), argv.DIR);


  // read the manifest from the template and apply any command line options to it so it is possible
  // to pass the manifest to the template renderer

  const docs = yaml.parseAllDocuments(fs.readFileSync(path.join(templateDir, "kblock.yaml"), "utf-8"));
  if (docs.length !== 1) {
    throw new Error("Expected exactly one YAML document in kblock.yaml");
  }

  const manifest = docs[0].toJSON() as ApiObject & { spec: Manifest };
  if (manifest.apiVersion !== "kblocks.io/v1" || manifest.kind !== "Block") {
    throw new Error("Expected the first document in kblock.yaml to be a Block");
  }

  const options = ["group", "apiVersion", "kind", "plural", "icon", "description", "color", "listKind", "shortNames", "categories", "singular"];
  for (const option of options) {
    const arg = (argv as any)[option];
    if (arg) {
      const targetOptions = option === "apiVersion" ? "version" : option;
      (manifest.spec.definition as any)[targetOptions] = arg;
    }
  }

  const errors = [];

  if (!manifest.spec.definition.group) {
    errors.push("--group is required");
  }

  if (!manifest.spec.definition.plural) {
    errors.push("--plural is required");
  }

  if (!manifest.spec.definition.kind) {
    errors.push("--kind is required");
  }

  if (!manifest.spec.definition.version) {
    errors.push("--apiVersion is required");
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  manifest.spec.definition.singular = manifest.spec.definition.singular ?? manifest.spec.definition.kind.toLowerCase();

  manifest.metadata = manifest.metadata ?? {};
  manifest.metadata.name = `${manifest.spec.definition.plural}.${manifest.spec.definition.group}`;


  fs.mkdirSync(targetDir, { recursive: true });
  pasteTemplate(templateDir, targetDir, manifest);

  if (argv.import) {
    await importCommand({
      DIR: path.join(targetDir, "src"),
      group: manifest.spec.definition.group,
      apiVersion: manifest.spec.definition.version,
      kind: manifest.spec.definition.kind,
    });

    if (!manifest.spec.operator) {
      manifest.spec.operator = {};
    }
    manifest.spec.operator.skipCrd = true;
    manifest.spec.operator.flushOnly = true;
  }

  // write the kblock.yaml file
  fs.writeFileSync(path.join(targetDir, "kblock.yaml"), yaml.stringify(manifest));

  const kb = path.basename(process.argv[1]);

  console.log(`🎉 Your new and shiny ${manifest.spec.engine} block is ready!`);
  console.log("");
  console.log("Next steps:");
  console.log("");
  console.log("1. Add your code to the `src` directory");
  console.log(`2. Update '${manifest.spec.definition.schema}' with the input schema for your block`);
  console.log("3. Update the `kblock.yaml` file with the outputs for your block");
  console.log("");
  console.log("Once you are ready, you can run `kb enrich` in order to automatically update your README file,");
  console.log("come up with a description for the block, your schema fields and find a good icon.");
  console.log("");
  console.log(`  ${kb} enrich ${argv.DIR}`);
  console.log("");
  console.log("To install it to a cluster use:");
  console.log("");
  console.log(`  ${kb} install ${argv.DIR}`);
  console.log("");
}

export function catalogCommand() {
  const templates = listProjectTemplates();
  console.log(JSON.stringify(templates, null, 2));
}

export const listProjectTemplates = () => {
  const basedir = path.join(__dirname, "../init-templates");
  const dirs = fs.readdirSync(basedir);
  const results: Record<string, ProjectTemplate> = {};

  for (const dir of dirs) {
    // skip non-directories
    if (!fs.statSync(path.join(basedir, dir)).isDirectory()) {
      continue;
    }

    const t = readProjectTemplate(basedir, dir);
    results[dir] = t;
  }

  return results;
}

export const readProjectTemplate = (basedir: string, dir: string) => {
  const manifestFile = path.join(basedir, dir, ".kbinit", "manifest.yaml"); 
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Unable to find ${manifestFile}`);
  }

  const docs = yaml.parseAllDocuments(fs.readFileSync(manifestFile, "utf-8"));
  if (docs.length !== 1) {
    throw new Error(`Expected exactly one YAML document in kb-init.yaml for ${dir}`);
  }

  const manifest = docs[0].toJSON() as ProjectTemplate;

  const readme = fs.readFileSync(path.join(basedir, dir, "README.md"), "utf-8");

  return {
    ...manifest,
    readme,
    icon: fs.readFileSync(path.join(path.dirname(manifestFile), manifest.icon), "utf-8"),
  };
}

type ProjectTemplate = {
  name: string;
  description: string;
  icon: string;
  readme: string;
};

/**
 * Copy all files (recursively) from the template directory to the target directory, while rendering the files
 * with EJS so that the variables in the block manifest can be replaced.
 * 
 * @param templateDir  The source directory of the template 
 * @param targetDir  The target directory to copy the template to
 * @param blockManifest  The block manifest to use when rendering the template
 */
function pasteTemplate(templateDir: string, targetDir: string, blockManifest: ApiObject & { spec: Manifest }) {
  const files = fs.readdirSync(templateDir);
  for (const file of files) {
    const filePath = path.join(templateDir, file);
    const targetPath = path.join(targetDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === ".kbinit") {
        continue;
      }

      fs.mkdirSync(targetPath, { recursive: true });
      pasteTemplate(filePath, targetPath, blockManifest);
    } else {  
      const contents = fs.readFileSync(filePath, "utf-8");  
      const rendered = ejs.render(contents, blockManifest);
      fs.writeFileSync(targetPath, rendered);
    }
  }
}