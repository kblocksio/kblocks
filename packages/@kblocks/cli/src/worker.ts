import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-30";
import * as cdk8s from "cdk8s";
import { createHashFromConfigMap } from "./configmap";

export interface WorkerProps {
  image: string;
  group: string;
  kind: string
  plural: string;
  namespace?: string;
  replicas: number;
  configMaps: Record<string, k8s.ConfigMap>;
  envSecrets?: Record<string, string>;
  envConfigMaps?: Record<string, string>;
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
    
    const controller = new k8s.StatefulSet(this, "WorkerStatefulSet", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-worker-${kind}`,
      },
      serviceAccount: serviceAccount,
      replicas: props.replicas,
      automountServiceAccountToken: true,
      service: new k8s.Service(this, "WorkerService", {
        metadata: {
          namespace: props.namespace,
          name: `kblocks-worker-${kind}`,
        },
        ports: [{ port: 3000 }],
      }),
    });
    
    const volumeMounts: {volume: k8s.Volume;path: string;}[] = [];
    for (const [key, value] of Object.entries(props.configMaps)) {
      const volume = k8s.Volume.fromConfigMap(this, `ConfigMapVolume-${key}`, value);
      controller.addVolume(volume);
      controller.metadata.addLabel(`configmap-hash-${key}`, createHashFromConfigMap(value));
      controller.podMetadata.addLabel(`configmap-hash-${key}`, createHashFromConfigMap(value));

      volumeMounts.push({
        volume,
        path: `/${key}`,
      });
    }

    const container = controller.addContainer({
      image: props.image,
      imagePullPolicy: k8s.ImagePullPolicy.ALWAYS,
      resources: {
        cpu: {
          request: k8s.Cpu.millis(100),
          limit: k8s.Cpu.units(1),
        },
      },
      securityContext: {
        readOnlyRootFilesystem: false,
        ensureNonRoot: false,
      },
      volumeMounts,
      portNumber: 3000,
    });

    for (const [key, value] of Object.entries(props.envSecrets ?? {})) {
      const secret = k8s.Secret.fromSecretName(this, `credentials-${key}-${value}`, value);
      container.env.addVariable(key, k8s.EnvValue.fromSecretValue({ secret, key }));
    }

    for (const [key, value] of Object.entries(props.envConfigMaps ?? {})) {
      const cm = k8s.ConfigMap.fromConfigMapName(this, `configmaps-${key}-${value}`, value);
      container.env.addVariable(key, k8s.EnvValue.fromConfigMap(cm, key));
    }

    for (const [key, value] of Object.entries(props.env ?? {})) {
      container.env.addVariable(key, k8s.EnvValue.fromValue(value));
    }

    container.env.addVariable("KBLOCK_OUTPUTS", k8s.EnvValue.fromValue((props.outputs ?? []).join(",")));
    container.env.addVariable("WORKER_INDEX",
      k8s.EnvValue.fromFieldRef(k8s.EnvFieldPaths.POD_LABEL, { key: "apps.kubernetes.io/pod-index" }));
  }
}