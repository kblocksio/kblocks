import { Construct } from "constructs";
import * as k8s from "cdk8s-plus-30";

export interface OperatorProps {
  image: string;
  group: string;
  kind: string
  plural: string;
  namespace?: string;
  configMaps: Record<string, k8s.ConfigMap>;
  envSecrets?: Record<string, string>;
  envConfigMaps?: Record<string, string>;
  env?: Record<string, string>;
  outputs?: string[];
}

export class Operator extends Construct {
  constructor(scope: Construct, id: string, props: OperatorProps) {
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
    
    const binding = new k8s.ClusterRoleBinding(this, "ClusterRoleBinding", { role });
    binding.addSubjects(serviceAccount);
    
    const controller = new k8s.Deployment(this, "Deployment", {
      metadata: {
        namespace: props.namespace,
        name: `kblocks-${kind}`,
      },
      serviceAccount: serviceAccount,
      replicas: 1,
      automountServiceAccountToken: true,
    });
    
    const volumeMounts: {volume: k8s.Volume;path: string;}[] = [];
    for (const [key, value] of Object.entries(props.configMaps)) {
      const volume = k8s.Volume.fromConfigMap(this, `ConfigMapVolume-${key}`, value);
      controller.addVolume(volume);

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
  }
}