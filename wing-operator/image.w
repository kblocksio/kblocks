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
    Image.copy(options.libdir, "{imagedir}/lib");
    Image.copy("{@dirname}/Dockerfile", "{imagedir}/Dockerfile");
    Image.copy("{@dirname}/hooks", "{imagedir}/hooks");

    let config = {
      configVersion: "v1",
      kubernetes: [
        {
          apiVersion: options.apiVersion,
          kind: options.kind,
          executeHookOnEvent: ["Added", "Modified", "Deleted"]
        }
      ]
    };

    fs.writeFile("{imagedir}/hooks/config.json", Json.stringify(config));

    Image.docker(["build", "-t", image, "."], imagedir);
    Image.docker(["push", image]);
  }

  extern "./util.js" static docker(args: Array<str>, cwd: str?): str;
  extern "./util.js" static makeExecutable(path: str): void;
  extern "./util.js" static copy(src: str, dest: str): void;
}
