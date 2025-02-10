bring "./workload.w" as w;

new w.NetworkedWorkload(
  image: "hashicorp/http-echo",
  port: 5678,
  ingress: {
    path: "/echo"
  },
  scaling: {
    autoscaling: {
      maxReplicas: 4,
      targetCpuUtilization: 70,
      targetMemoryUtilization: 70
    }
  },
);
