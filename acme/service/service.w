bring util;
bring "@winglibs/k8s" as k8s;
bring "cdk8s-plus-30" as cdk8s;

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
    let files = {
      "README.md": "Hello, World!",
      "Dockerfile": "
FROM hashicorp/http-echo:latest
ENV ECHO_TEXT=hello",
      "Chart.yaml": "
apiVersion: v2
name: hello-world
description: A Helm chart for Kubernetes
type: application
version: 0.1.0
appVersion: \"1.0.0\"
      ",
      "values.yaml": "
revision: latest",
      "./templates/deployment.yaml": "
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  labels:
    app: my-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      - name: my-service
        image: wingcloudbot/{spec.repo.name}:sha-\{\{ .Values.revision }}
        ports:
        - containerPort: 5678",
      "./.github/workflows/build.yml": "
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
          tags: $$\{\{ steps.meta.outputs.tags }}
          labels: $$\{\{ steps.meta.outputs.labels }}
      - uses: rickstaa/action-create-tag@v1
        with:
          tag: \"latest\"
          force_push_tag: true
          message: \"Latest release\"
"
    };

    new k8s.ApiObject(unsafeCast({
      apiVersion: "acme.com/v1",
      kind: "Repository",
      name: spec.repo.name,
      owner: spec.repo.owner,
      files,
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
