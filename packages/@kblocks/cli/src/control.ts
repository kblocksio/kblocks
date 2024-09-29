import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-30";
import { PodEnvironment, setupPodEnvironment } from "./configmap";

export interface ControlProps extends PodEnvironment {
  image: string;
  kind: string
  namespace?: string;
}

export class Control extends Construct {
  constructor(scope: Construct, id: string, props: ControlProps) {
    super(scope, id);

    const kind = props.kind.toLocaleLowerCase();

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
        name: `kblocks-${kind}-control`,
        labels: {
          "app.kubernetes.io/name": `kblocks-${kind}-control`,
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

    setupPodEnvironment(controlDeployment, container, props);
  }
}
