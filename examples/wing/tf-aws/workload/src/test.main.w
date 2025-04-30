bring "./workload.w" as w;

new w.Workload(
  image: "hashicorp/http-echo",
  port: 5678,
  expose: [
    {
      path: "/",
      host: "example.com",
      tls: {
        secret: "tls-secret",
        hosts: ["example.com"]
      }
    },
    {
      path: "/api",
      host: "example.com",
      tls: {
        secret: "tls-secret",
        hosts: ["example.com"]
      }
    }
  ],
  env: {
    JUST_VALUE: {
      value: "Hello, world"
    },
    FROM_SECRET: {
      fromSecret: {
        secretName: "my-secret",
        key: "my-key"
      }
    },
    FROM_CONFIG_MAP: {
      fromConfigMap: {
        configMapName: "my-config-map",
        key: "my-key"
      }
    }
  },
  envFrom: [
    { configMapName: "my-config-map", configMapPrefix: "CONFIG_MAP_" },
    { secretName: "my-secret" }
  ]
) as "my-workload";
