bring util;
bring "cdktf" as cdktf;
bring "@cdktf/provider-github" as github;
bring "@cdktf/provider-null" as nullProvider;

pub struct File  {
  path: str;
  content: str;

  /// defaults to `true`, which means that the file is immutable
  readonly: bool?;
}

pub struct RepositorySpec {
  name: str;
  owner: str;
  public: bool?;
  files: Array<File>?;
  tags: Array<str>?;
}

pub class Repository {
  new(spec: RepositorySpec) {
    let githubToken = util.env("GITHUB_TOKEN");
    new nullProvider.provider.NullProvider();
    new github.provider.GithubProvider(token: githubToken, owner: spec.owner);
    let var visibility = "public";
    if spec.public == false {
      visibility = "private";
    }

    let repo = new github.repository.Repository(name: spec.name, visibility: visibility);

    if let files = spec.files {
      let deps = MutArray<cdktf.ITerraformDependable>[repo];
      for file in files {
        let readonly = file.readonly ?? true;
        if !readonly {
          let resource = new nullProvider.resource.Resource(triggers: {}, dependsOn: deps.copy()) as "file-{file.path.replaceAll("/", "-")}";
          deps.push(resource);

          let token = util.env("GITHUB_TOKEN");
          let object = {
            message: "Create file {file.path}",
            content: util.base64Encode(file.content),
          };
          resource.addOverride("provisioner.local-exec.environment", {"FILE_NAME": file.path});
          resource.addOverride("provisioner.local-exec.command", "
curl -L -X PUT -H \"Accept: application/vnd.github+json\" -H \"Authorization: Bearer $GITHUB_TOKEN\" -H \"X-GitHub-Api-Version: 2022-11-28\" https://api.github.com/repos/{repo.fullName}/contents/{file.path} -d '{Json.stringify(object)}'
");
        } else {
          let repoProps: github.repositoryFile.RepositoryFileConfig = {
            repository: repo.name,
            file: file.path,
            content: file.content,
          };
  
          new github.repositoryFile.RepositoryFile(repoProps) as "file-{file.path.replaceAll("/", "-")}";
        }
      }

      if let tags = spec.tags {
        for tag in tags {
          new github.release.Release(
            repository: repo.name,
            tagName: tag,
          ) as "release-{tag}";
        }
      }
    }
  }
}
