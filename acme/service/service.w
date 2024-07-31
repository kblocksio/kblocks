bring "@winglibs/k8s" as k8s;

pub struct RepoSpec {
  name: str;
  owner: str;
  public: bool?;
  files: Map<str>?;
}

pub struct ServiceSpec {
  repo: RepoSpec;
}

pub class Service {
  new(spec: ServiceSpec) {
    let files = spec.repo.files?.copyMut();

    new k8s.ApiObject(unsafeCast({
      apiVersion: "acme.com/v1",
      kind: "Repository",
      name: spec.repo.name,
      owner: spec.repo.owner,
      files: spec.repo.files,
    })) as "service-repo";

    new k8s.ApiObject(unsafeCast({
      apiVersion: "acme.com/v1",
      kind: "Repository",
      name: "{spec.repo.name}-config",
      owner: spec.repo.owner,
      files: {
        "README.md": "Insert helm chart here"
      },
    })) as "service-config-repo";

    new k8s.ApiObject(
      apiVersion: "argoproj.io/v1alpha1",
      kind: "Application",
      metadata: {
        namespace: "argocd"
      },
      spec: {
        project: "default",
        source: {
          repoURL: "https://github.com/{spec.repo.owner}/{spec.repo.name}.git",
          targetRevision: "HEAD",
          path: "./"
        },
        destination: {
          server: "https://kubernetes.default.svc",
          namespace: spec.repo.name,
        },
      },
    ) as "argo-application";
  }
} 
