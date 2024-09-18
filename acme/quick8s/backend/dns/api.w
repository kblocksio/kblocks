pub interface IDns {
  inflight addARecord(name: str, ip: str): void;
  inflight removeARecord(name: str, ip: str): void;
}
