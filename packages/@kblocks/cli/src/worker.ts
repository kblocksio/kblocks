import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-30";
import { PodEnvironment, setupPodEnvironment } from "./configmap";

export interface WorkerProps extends PodEnvironment {
  image: string;
  group: string;
  kind: string
  plural: string;
  namespace?: string;
  replicas: number;
  env?: Record<string, string>;
  outputs?: string[];
}

export class Worker extends Construct {
  constructor(scope: Construct, id: string, props: WorkerProps) {
    super(scope, id);

    const kind = props.kind.toLocaleLowerCase();

    const serviceAccount = new k8s.ServiceAccount(this, "WorkerServiceAccount", {
      metadata: {
        namespace: props.namespace,
      }
    });
    
    const role = new k8s.ClusterRole(this, "WorkerClusterRole", {
      rules: [
        {
          verbs: ["get", "watch", "list"],
          endpoints: [
            k8s.ApiResource.custom({
              apiGroup: props.group,
              resourceType: props.plural,
            })
          ],
        },

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
    
    const binding = new k8s.ClusterRoleBinding(this, "WorkerClusterRoleBinding", { role });
    binding.addSubjects(serviceAccount);
    
    const workerDeployment = new k8s.StatefulSet(this, "WorkerStatefulSet", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${kind}-worker`,
      },
      serviceAccount: serviceAccount,
      replicas: props.replicas,
      automountServiceAccountToken: true,
      service: new k8s.Service(this, "WorkerService", {
        metadata: {
          namespace: props.namespace,
          name: `kblocks-${kind}-worker`,
        },
        ports: [{ port: 3000 }],
      }),
    });
    
    const container = workerDeployment.addContainer({
      name: "worker",
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
      portNumber: 3000,
    });

    setupPodEnvironment(workerDeployment, container, props);

    container.env.addVariable("RELEASE_NAME", k8s.EnvValue.fromValue("{{ .Release.Name }}"));
    container.env.addVariable("KBLOCK_OUTPUTS", k8s.EnvValue.fromValue((props.outputs ?? []).join(",")));
    container.env.addVariable("WORKER_INDEX",
      k8s.EnvValue.fromFieldRef(k8s.EnvFieldPaths.POD_LABEL, { key: "apps.kubernetes.io/pod-index" }));
  }

}