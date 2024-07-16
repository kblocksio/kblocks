bring fs;

pub struct ImageOptions {
  apiVersion: str;
  kind: str;
}

pub class Image {
  new(image: str, options: ImageOptions) {
    let imagedir = nodeof(this).app.workdir + "/image";

    fs.mkdir(imagedir);

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
  echo \">>>>>>>>>>>>>>>>>>>>>>> $BINDING_CONTEXT_PATH <<<<<<<<<<<<<<<<<<<<<\"
  cat $BINDING_CONTEXT_PATH
fi
    ");

    fs.writeFile("{imagedir}/Dockerfile", "
FROM ghcr.io/flant/shell-operator:latest
RUN apk add --no-cache npm nodejs
RUN npm i -g winglang
ADD pods-hook.sh /hooks
    ");

    Image.makeExecutable("{imagedir}/pods-hook.sh");

    Image.docker(["build", "-t", image, "."], imagedir);
    Image.docker(["push", image]);
  }

  extern "./util.js" static docker(args: Array<str>, cwd: str?): str;
  extern "./util.js" static makeExecutable(path: str): void;
}
