import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-30";
import { setupPodEnvironment } from "./configmap";
import { DeploymentProps } from "./types";

export interface OperatorProps extends DeploymentProps {
  redisServiceName: string;
  workers: number;
}

export class Operator extends Construct {
  constructor(scope: Construct, id: string, props: OperatorProps) {
    super(scope, id);

    const name = props.names.substring(0, 63 - 17);
    const serviceAccount = new k8s.ServiceAccount(this, "ServiceAccount", {
      metadata: {
        namespace: props.namespace,
      }
    });
    
    const role = new k8s.ClusterRole(this, "ClusterRole", {
      rules: [
        // allow pod to apply any manifest to any namespace
        {
          verbs: ["*"],
          endpoints: [
            k8s.ApiResource.custom({
              apiGroup: "*",
              resourceType: "*",
            })
          ],
        }
      ],
    });
    
    const binding = new k8s.ClusterRoleBinding(this, "ClusterRoleBinding", { role });
    binding.addSubjects(serviceAccount);
    
    const operatorDeployment = new k8s.Deployment(this, "Deployment", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${name}-operator`,
        labels: {
          "app.kubernetes.io/name": `kblocks-${name}-operator`,
        }
      },
      serviceAccount: serviceAccount,
      replicas: 1,
      automountServiceAccountToken: true,
    });

   
    const container = operatorDeployment.addContainer({
      name: "operator",
      image: props.image,
      imagePullPolicy: k8s.ImagePullPolicy.ALWAYS,
      resources: {
        cpu: {
          request: k8s.Cpu.millis(1),
          limit: k8s.Cpu.units(1),
        },
      },
      securityContext: {
        readOnlyRootFilesystem: false,
        ensureNonRoot: false,
      },
      ports: [{ number: 3000 }],
    });

    setupPodEnvironment(operatorDeployment, container, props.pod);

    container.env.addVariable("WORKERS", k8s.EnvValue.fromValue(props.workers.toString()));

    // Add Redis sidecar container
    operatorDeployment.addContainer({
      name: "redis",
      image: "redis:6.2-alpine",
      imagePullPolicy: k8s.ImagePullPolicy.IF_NOT_PRESENT,
      resources: {
        cpu: {
          request: k8s.Cpu.millis(1),
          limit: k8s.Cpu.units(1),
        },
      },
      securityContext: {
        readOnlyRootFilesystem: false,
        ensureNonRoot: false,
      },
      ports: [{ number: 6379 }],
    });

    // Add Redis service
    new k8s.Service(this, 'RedisService', {
      metadata: {
        namespace: props.namespace,
        name: props.redisServiceName,
      },
      ports: [{ port: 6379, targetPort: 6379 }],
      selector: operatorDeployment,
    });
  }
}
