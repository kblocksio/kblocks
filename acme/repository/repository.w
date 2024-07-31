bring util;
bring "@cdktf/provider-github" as github;

pub struct RepositorySpec {
  name: str;
  owner: str;
  public: bool?;
  files: Map<str>?;
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
      for file in files.entries() {

        new github.repositoryFile.RepositoryFile(
          repository: repo.name,
          file: file.key,
          content: file.value,
        ) as "file-{file.key.replaceAll("/", "-")}";
      }
    }
  }
}
