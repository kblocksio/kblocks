bring "cdk8s-plus-30" as k8s;
bring "constructs" as c;

pub struct ContainerSpec {
  /// The container image to use
  image: str;

  /// The port number the container listens on
  port: num?;

  /// The command to run in the container
  command: Array<str>?;

  /// The command to run to determine if the container is ready
  readiness: Array<str>?;

  /// Environment variables to set in the container
  env: Map<str>?;

  /// Environment variables to set in the container from a secret
  envSecrets: Map<EnvSecret>?;

  envFrom: Map<EnvFrom>?;
}

pub struct EnvFrom {
  /// Read the environment variable from a secret
  secret: EnvFromSecret?;

  /// Read the environment variable from a config map
  configMap: EnvFromConfigMap?;

  /// Whether the environment variable is optional
  optional: bool?;
}

pub struct EnvFromSecret {
  name: str;
  namespace: str?;
  key: str;
}

pub struct EnvFromConfigMap {
  name: str;
  key: str;
}

/// A rule that determines which API resources can this workload access, and which verbs can be used.
pub struct Rule {
  /// The API group (e.g. `acme.com`)
  apiGroup: str;

  /// The resource type (plural or singular). e.g. `buckets`
  resource: str;

  /// The allowed verbs (e.g. ["get", "watch", "list"])
  verbs: Array<str>;
}

pub struct EnvSecret {
  name: str;
  key: str;
}

pub struct PolicySpec {
  /// Determines which API resources can this workload access, and which verbs can be used.
  allow: Array<Rule>?;

  /// Adds cluster wide rules to the workload
  allowCluster: Array<Rule>?;
}

pub class Util {

  pub static newContainer(spec: ContainerSpec): k8s.ContainerProps {
    let envVariables = MutMap<k8s.EnvValue>{};

    for e in (spec.env ?? {}).entries() {
      envVariables.set(e.key, k8s.EnvValue.fromValue(e.value));
    }

    for e in (spec.envSecrets ?? {}).entries() {
      let scope = new c.Construct() as "secret-{e.key}-{e.value.name}-{e.value.name}";
      let secret = k8s.Secret.fromSecretName(scope, "Default", e.value.name);
      envVariables.set(e.key, k8s.EnvValue.fromSecretValue(k8s.SecretValue { secret, key: e.value.key }));
    }

    for e in (spec.envFrom ?? {}).entries() {
      let key = e.key;
      let value = e.value;

      if value.configMap != nil && value.secret != nil {
        throw "Cannot specify both `secret` and `configMap` in `envFrom` for variable {key}";
      }

      if let cm = value.configMap {
        let scope = new c.Construct() as "configmap-{key}-{cm.name}-{cm.key}";
        let configMap = k8s.ConfigMap.fromConfigMapName(scope, "Default", cm.name);
        envVariables.set(key, k8s.EnvValue.fromConfigMap(configMap, cm.key, optional: value.optional));
      } else if let s = value.secret {
        let scope = new c.Construct() as "secret-{key}-{s.name}-{s.key}";
        let secret = k8s.Secret.fromSecretName(scope, "Default", s.name);
        envVariables.set(key, k8s.EnvValue.fromSecretValue(k8s.SecretValue { secret, key: s.key }, optional: value.optional));
      } else {
        throw "One of `secret` or a `configMap` must be specified in `envFrom` for variable {key}";
      }
    }

    let container = k8s.ContainerProps {
      image: spec.image, 
      portNumber: spec.port, 
      command: spec.command,
      envVariables: envVariables.copy(),
      readiness: () => {
        if let readiness = spec.readiness {
          return k8s.Probe.fromCommand(readiness);
        } else {
          return nil;
        }
      }(),
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
    };

    return container;
  }

  pub static newServiceAccount(spec: PolicySpec): k8s.ServiceAccount {
    let sa = new k8s.ServiceAccount(automountToken: true);

    let rules = MutArray<k8s.RolePolicyRule>[];
    for rule in spec.allow ?? [] {
      rules.push({
        verbs: rule.verbs,
        resources: [k8s.ApiResource.custom(apiGroup: rule.apiGroup, resourceType: rule.resource)],
      });
    }

    let role = new k8s.Role(rules: rules.copy());

    let roleBinding = new k8s.RoleBinding(role: role);
    roleBinding.addSubjects(sa);

    if let clusterRules = spec.allowCluster {
      let rules = MutArray<k8s.ClusterRolePolicyRule>[];
      
      for r in clusterRules {
        rules.push({
          verbs: r.verbs,
          endpoints: [k8s.ApiResource.custom(apiGroup: r.apiGroup, resourceType: r.resource)]
        });
      }

      let clusterRole = new k8s.ClusterRole(rules: rules.copy());
      let clusterRoleBinding = new k8s.ClusterRoleBinding(role: clusterRole);
      clusterRoleBinding.addSubjects(sa);
    }
    
    return sa;
  }
}