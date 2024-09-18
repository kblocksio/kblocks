bring "./sim.w" as sim;
bring "./route53.w" as r53;
bring cloud;

let dns = new sim.DnsSimulation();

// let dns = new r53.Route53(
//   hostedZoneId: "Z0610680182K8KUPK23FC",
//   domainName: "quick8s.sh",
// );

test "create a record" {
  dns.addARecord("bing", "1.2.3.4");
}

test "remove a record" {
  dns.removeARecord("q8s-bswsl7axroen7lr1ogduu", "13.40.4.21");
}