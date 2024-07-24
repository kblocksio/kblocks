bring fs;

pub struct ImageOptions {
  apiVersion: str;
  kind: str;
  libdir: str;
}

pub class Image {
  new(image: str, options: ImageOptions) {
    let imagedir = "{nodeof(this).app.workdir}/image-{nodeof(this).addr}";

    fs.mkdir(imagedir);
    Image.copyDir(options.libdir, "{imagedir}/lib");

    fs.writeFile("{imagedir}/main.w", "
bring fs;
bring util;
bring \".\" as lib;

let readContext = (j: Json): Array<Json> => \{
  let result = MutArray<Json>[];

  let readObjects = (j: Json) => \{
    for v in Json.values(j) \{
      if let objects = v.tryGet(\"objects\") \{
        readObjects(objects);
      } else \{
        if let object = v.tryGet(\"object\") \{
          result.push(object);
        }
      }
    }
    
    return result.copy();
  };

  return readObjects(j);
};

let x = fs.readJson(util.env(\"BINDING_CONTEXT_PATH\"));
log(Json.stringify(x, indent: 2));

for o in readContext(x) \{
  if let name = o.tryGet(\"metadata\")?.tryGet(\"name\") \{
    try \{
      new lib.{options.kind}(unsafeCast(o)) as name.asStr();
    } catch e \{
      fs.writeFile(\"validation.txt\", e);
      throw e;
    }
  }
}
  ");

    fs.writeFile("{imagedir}/Dockerfile", "
FROM ghcr.io/flant/shell-operator:latest
RUN apk add --no-cache npm nodejs
RUN npm i -g winglang
ADD pods-hook.sh /hooks

RUN mkdir /wing
ADD lib /wing
ADD main.w /wing
RUN cd /wing && npm i --omit=dev && npm i @winglibs/cdk8s

ENV LOG_TYPE color

    ");

    fs.writeFile("{imagedir}/pods-hook.sh", "#!/usr/bin/env bash
if [[ $1 == \"--config\" ]] ; then
  cat <<EOF
configVersion: v1
kubernetes:
- apiVersion: {options.apiVersion}
  kind: {options.kind}
  executeHookOnEvent: [\"Added\", \"Modified\"]
EOF
else
  cd /wing
  wing compile -t @winglibs/cdk8s main.w
  if [ $? -ne 0 ]; then
    echo 'Failed to compile'
    VALIDATION=$(cat ./validation.txt)
    kubectl patch workload my-workload --type=merge --subresource status --patch 'status: \{validation: \"$VALIDATION\"\}'
    exit 0
  fi
  echo '================================================================='
  cat target/main.cdk8s/*.yaml
  echo '================================================================='
  if [ -n \"$(cat target/main.cdk8s/*.yaml)\" ]; then
    kubectl apply -n default -f target/main.cdk8s/*.yaml
  else
    echo 'No resources to apply'
  fi
fi
    ");

    Image.makeExecutable("{imagedir}/pods-hook.sh");

    Image.docker(["build", "-t", image, "."], imagedir);
    Image.docker(["push", image]);
  }

  extern "./util.js" static docker(args: Array<str>, cwd: str?): str;
  extern "./util.js" static makeExecutable(path: str): void;
  extern "./util.js" static copyDir(src: str, dest: str): void;
}
