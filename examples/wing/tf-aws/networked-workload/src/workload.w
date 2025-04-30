bring "cdk8s-plus-30" as k8s;
bring "cdk8s" as cdk8s;
bring "./shared.w" as api;

pub struct NetworkedWorkloadSpec extends api.ContainerSpec, api.PolicySpec {
  /// Make this workload publicly accessible
  ingress: Ingress?;

  /// Scaling configuration
  scaling: ScalingSpec?;
}

pub struct ScalingSpec {
  /// Autoscaling configuration
  autoscaling: AutoscalingSpec?;

  /// The number of replicas to create for this container. Can only be specified if autoscaling is not specified.
  replicas: num?;
}

pub struct AutoscalingSpec {
  /// Minimum number of replicas @order 1
  minReplicas: num?;
  
  /// Maximum number of replicas @order 2
  maxReplicas: num?;
  
  /// Target CPU utilization percentage @order 3
  targetCpuUtilization: num?;
  
  /// Target memory utilization percentage @order 4
  targetMemoryUtilization: num?;
}

pub struct Ingress {
  /// Ingress path for this workload. @order 1
  path: str;

  /// Hostname to use for this endpoint @order 2
  host: str?;

  /// Rewrite host header on backend @order 3
  rewrite: str?;

  /// TLS certificate to use for this endpoint @order 4
  tls: Certificate?;
}

pub struct Certificate {
  /// Secret name containing the TLS certificate and key to use for this workload
  /// 
  /// To install, use:
  /// ```
  /// kubectl create secret tls my-tls-secret \
  ///   --cert=/path/to/tls.crt \
  ///   --key=/path/to/tls.key
  /// ```
  ///
  /// Then specify the secret name here.
  /// @order 1
  secret: str;

  /// Hostnames to use for this certificate @order 2  
  hosts: Array<str>;
}

pub class NetworkedWorkload {
  pub internalHost: str?;
  pub externalHost: str?;
  pub port: str?;

  new(spec: NetworkedWorkloadSpec) {

    let d = new k8s.Deployment(
      replicas: spec?.scaling?.replicas,
      automountServiceAccountToken: true,
      serviceAccount: api.newServiceAccount(spec),
    );

    let c = d.addContainer(api.newContainer(spec));

    let var route = spec.ingress?.path;

    if let port = spec.port {
      let service = d.exposeViaService(ports: [{ port }]);
      this.internalHost = service.name;
      this.port = "{service.port}";
      
      let rewrite = spec.ingress?.rewrite;

      if let route = route {
        let tlsConfig = MutArray<k8s.IngressTls>[];

        if let certificate = spec.ingress?.tls {
          tlsConfig.push({ 
            secret: k8s.Secret.fromSecretName(this, "tls-secret", certificate.secret),
            hosts: certificate.hosts
          });
        }

        let ingress = new k8s.Ingress(
          tls: tlsConfig.copy(),
        );

        if let host = spec.ingress?.host {
          ingress.addHostRule(host, route, k8s.IngressBackend.fromService(service), k8s.HttpIngressPathType.PREFIX);
          this.externalHost = host;
        } else {
          ingress.addRule(route, k8s.IngressBackend.fromService(service), k8s.HttpIngressPathType.PREFIX);
        }

        if let rewrite = rewrite {
          ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/rewrite-target", rewrite);
        }

        // allow large request headers
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/proxy-buffer-size", "128k");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/proxy-buffers-number", "4");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/proxy-busy-buffers-size", "256k");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/large-client-header-buffers", "4 32k");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/proxy-read-timeout", "36000");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/proxy-send-timeout", "36000");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/proxy-connect-timeout", "36000");
        ingress.metadata.addAnnotation("nginx.ingress.kubernetes.io/enable-websocket", "true");
      }
    } else {
      if route != nil {
        throw "Cannot specify 'path' without 'port'";
      }
    }

    if let autoscaling = spec.scaling?.autoscaling {
      let metrics = MutArray<k8s.Metric>[];

      if let cpu = autoscaling.targetCpuUtilization {
        metrics.push(k8s.Metric.resourceCpu(k8s.MetricTarget.averageUtilization(cpu)));
      }

      if let memory = autoscaling.targetMemoryUtilization {
        metrics.push(k8s.Metric.resourceMemory(k8s.MetricTarget.averageUtilization(memory)));
      }

      // Create HPA
      let hpa = new k8s.HorizontalPodAutoscaler(
        target: d,
        minReplicas: autoscaling.minReplicas ?? 1,
        maxReplicas: autoscaling.maxReplicas ?? 10,
        metrics: metrics.copy() // copy to make it immutable for signature
      );
    }
  }
}
