bring k8s;

pub struct CronSpec {
  schedule: str;
  image: str;
  command: Array<str>?;
}

pub class Cron {
  new(spec: CronSpec) {
    new k8s.ApiObject(
      apiVersion: "batch/v1",
      kind: "CronJob",
      spec: {
        schedule: spec.schedule,
        jobTemplate: {
          spec: {
            template: {
              spec: {
                restartPolicy: "OnFailure",
                containers: [
                  {
                    name: "main",
                    image: spec.image,
                    imagePullPolicy: "IfNotPresent",
                    command: spec.command,
                  }
                ]
              }
            }
          }
        }
      }
    );
  }
}