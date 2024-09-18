pub interface IDns {
  inflight addARecord(name: str, ip: str): str;
  inflight removeARecord(name: str, ip: str): void;
}
