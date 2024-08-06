bring fs;

pub struct ImageOptions {
  apiVersion: str;
  kind: str;
  source: str;
  engine: str;
}

pub class Image {
  new(image: str, options: ImageOptions) {
    // first, let's build the base controller image (common to all resources)
    let controller = "{@dirname}/controller";
    let controllerImageTag = "kblocks-controller-base";
    Image.docker(["build", "-t", controllerImageTag, "."], controller);

    // now, we create the Dockerfile for the resource-specific image
  
    let imagedir = "{nodeof(this).app.workdir}/image-{fs.basename(options.source)}";

    fs.mkdir(imagedir);
    Image.copy(options.source, "{imagedir}/kblock");

    fs.writeFile("{imagedir}/kblock.json", Json.stringify({
      engine: options.engine,
      config: {
        configVersion: "v1",
        kubernetes: [
          {
            apiVersion: options.apiVersion,
            kind: options.kind,
            executeHookOnEvent: ["Added", "Modified", "Deleted"]
          }
        ]  
      }
    }));

    fs.writeFile("{imagedir}/Dockerfile", [
      "FROM {controllerImageTag}",
      "COPY kblock.json /hooks/kblock.json",
      "COPY kblock /kblock",
      "RUN cd /kblock && ([ -f package.json ] && npm i --omit=dev || true)",
      "RUN cd /kblock && ([ -f Chart.yaml ] && helm dependency update || true)",
    ].join("\n"));

    Image.docker(["build", "-t", image, "."], imagedir);
    Image.docker(["push", image]);
  }

  extern "./util.js" static docker(args: Array<str>, cwd: str?): str;
  extern "./util.js" static makeExecutable(path: str): void;
  extern "./util.js" static copy(src: str, dest: str): void;
}
