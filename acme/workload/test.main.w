bring "./workload.w" as w;

new w.Workload(
  image: "hashicorp/http-echo",
  route: "/echo",
  port: 5678,
  env: {
    ECHO_TEXT: "Hello, world"
  }
);