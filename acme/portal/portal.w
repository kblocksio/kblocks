bring util;
bring "@winglibs/k8s" as k8s;
bring "cdk8s-plus-30" as cdk8s;

pub struct File  {
  path: str;
  content: str;
  readonly: bool?;
}

pub struct RepoSpec {
  name: str;
  owner: str;
  public: bool?;
}

pub struct PortalSpec {
  repo: RepoSpec;
}

pub class Portal {
  new(spec: PortalSpec) {
    let files: Array<File> = [{
      path: "README.md",
      content: "Hello, Portal!",
      readonly: false,
    }];

    new k8s.ApiObject(unsafeCast({
      apiVersion: "acme.com/v1",
      kind: "Repository",
      name: spec.repo.name,
      owner: spec.repo.owner,
      files,
      tags: ["latest"],
    })) as "portal-repo";

    let repoURL = "https://github.com/{spec.repo.owner}/{spec.repo.name}.git";
    new k8s.ApiObject(
      apiVersion: "argoproj.io/v1alpha1",
      kind: "Application",
      metadata: {
        namespace: "argocd"
      },
      spec: {
        project: "default",
        source: {
          repoURL,
          targetRevision: "main",
          path: "./services",
        },
        destination: {
          server: "https://kubernetes.default.svc",
          namespace: spec.repo.name,
        },
        syncPolicy: {
          automated: {
            selfHeal: true,
          },
          syncOptions: [
            "CreateNamespace=true"
          ],
        }
      },
    ) as "argo-application";

    new cdk8s.Secret(
      metadata: {
        namespace: "argocd",
        labels: {
          "argocd.argoproj.io/secret-type": "repository",
        }
      },
      stringData: {
        url: repoURL,
        password: util.env("GITHUB_TOKEN"),
        username: "not-used",
      }
    );
  }
} 
