bring "./dnsimple.w" as dnsimple;
bring cloud;

let d = new dnsimple.Dnsimple({
  token: new cloud.Secret(name: "DNSIMPLE_TOKEN"),
  accountId: "137210",
  domain: "quick8s.sh"
});

test "add and remove a record" {
  d.addARecord("bing", "1.2.3.4");
  d.removeARecord("bing", "1.2.3.4");
}

