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
    let files = MutArray<File>[];
    files.push({
      path: "README.md",
      content: "Hello, Portal!",
      readonly: false,
    });
    files.push({
      path: "./.github/workflows/service.yaml",
      content: "
name: Create a New Service

on:
  issues:
    types: [opened]

permissions:
  contents: write
  issues: write
  actions: write

jobs:
  create_new_service_file:
    if: contains(github.event.issue.labels.*.name, 'new-service')
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Extract issue details
        id: extract
        run: |
          ISSUE_BODY=$(jq -r '.issue.body' < \"$GITHUB_EVENT_PATH\")
          
          SERVICE_NAME=$(echo \"$ISSUE_BODY\" | grep -A 2 '### Service Name' | tail -n 1 | tr -d '\\r')
          APP_NAME=$(echo \"$ISSUE_BODY\" | grep -A 2 '### App Name' | tail -n 1 | tr -d '\\r')
          REPO_NAME=$(echo \"$ISSUE_BODY\" | grep -A 2 '### Repository Name' | tail -n 1 | tr -d '\\r')
          REPO_OWNER=$(echo \"$ISSUE_BODY\" | grep -A 2 '### Repository Owner' | tail -n 1 | tr -d '\\r')
          
          echo \"SERVICE_NAME=$SERVICE_NAME\" >> $GITHUB_ENV
          echo \"APP_NAME=$APP_NAME\" >> $GITHUB_ENV
          echo \"REPO_NAME=$REPO_NAME\" >> $GITHUB_ENV
          echo \"REPO_OWNER=$REPO_OWNER\" >> $GITHUB_ENV

      - name: Create YAML file
        run: |
          mkdir -p services
          echo \"apiVersion: acme.com/v1
          kind: Service
          metadata:
            name: $$\{\{ env.SERVICE_NAME }}
          labels:
            app: $$\{\{ env.APP_NAME }}
          repo:
            name: $$\{\{ env.REPO_NAME }}
            owner: $$\{\{ env.REPO_OWNER }}\" > services/$$\{\{ env.SERVICE_NAME }}.yaml

      - name: Commit and push changes
        run: |
          git config --global user.name \"github-actions[bot]\"
          git config --global user.email \"github-actions[bot]@users.noreply.github.com\"
          git add services/$$\{\{ env.SERVICE_NAME }}.yaml
          git commit -m \"Add new service $$\{\{ env.SERVICE_NAME }}\"
          git push

      - name: Close the issue
        run: gh issue close $GITHUB_ISSUE_NUMBER --comment \"Auto closing issue\"
        env:
          GH_TOKEN: $$\{\{ secrets.GITHUB_TOKEN }}
          GITHUB_ISSUE_NUMBER: $$\{\{ github.event.issue.number }}
",
      readonly: false,
    });
    files.push({
      path: ".github/ISSUE_TEMPLATE/service.yml",
      content: "
name: New Service
description: Create a new service
title: New Service
labels: new-service

body:

    - type: input
      id: service_name
      attributes:
          label: Service Name
          description: The name of the new service
          placeholder: my-new-service
      validations:
          required: true
    - type: input
      id: app_name
      attributes:
          label: App Name
          description: The name of the app associated with the service
          placeholder: my-new-app
      validations:
          required: true
    - type: input
      id: repo_name
      attributes:
          label: Repository Name
          description: The name of the repository for the new service
          placeholder: my-new-repo
      validations:
          required: true
    - type: input
      id: repo_owner
      attributes:
          label: Repository Owner
          description: The owner of the repository
          placeholder: owner-name
      validations:
          required: true

      ",
      readonly: false,
    });

    new k8s.ApiObject(unsafeCast({
      apiVersion: "acme.com/v1",
      kind: "Repository",
      name: spec.repo.name,
      owner: spec.repo.owner,
      files: files.copy(),
      tags: ["latest"],
      labels: ["new-service"],
      hasIssuesTab: true,
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
