bring util;
bring "cdktf" as cdktf;
bring "@cdktf/provider-github" as github;

class Helpers {
  extern "./util.js" pub static randomHexColor(): str;
}

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
  labels: Array<str>?;
  hasIssuesTab: bool?;
}

pub class Repository {
  new(spec: RepositorySpec) {
    new github.provider.GithubProvider(token: util.env("GITHUB_TOKEN"), owner: spec.owner);
    let var visibility = "public";
    if spec.public == false {
      visibility = "private";
    }
    let var hasIssues = false;
    if spec.hasIssuesTab == true {
      hasIssues = true;
    }
    let repo = new github.repository.Repository(
      name: spec.name,
      visibility: visibility,
      hasIssues: hasIssues
    );

    if let files = spec.files {
      for file in files {
        let var lifecycle: cdktf.TerraformResourceLifecycle = {};
        let readonly = file.readonly ?? true;
        if !readonly {
          lifecycle = {
            ignoreChanges: "all"
          };
        }

        let repoProps: github.repositoryFile.RepositoryFileConfig = {
          repository: repo.name,
          file: file.path,
          content: file.content,
          lifecycle,
        };

        new github.repositoryFile.RepositoryFile(repoProps) as "file-{file.path.replaceAll("/", "-")}";
      }

      if let labels = spec.labels {
        for label in labels {
          new github.issueLabel.IssueLabel(
            repository: repo.name,
            name: label,
            color: Helpers.randomHexColor(),
          ) as "label-{label}";
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
