bring "./sim.w" as sim;
bring cloud;

let dns = new sim.DnsSimulation();

test "create a record" {
  dns.addARecord("bing", "1.2.3.4");
}

test "remove a record" {
  dns.removeARecord("bing", "1.2.3.4");
}