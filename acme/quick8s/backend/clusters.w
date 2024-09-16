bring cloud;
bring "./types.w" as t;

pub class Clusters {
  store: cloud.Bucket;

  new() {
    this.store = new cloud.Bucket();
  }

  pub inflight put(user: str, cluster: t.Cluster) {
    let key = this.keyFor(user, cluster.name);

    // TODO: yakk!
    this.store.putJson(key, unsafeCast(cluster));
  }

  pub inflight list(user: str): Array<t.Cluster> {
    let keys = this.store.list("{user}/");
    let result = MutArray<t.Cluster>[];
    for key in keys {
      let json = this.store.getJson(key);
      result.push(t.Cluster.fromJson(json));
    }

    return result.copy();
  }

  pub inflight delete(user: str, name: str): bool {
    let key = this.keyFor(user, name);
    return this.store.tryDelete(key);
  }

  pub inflight tryGet(user: str, name: str): t.Cluster? {
    let key = this.keyFor(user, name);
    if let json = this.store.tryGetJson(key) {
      return t.Cluster.fromJson(json);
    } else {
      return nil;
    }
  }

  inflight keyFor(user: str, key: str): str {
    return "{user}/{key}";
  }
}