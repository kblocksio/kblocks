bring "./api.w" as api;

pub class DnsSimulation impl api.IDns {
  pub inflight addARecord(name: str, ip: str): str {
    log("Skipping DNS record creation in sim: {name} => {ip}");
    return "{name}.dummy.com";
  }

  pub inflight removeARecord(name: str, ip: str) {
    log("Removing A record: {name} => {ip}");
  }
}
