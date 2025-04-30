bring "cdktf" as cdktf;
bring "@cdktf/provider-github" as github;
bring fs;
bring util;

pub struct AutoBuildSpec {
  /// The GitHub repository to build (e.g. "org-name/repo-name")
  repository: str;

  /// The branch to build. If not specified, the default branch will be used.
  branch: str?;

  /// The root directory of the repository to build. If not specified, the root directory will be used.
  rootDirectory: str?;

  /// The path to the Dockerfile in the repository. If not specified, "Dockerfile" will be used.
  dockerFilePath: str?;

  /// The name of the image to push to the registry. If not specified, the repository name will be used.
  imageName: str?;

  /// The deployment target to update with the new image tag.
  deploy: DeploymentTarget?;
}

struct DeploymentTarget {
  /// The URI of the block to deploy (e.g. "acme.com/v1/workloads/portal-backend.quickube.sh/default/portal-backend")
  blockUri: str;

  /// The field of the block to update (e.g. "image")
  /// @default "image"
  field: str?;
}

pub class AutoBuild {
  new(spec: AutoBuildSpec) {
    let branch = spec.branch ?? "main";

    let parts = spec.repository.split("/");
    let owner = parts[0];
    let repo = parts[1];

    let imageName = spec.imageName ?? repo;

    new github.provider.GithubProvider(owner: owner);

    let username = #"${{ secrets.DOCKER_USERNAME }}";
    let password = #"${{ secrets.DOCKER_PASSWORD }}";
    let githubSha = #"${{ github.sha }}";
    let rootDirectory = spec.rootDirectory ?? ".";
    let dockerFilePath = spec.dockerFilePath ?? "Dockerfile";
    let steps = MutArray<Json> [
      {
        "name": "Checkout code",
        "uses": "actions/checkout@v4"
      },
      {
        "name": "Login to Docker Hub",
        "uses": "docker/login-action@v3",
        "with": {
          "username": "{username}",
          "password": "{password}"
        }
      },
      {
        "name": "Set up QEMU",
        "uses": "docker/setup-qemu-action@v3"
      },
      {
        "name": "Set up Docker Buildx",
        "uses": "docker/setup-buildx-action@v3"
      },
      {
        "name": "Build and push Docker image",
        "uses": "docker/build-push-action@v5",
        "with": {
          "push": true,
          "context": "{rootDirectory}",
          "dockerfile": "{dockerFilePath}",
          "platforms": "linux/amd64,linux/arm64",
          "tags": "{username}/{imageName}:{githubSha}"
        }
      },
    ];

    if let deploy = spec.deploy {
      let field = deploy.field ?? "image";

      let patch = MutJson {};
      let fieldParts = field.split(".");
      let var currentObj = patch;
      
      let var i = 0;
      while (i < fieldParts.length - 1) {
        currentObj.set(fieldParts[i], MutJson {});
        currentObj = currentObj.get(fieldParts[i]);
        i = i + 1;
      }
      
      currentObj.set(fieldParts[fieldParts.length - 1], "{username}/{imageName}:{githubSha}");
      
      let patchStr = Json.stringify(patch);
      let kblocksApi = util.env("KBLOCKS_API");
  
      let command = [
        "curl",
        "-X", "PATCH",
        "-H", Json.stringify("content-type: application/json"),
        "{kblocksApi}/resources/{deploy.blockUri}",
        "-d",
        "'{patchStr}'",
      ];
  
      steps.push({
        "name": "Deploy to {deploy.blockUri}",
        "run": command.join(" ")
      });
    }

    let workflow = {
      "name": "AutoBuild",
      "on": {
        "push": {
          "branches": [ branch ]
        }
      },
      "jobs": {
        "release": {
          "runs-on": "ubuntu-latest",
          "steps": steps.copy()
        }
      }
    };

    let tempdir = fs.mkdtemp();
    let workflowPath = "{tempdir}/autobuild.yml";

    fs.writeYaml(workflowPath, workflow);

    new github.repositoryFile.RepositoryFile(
      file: ".github/workflows/autobuild.yml",
      content: cdktf.Fn.file(workflowPath),
      repository: repo,
      overwriteOnCreate: true,
      commitMessage: "Update autobuild workflow",
      branch: branch,
    );
  }
}