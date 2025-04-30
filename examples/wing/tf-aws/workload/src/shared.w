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

  /// Individual environment variables to set in the container
  env: Map<EnvVariable>?;

  /// Environment variables to read as a set from a secret or config map
  envFrom: Array<EnvFrom>?;
}

pub struct EnvVariable {
  value: str?;

  /// Read the environment variable from a secret
  fromSecret: ValueFromSecret?;

  /// Read the environment variable from a config map
  fromConfigMap: ValueFromConfigMap?;

  /// Whether the environment variable is optional
  optional: bool?;
}

pub struct EnvFrom {
  /// Read the environment variables from a secret
  secretName: str?;

  /// Read the environment variables from a config map
  configMapName: str?;

  /// Prefix to add to the environment variable name
  configMapPrefix: str?;

  /// Whether the environment variable is optional
  optional: bool?;
}

pub struct ValueFromSecret {
  secretName: str;
  key: str;
}

pub struct ValueFromConfigMap {
  configMapName: str;
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
  static renderEnvVariables(env: Map<EnvVariable>?): Map<k8s.EnvValue> {
    let result = MutMap<k8s.EnvValue>{};

    for e in env?.entries() ?? [] {

      let name = e.key;
      let val = e.value;

      if let value = val.value {
        if val.fromSecret != nil || val.fromConfigMap != nil {
          throw "Cannot specify both `value` and `fromSecret` or `fromConfigMap` in `env` for variable {name}";
        }

        if val.optional == true {
          throw "Cannot specify `optional: true` in `env` for variable {name} because it is a raw value";
        }

        result.set(name, k8s.EnvValue.fromValue(value));
        continue;
      }

      if let secret = val.fromSecret {
        if val.fromConfigMap != nil {
          throw "Cannot specify both `fromSecret` and `fromConfigMap` in `env` for variable {name}";
        }

        let scope = new c.Construct() as "secret-{name}-{secret.key}";
        let s = k8s.Secret.fromSecretName(scope, "Default", secret.secretName);
        result.set(name, k8s.EnvValue.fromSecretValue(k8s.SecretValue { secret: s, key: secret.key }, optional: val.optional));
        continue;
      }

      if let configMap = val.fromConfigMap {
        let scope = new c.Construct() as "configmap-{name}-{configMap.key}";
        let cm = k8s.ConfigMap.fromConfigMapName(scope, "Default", configMap.configMapName);
        result.set(name, k8s.EnvValue.fromConfigMap(cm, configMap.key, optional: val.optional));
        continue;
      }

      throw "One of `value`, `fromSecret` or `fromConfigMap` must be specified for variable {name}";
    }

    return result.copy();
  }

  static renderEnvFrom(envFrom: Array<EnvFrom>?): Array<k8s.EnvFrom> {
    let result = MutArray<k8s.EnvFrom>[];

    for value in envFrom ?? [] {
      if value.configMapName != nil && value.secretName != nil {
        throw "Cannot specify both `secret` and `configMap` in `envFrom`";
      }

      if let cm = value.configMapName {
        let scope = new c.Construct() as "configmap-{cm}";
        let configMap = k8s.ConfigMap.fromConfigMapName(scope, "Default", cm);
        result.push(k8s.Env.fromConfigMap(configMap, value.configMapPrefix));
        continue;
      }

      if let s = value.secretName {
        let scope = new c.Construct() as "secret-{s}";
        let secret = k8s.Secret.fromSecretName(scope, "Default", s);
        result.push(k8s.Env.fromSecret(secret));
        continue;
      }

      throw "One of `secret` or a `configMap` must be specified in `envFrom`";
    }

    return result.copy();
  }

  pub static newContainer(spec: ContainerSpec): k8s.ContainerProps {

    let container = k8s.ContainerProps {
      image: spec.image, 
      portNumber: spec.port, 
      command: spec.command,
      envVariables: Util.renderEnvVariables(spec.env),
      envFrom: Util.renderEnvFrom(spec.envFrom),
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