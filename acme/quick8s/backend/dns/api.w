pub interface IDns {
  inflight addARecord(name: str, publicDns: str): str;
  inflight removeARecord(name: str, publicDns: str): void;
}
