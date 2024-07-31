bring util;
bring "@cdktf/provider-github" as github;

pub struct RepositorySpec {
  name: str;
  owner: str;
  public: bool?;
}

pub class Repository {
  new(spec: RepositorySpec) {
    new github.provider.GithubProvider(token: util.env("GITHUB_TOKEN"), owner: spec.owner);
    let var visibility = "public";
    if spec.public == false {
      visibility = "private";
    }
    new github.repository.Repository(name: spec.name, visibility: visibility);
  }
}
