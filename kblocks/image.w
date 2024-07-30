bring fs;

pub struct ImageOptions {
  apiVersion: str;
  kind: str;
  source: str;
  engine: str;
}

pub class Image {
  new(image: str, options: ImageOptions) {
    let imagedir = "{nodeof(this).app.workdir}/image-{nodeof(this).addr}";

    fs.mkdir(imagedir);
    Image.copy("{@dirname}/controller", imagedir);
    Image.copy(options.source, "{imagedir}/kblock");

    fs.writeFile("{imagedir}/hooks/kblock.json", Json.stringify({
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

    Image.docker(["build", "-t", image, "."], imagedir);
    Image.docker(["push", image]);
  }

  extern "./util.js" static docker(args: Array<str>, cwd: str?): str;
  extern "./util.js" static makeExecutable(path: str): void;
  extern "./util.js" static copy(src: str, dest: str): void;
}
