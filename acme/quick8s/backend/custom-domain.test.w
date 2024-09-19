bring cloud;
bring "./custom-domain.w" as c;

let api = new cloud.Api();
api.get("/", inflight () => {
  return { body: "hello" };
});

new c.CustomDomain(
  api: api,
  cname: "api",
  zoneName: "quick8s.sh",
  certificateArn: "arn:aws:acm:us-east-1:248020555503:certificate/cfddf2f5-0245-49e6-8676-1e1fa3d1a1d4",
  dnsimpleAccountId: "137210",
);
