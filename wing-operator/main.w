bring fs;
bring "./resource.w" as r;

let config = "resources.yaml";

if !fs.exists(config) {
  throw "{config} not found";
}

let x = fs.readYaml(config);

for y in Json.values(x.at(0)) {
  let resource = r.ResourceProps.fromJson(y);
  let id = "{resource.definition.group.replaceAll(".", "-")}/{resource.definition.version}/{resource.definition.kind}";
  new r.Resource(resource) as id;
}
