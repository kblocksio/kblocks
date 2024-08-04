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

pub struct ServiceSpec {
  repo: RepoSpec;
}

pub class Service {
  new(spec: ServiceSpec) {
    let files = MutArray<File>[];
    
    files.push({
      path: "README.md",
      content: "Hello, World!",
      readonly: false,
    });
    
    files.push({
      path: "Dockerfile",
      content: [
        "FROM hashicorp/http-echo:latest",
      ].join("\n"),
      readonly: false,
    });
    
    files.push({
      path: "Chart.yaml",
      content: [
        "apiVersion: v2",
        "name: {spec.repo.name}",
        "description: Helm chart for {spec.repo.name}",
        "type: application",
        "version: 0.1.0",
        "appVersion: \"0.0.1\"",
      ].join("\n"),
      readonly: false,
    });
    
    files.push({
      path: "values.yaml",
      content: "revision: latest",
      readonly: false,
    });
    
    files.push({
      path: "./templates/workload.yaml",
      content: "
apiVersion: acme.com/v1
kind: Workload
metadata:
  name: workload
image: wingcloudbot/{spec.repo.name}:sha-\{\{ .Values.revision }}
port: 5678
route: /{spec.repo.name}(/|$)(.*)
rewrite: /$2
replicas: 2
env:
  ECHO_TEXT: \"hello from {spec.repo.name}\"
",
      readonly: false,
    });
    
    files.push({
      path: "./.github/workflows/build.yml",
      content: "
name: Build
on: [push]
permissions:
  contents: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        name: Checkout repository
        with:
          fetch-depth: 0
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: $$\{\{ secrets.DOCKER_USERNAME }}
          password: $$\{\{ secrets.DOCKER_PASSWORD }}
      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: wingcloudbot/{spec.repo.name}
          tags: |
            type=raw,value=latest,enable=\{\{is_default_branch}}
            type=sha
      - name: Build and push Docker image
        id: push
        uses: docker/build-push-action@v5
        with:
          push: true
          platforms: linux/amd64,linux/arm64
          tags: $$\{\{ steps.meta.outputs.tags }}
          labels: $$\{\{ steps.meta.outputs.labels }}
      - uses: rickstaa/action-create-tag@v1
        with:
          tag: \"latest\"
          force_push_tag: true
          message: \"Latest release\"
",
      readonly: true,
    });

    new k8s.ApiObject(unsafeCast({
      apiVersion: "acme.com/v1",
      kind: "Repository",
      name: spec.repo.name,
      owner: spec.repo.owner,
      files: files.copy(),
      tags: ["latest"],
    })) as "service-repo";

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
          targetRevision: "latest",
          path: "./",
          helm: {
            parameters: [{
              name: "revision",
              value: "$ARGOCD_APP_REVISION_SHORT",
            }],
          },
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
