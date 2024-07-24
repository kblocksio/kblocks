bring "." as acme;

let x = acme.CronSpec.fromJson({
  "schedule": "*/5 * * * *",
  "image": "my-awesome-cron-image",
  "command": ["echo", "hello"],
  "hello": "hello",
  "asas": "asas"
});

new acme.Cron(x);