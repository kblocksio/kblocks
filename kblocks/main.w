bring fs;
bring util;
bring "./resource.w" as r;

let root = util.env("KBLOCKS_PROJECT_ROOT");

let configfile = "{root}/kblocks.yaml";
if !fs.exists(configfile) {
  throw "{configfile} not found";
}

struct Config {
  output: str?;
  include: Array<str>?;
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
  let id = "{resource.definition.group.replaceAll(".", "-")}/{resource.definition.version}/{resource.definition.kind}";
  new r.Resource(sourcedir, resource) as id;
}
