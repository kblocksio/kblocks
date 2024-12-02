import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-30";
import { setupPodEnvironment } from "./configmap";
import { DeploymentProps } from "./types";

export interface ControlProps extends DeploymentProps {
  workers: number;
}

export class Control extends Construct {
  constructor(scope: Construct, id: string, props: ControlProps) {
    super(scope, id);

    const name = props.names.substring(0, 63 - 16);
    const serviceAccount = new k8s.ServiceAccount(this, "ServiceAccount", {
      metadata: {
        namespace: props.namespace,
      }
    });
    
    const role = new k8s.ClusterRole(this, "ClusterRole", {
      rules: [
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
    
    const controlDeployment = new k8s.Deployment(this, "Deployment", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${name}-control`,
        labels: {
          "app.kubernetes.io/name": `kblocks-${name}-control`,
        }
      },
      serviceAccount: serviceAccount,
      replicas: 1,
      automountServiceAccountToken: true,
    });
    
    const container = controlDeployment.addContainer({
      name: "control",
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

    setupPodEnvironment(controlDeployment, container, props.pod);

    container.env.addVariable("WORKERS", k8s.EnvValue.fromValue(props.workers.toString()));

    const job = new k8s.Job(this, "Cleanup", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${name}-cleanup`,
        labels: {
          "app.kubernetes.io/name": `kblocks-${name}-cleanup`,
        },
        annotations: {
          "helm.sh/hook": "pre-delete",
          "helm.sh/hook-weight": "0",
        }
      },
    });
    const cleanupContainer = job.addContainer({
      name: "cleanup",
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
    });
    setupPodEnvironment(job, cleanupContainer, props.pod);
    cleanupContainer.env.addVariable("WORKERS", k8s.EnvValue.fromValue(props.workers.toString()));
    cleanupContainer.env.addVariable("CLEANUP", k8s.EnvValue.fromValue("true"));
  }
}
