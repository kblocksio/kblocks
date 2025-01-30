bring "cdktf" as cdktf;
bring "@cdktf/provider-github" as github;
bring fs;
bring util;

pub struct AutoBuildStaticSiteSpec {
  /// The GitHub repository to build (e.g. "org-name/repo-name")
  repository: str;

  /// The branch to build. If not specified, the default branch will be used.
  branch: str?;

  /// The directory from which to build the static website.
  rootDirectory: str?;

  /// The command to build the static website.
  buildCommand: str?;

  /// The directory to output the static website to.
  outputDirectory: str?;

  /// The name of the S3 bucket to deploy the static website to (e.g. "my-website-bucket")
  bucketName: str;

  /// The region to deploy the static website to.
  region: str?;

  /// The CloudFront distribution ID whos cache to invalidate after deployment.
  cloudFrontDistributionId: str?;

  /// Individual environment variables to set in the container
  env: Map<EnvVariable>?;
}

pub struct EnvVariable {
  value: str?;
}

pub class Util {
  pub static renderEnvVariables(env: Map<EnvVariable>?): Map<str> {
    let result = MutMap<str>{};

    for e in env?.entries() ?? [] {

      let name = e.key;
      let val = e.value;

      if let value = val.value {
        result.set(name, value);
        continue;
      }

      throw "`value` must be specified for variable {name}";
    }

    return result.copy();
  }
}

pub class AutoBuildStaticSite {
  new(spec: AutoBuildStaticSiteSpec) {
    let branch = spec.branch ?? "main";
    let buildCommand = spec.buildCommand ?? "npm run build";
    let outputDirectory = spec.outputDirectory ?? "dist";
    let rootDirectory = spec.rootDirectory ?? ".";
    let region = spec.region ?? "us-east-1";

    let parts = spec.repository.split("/");
    let owner = parts[0];
    let repo = parts[1];

    new github.provider.GithubProvider(owner: owner);

    let username = #"${{ secrets.DOCKER_USERNAME }}";
    let password = #"${{ secrets.DOCKER_PASSWORD }}";
    let githubSha = #"${{ github.sha }}";

    let env = Util.renderEnvVariables(spec.env);

    let steps = MutArray<Json> [
      {
        "name": "Checkout code",
        "uses": "actions/checkout@v4"
      },
      {
        "name": "Set up Node.js",
        "uses": "actions/setup-node@v3",
        "with": {
          "node-version": "20",
          "cache": "npm"
        }
      },
      {
        "name": "Install dependencies",
        "run": "npm ci",
        "working-directory": "{rootDirectory}"
      },
      {
        "name": "Build static website",
        "run": "{buildCommand}",
        "working-directory": "{rootDirectory}",
        "env": {
          "OUTPUT_DIR": "{outputDirectory}"
        }
      },
      {
        "name": "Validate build output",
        "run": "
          if [ ! -d \"{outputDirectory}\" ]; then
            echo \"Error: Build output directory does not exist\"
            exit 1
          fi
          
          if [ ! -f \"{outputDirectory}/index.html\" ]; then
            echo \"Error: index.html not found in build output\"
            exit 1
          fi
          
          echo \"Build validation successful\"
        "
      },
      {
        "name": "Configure AWS credentials",
        "uses": "aws-actions/configure-aws-credentials@v4", 
        "with": {
          "aws-access-key-id": #"${{ secrets.AWS_ACCESS_KEY_ID }}",
          "aws-secret-access-key": #"${{ secrets.AWS_SECRET_ACCESS_KEY }}",
          "aws-region": "{region}"
        }
      },
      {
        "name": "Upload to S3 with cache headers",
        "run": "
          # Upload HTML files with no caching
          aws s3 sync {outputDirectory} s3:\/\/{spec.bucketName} \\
            --exclude \"*\" \\
            --include \"*.html\" \\
            --cache-control \"no-cache,no-store,must-revalidate\" \\
            --delete

          # Upload assets with long-term caching
          aws s3 sync {outputDirectory} s3:\/\/{spec.bucketName} \\
            --exclude \"*.html\" \\
            --include \"*.js\" \\
            --include \"*.css\" \\
            --include \"*.png\" \\
            --include \"*.jpg\" \\
            --include \"*.jpeg\" \\
            --include \"*.gif\" \\
            --include \"*.svg\" \\
            --include \"*.woff\" \\
            --include \"*.woff2\" \\
            --cache-control \"public,max-age=31536000,immutable\" \\
            --delete

          # Upload remaining files with moderate caching
          aws s3 sync {outputDirectory} s3:\/\/{spec.bucketName} \\
            --exclude \"*.html\" \\
            --exclude \"*.js\" \\
            --exclude \"*.css\" \\
            --exclude \"*.png\" \\
            --exclude \"*.jpg\" \\
            --exclude \"*.jpeg\" \\
            --exclude \"*.gif\" \\
            --exclude \"*.svg\" \\
            --exclude \"*.woff\" \\
            --exclude \"*.woff2\" \\
            --cache-control \"public,max-age=3600\" \\
            --delete
        "
      },
      {
        "name": "Invalidate CloudFront cache",
        "run": "
          if [ -n {spec.cloudFrontDistributionId ?? ""} ]; then
            aws cloudfront create-invalidation \\
              --distribution-id {spec.cloudFrontDistributionId ?? ""} \\
              --paths \"/*\"
            echo \"CloudFront cache invalidation initiated\"
          else
            echo \"No CloudFront distribution ID provided, skipping cache invalidation\"
          fi
        "
      }
    ];

    let workflow = {
      "name": "AutoBuild",
      "on": {
        "push": {
          "branches": [ branch ]
        }
      },
      "jobs": {
        "release": {
          "runs-on": "ubuntu-latest",
          "env": Json env,
          "steps": steps.copy()
        }
      }
    };

    let tempdir = fs.mkdtemp();
    let workflowPath = "{tempdir}/autobuild.yml";

    fs.writeYaml(workflowPath, workflow);

    new github.repositoryFile.RepositoryFile(
      file: ".github/workflows/autobuild.yml",
      content: cdktf.Fn.file(workflowPath),
      repository: repo,
      overwriteOnCreate: true,
      commitMessage: "Update autobuild workflow",
      branch: branch,
    );
  }
}