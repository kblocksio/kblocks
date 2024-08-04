bring util;
bring "cdktf" as cdktf;
bring "@cdktf/provider-github" as github;

pub struct File  {
  path: str;
  content: str;
  allowChanges: bool?;
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
    new github.provider.GithubProvider(token: util.env("GITHUB_TOKEN"), owner: spec.owner);
    let var visibility = "public";
    if spec.public == false {
      visibility = "private";
    }

    let repo = new github.repository.Repository(name: spec.name, visibility: visibility);

    if let files = spec.files {
      for file in files {
        let var lifecycle: cdktf.TerraformResourceLifecycle = {};
        if let allowChanges = file.allowChanges {
          if allowChanges {
            lifecycle = {
              ignoreChanges: "all"
            };
          }
        }

        let repoProps: github.repositoryFile.RepositoryFileConfig = {
          repository: repo.name,
          file: file.path,
          content: file.content,
          lifecycle,
        };

        new github.repositoryFile.RepositoryFile(repoProps) as "file-{file.path.replaceAll("/", "-")}";
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
