bring fs;
bring util;
bring "./resource.w" as r;

class Helpers {
  extern "./util.js" pub static mergeEnv(resource: r.ResourceProps, global: OperatorsConfig): r.ResourceProps;
}

let root = util.env("KBLOCKS_PROJECT_ROOT");

let configfile = "{root}/kblocks.yaml";
if !fs.exists(configfile) {
  throw "{configfile} not found";
}

struct Config {
  output: str?;
  include: Array<str>?;
  operators: OperatorsConfig;
}

struct OperatorsConfig {
  env: Map<str>?;
  envSecrets: Map<str>?;
}

let x = fs.readYaml(configfile);
let cfg = Config.fromJson(x.at(0));

if let output = cfg.output {
  if output != "helm" {
    throw "output must be 'helm'";
  }
}

for include in cfg.include ?? [] {
  let sourcedir = fs.absolute(root, include);
  let kblockfile = "{sourcedir}/kblock.yaml";
  if !fs.exists(kblockfile) {
    throw "{kblockfile} not found";
  }

  let resource = r.ResourceProps.fromJson(fs.readYaml(kblockfile).at(0));
  let merged = Helpers.mergeEnv(resource, cfg.operators);

  let id = "{resource.definition.group.replaceAll(".", "-")}/{resource.definition.version}/{resource.definition.kind}";
  new r.Resource(sourcedir, merged) as id;
}
